// Feature: blueline-core-flow, Property 15: Recovery decision
// Feature: blueline-core-flow, Property 14: No URL reaches storage
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { recover } from '../../src/core/recover';
import { scheduledEnd } from '../../src/core/session-end';
import { LABELS, serializeActive, serializeHistory } from '../../src/core/record';
import { appendRecord } from '../../src/core/history';
import { DURATIONS } from '../../src/core/config';
import type { Event } from '../../src/core/session';
import { BASE, MEMO, PURPOSE, effectsOf, replay } from './session-arb';
import { planned, purpose, timestamp } from './arbitraries';

describe('Property 15: Recovery decision', () => {
  const offset = fc.integer({ min: -600_000, max: 3_000_000 });
  // A v2 active state (with a Purpose, and a Message or none) or a v1 one (neither).
  const stored = fc.oneof(
    fc.tuple(purpose, fc.option(fc.constantFrom('다 봤으면 끄자', 'note'), { nil: null }))
      .map(([p, m]) => ({ v: 2, purpose: p as string | null, memo: m as string | null })),
    fc.constant({ v: 1, purpose: null, memo: null }),
  );

  it('valid active sessions recover, expire, or are cleared by start time', () => {
    fc.assert(
      fc.property(timestamp, offset, planned, fc.constantFrom(...LABELS), stored, (now, off, plannedSec, label, kind) => {
        const start = now - off;
        const text = kind.v === 2
          ? serializeActive({ start, plannedSec, label, purpose: kind.purpose, memo: kind.memo })
          : JSON.stringify({ v: 1, start, plannedSec, label });
        const { state, effects } = recover(text, now);
        expect(effects.some((e) => e.type === 'openDestination')).toBe(false);
        if (start > now) {
          expect(state.phase).toBe('IDLE');
          expect(effects).toEqual([{ type: 'clearActive' }]);
        } else if (now < start + plannedSec * 1000) {
          expect(state.phase).toBe('CONNECTED');
          // The stored Purpose and Message come back; a v1 state has neither (Req 9.2, 9.4).
          expect(state.session).toMatchObject({ start, plannedSec, label, purpose: kind.purpose, memo: kind.memo });
          expect(effects).toEqual([]);
        } else {
          expect(state.phase).toBe('ENDED');
          const ends = effects.filter((e) => e.type === 'endSession');
          expect(ends).toHaveLength(1);
          const rec = ends[0]?.type === 'endSession' ? ends[0].record : null;
          expect(rec).toMatchObject({
            reason: 'TIME UP', end: start + plannedSec * 1000, actualSec: plannedSec,
            purpose: kind.purpose, outcome: 'NO ANSWER',
          });
          expect(effects.some((e) => e.type === 'notifyTimeUp')).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('unreadable stored text goes to IDLE, clears it, and writes no record', () => {
    const v2 = (extra: string) => `{"v":2,"start":1,"plannedSec":60,"label":"CUSTOM"${extra}}`;
    const bad = fc.oneof(
      fc.string(),
      fc.constantFrom('{}', 'null', '{"v":1,"start":1,"plannedSec":61,"label":"YOUTUBE"}',
        '{"v":1,"start":1,"plannedSec":60,"label":"TIKTOK"}', v2(''), v2(',"purpose":"x"'),
        v2(',"purpose":null,"memo":null'), v2(',"purpose":"","memo":null'), v2(',"purpose":" x","memo":null'),
        v2(`,"purpose":"${'가'.repeat(61)}","memo":null`), v2(',"purpose":"x","memo":""'),
        v2(`,"purpose":"x","memo":"${'가'.repeat(121)}"`), v2(',"purpose":"x","memo":"note "'),
        '{"v":3,"start":1,"plannedSec":60,"label":"CUSTOM","purpose":"x","memo":null}',
        '{"v":1,"plannedSec":60,"label":"CUSTOM"}'),
    );
    fc.assert(
      fc.property(bad, timestamp, (text, now) => {
        const { state, effects } = recover(text, now);
        expect(state.phase).toBe('IDLE');
        expect(effects).toEqual([{ type: 'clearActive' }]);
      }),
      { numRuns: 300 },
    );
  });

  it('nothing stored goes to IDLE with no effects', () => {
    expect(recover(null, BASE)).toMatchObject({ state: { phase: 'IDLE' }, effects: [] });
  });
});

describe('Property 14: No URL reaches storage', () => {
  const word = fc.stringMatching(/^[a-z]{6,12}$/);
  const url = fc.tuple(word, word, fc.stringMatching(/^[a-z0-9]{0,10}$/)).map(([a, b, p]) => `${a}.${b}.com/${p}`);

  it('saveActive and endSession payloads and their stored text never contain the custom URL', () => {
    fc.assert(
      fc.property(url, fc.integer({ min: 1, max: DURATIONS.length }), fc.integer({ min: 0, max: 3_000_000 }), fc.boolean(),
        (input, key, after, hang) => {
          const events: Event[] = [
            { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 3 },
            { type: 'URL_SUBMIT', text: input }, { type: 'PURPOSE_SUBMIT', text: PURPOSE },
            { type: 'MEMO_SUBMIT', text: MEMO }, { type: 'MENU_KEY', n: key }, { type: 'CONFIRM' },
            { type: 'OPENED', now: BASE }, hang ? { type: 'HANG_UP', now: BASE + after } : { type: 'TICK', now: BASE + 4_000_000 },
          ];
          const effects = effectsOf(replay(events));
          // The path must really start and end a Session, or the checks below say nothing.
          expect(effects.some((e) => e.type === 'saveActive')).toBe(true);
          expect(effects.some((e) => e.type === 'endSession')).toBe(true);
          const opened = effects.find((e) => e.type === 'openDestination');
          expect(opened).toEqual({ type: 'openDestination', url: `https://${input}` });
          const host = input.split('/')[0] as string;
          for (const e of effects) {
            if (e.type === 'saveActive') {
              expect(JSON.stringify(e)).not.toContain(host);
              expect(serializeActive(e.active)).not.toContain(host);
            }
            if (e.type === 'endSession') {
              expect(JSON.stringify(e)).not.toContain(host);
              expect(serializeHistory(appendRecord([], e.record))).not.toContain(host);
              expect(e.record.end).toBeLessThanOrEqual(scheduledEnd({
                id: 1, start: BASE, plannedSec: e.record.plannedSec, label: 'CUSTOM', purpose: null, memo: null,
              }));
            }
          }
        }),
      { numRuns: 300 },
    );
  });
});
