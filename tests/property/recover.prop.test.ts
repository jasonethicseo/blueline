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
import { BASE, effectsOf, replay } from './session-arb';
import { planned, timestamp } from './arbitraries';

describe('Property 15: Recovery decision', () => {
  const offset = fc.integer({ min: -600_000, max: 3_000_000 });

  it('valid active sessions recover, expire, or are cleared by start time', () => {
    fc.assert(
      fc.property(timestamp, offset, planned, fc.constantFrom(...LABELS), (now, off, plannedSec, label) => {
        const start = now - off;
        const { state, effects } = recover(serializeActive({ start, plannedSec, label }), now);
        expect(effects.some((e) => e.type === 'openDestination')).toBe(false);
        if (start > now) {
          expect(state.phase).toBe('IDLE');
          expect(effects).toEqual([{ type: 'clearActive' }]);
        } else if (now < start + plannedSec * 1000) {
          expect(state.phase).toBe('CONNECTED');
          expect(state.session).toMatchObject({ start, plannedSec, label });
          expect(effects).toEqual([]);
        } else {
          expect(state.phase).toBe('ENDED');
          const ends = effects.filter((e) => e.type === 'endSession');
          expect(ends).toHaveLength(1);
          const rec = ends[0]?.type === 'endSession' ? ends[0].record : null;
          expect(rec).toMatchObject({ reason: 'TIME UP', end: start + plannedSec * 1000, actualSec: plannedSec });
          expect(effects.some((e) => e.type === 'notifyTimeUp')).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('unreadable stored text goes to IDLE, clears it, and writes no record', () => {
    const bad = fc.oneof(
      fc.string(),
      fc.constantFrom('{}', 'null', '{"v":1,"start":1,"plannedSec":61,"label":"YOUTUBE"}',
        '{"v":1,"start":1,"plannedSec":60,"label":"TIKTOK"}', '{"v":2,"start":1,"plannedSec":60,"label":"CUSTOM"}',
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
            { type: 'URL_SUBMIT', text: input }, { type: 'MENU_KEY', n: key }, { type: 'CONFIRM' },
            { type: 'OPENED', now: BASE }, hang ? { type: 'HANG_UP', now: BASE + after } : { type: 'TICK', now: BASE + 4_000_000 },
          ];
          const effects = effectsOf(replay(events));
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
              expect(e.record.end).toBeLessThanOrEqual(scheduledEnd({ id: 1, start: BASE, plannedSec: e.record.plannedSec, label: 'CUSTOM' }));
            }
          }
        }),
      { numRuns: 300 },
    );
  });
});
