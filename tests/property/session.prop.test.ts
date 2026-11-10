// Feature: blueline-core-flow, Property 7: Only listed transitions happen (replaced by purpose-board Property 16)
// Feature: blueline-core-flow, Property 8: Ended is final
// Feature: blueline-core-flow, Property 9: A session ends exactly once
// Feature: blueline-core-flow, Property 10: End record values
// Feature: blueline-core-flow, Property 16: Connect step starts once
// Feature: blueline-purpose-board, Property 16: Only listed transitions happen
// (Core Property 17 and purpose-board Property 15 are in permission.prop.test.ts.)
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Event, Phase, Session } from '../../src/core/session';
import { endRecord, scheduledEnd } from '../../src/core/session-end';
import { fee } from '../../src/core/fee';
import { elapsedSeconds } from '../../src/core/time';
import { LABELS } from '../../src/core/record';
import {
  BASE, MEMO, PURPOSE, anyEvent, effectsOf, finalState, replay, script, tail, time, toConnected, toEnded,
} from './session-arb';
import { planned, purpose, timestamp } from './arbitraries';

// Requirement 10 criterion 2.
const ALLOWED = new Set<string>([
  'IDLE>DIALING', 'DIALING>SELECT_DEST', 'SELECT_DEST>SET_PURPOSE', 'SET_PURPOSE>SELECT_DEST',
  'SET_PURPOSE>SELECT_DURATION', 'SELECT_DURATION>SET_PURPOSE', 'SELECT_DURATION>CONNECTED',
  'CONNECTED>ENDED', 'ENDED>IDLE',
]);
const edge = (a: Phase, b: Phase) => `${a}>${b}`;

describe('Property 16: Only listed transitions happen', () => {
  it('every step keeps the phase or follows a listed transition', () => {
    const seen = new Set<string>();
    fc.assert(
      fc.property(script, (events) => {
        for (const s of replay(events)) {
          if (s.before.phase === s.after.phase) continue;
          const e = edge(s.before.phase, s.after.phase);
          expect(ALLOWED).toContain(e);
          seen.add(e);
        }
      }),
      { numRuns: 500 },
    );
    // The generators must reach every listed transition, or the property says little.
    expect([...ALLOWED].filter((e) => !seen.has(e))).toEqual([]);
  });
});

describe('Property 8: Ended is final', () => {
  // Dial again and reconnect, with random events mixed in between the steps.
  const reconnect: Event[] = [
    { type: 'ANSWER', yes: false }, { type: 'DIAL_AGAIN' }, { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' },
    { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 1 }, { type: 'PURPOSE_SUBMIT', text: PURPOSE },
    { type: 'MEMO_SUBMIT', text: '' }, { type: 'MENU_KEY', n: 1 }, { type: 'CONFIRM' },
  ];
  const mixed = fc
    .tuple(fc.array(fc.array(anyEvent, { maxLength: 2 }), { minLength: reconnect.length, maxLength: reconnect.length }), time)
    .map(([noise, now]) => [...reconnect.flatMap((e, i) => [...(noise[i] ?? []), e]), { type: 'OPENED', now } as Event]);
  const after = fc.oneof(tail(60), mixed);

  it('after ENDED, any CONNECTED state is a new session with a larger id', () => {
    let reconnected = 0;
    fc.assert(
      fc.property(after, (t) => {
        const endedState = finalState(toEnded);
        const endedId = endedState.session?.id ?? -1;
        expect(endedState.phase).toBe('ENDED');
        for (const s of replay(t, endedState)) {
          if (s.after.phase === 'CONNECTED') {
            reconnected += 1;
            expect(s.after.session?.id).toBeGreaterThan(endedId);
          }
        }
      }),
      { numRuns: 500 },
    );
    // The generator must actually reach a second session, or the property says nothing.
    expect(reconnected).toBeGreaterThan(0);
  });

  it('dialing again starts a new session with its own id and start time', () => {
    const steps = replay([...reconnect, { type: 'OPENED', now: BASE + 99_000 }], finalState(toEnded));
    const last = steps[steps.length - 1]?.after;
    expect(last?.phase).toBe('CONNECTED');
    expect(last?.session).toMatchObject({ id: 2, start: BASE + 99_000 });
  });
});

describe('Property 9: A session ends exactly once', () => {
  const endEvent = fc.oneof(
    time.map((now): Event => ({ type: 'TICK', now })),
    time.map((now): Event => ({ type: 'HANG_UP', now })),
    fc.constant<Event>({ type: 'NOCARRIER_DONE' }),
  );

  it('one endSession, one NO CARRIER sound, reason from the first ending event', () => {
    fc.assert(
      fc.property(fc.array(endEvent, { maxLength: 30 }), time, (events, last) => {
        const start = finalState(toConnected);
        const session = start.session as Session;
        const all: Event[] = [...events, { type: 'HANG_UP', now: last }];
        const effects = effectsOf(replay(all, start));
        const ends = effects.filter((e) => e.type === 'endSession');
        expect(ends).toHaveLength(1);
        expect(effects.filter((e) => e.type === 'playNoCarrier')).toHaveLength(1);

        const first = all.find((e) => e.type === 'HANG_UP' || (e.type === 'TICK' && e.now >= scheduledEnd(session)));
        const expected = first?.type === 'HANG_UP' && first.now < scheduledEnd(session) ? 'HANG UP' : 'TIME UP';
        const end = ends[0];
        expect(end?.type === 'endSession' && end.record.reason).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });
});

describe('Property 10: End record values', () => {
  const session = fc.tuple(timestamp, planned, fc.constantFrom(...LABELS), fc.option(purpose, { nil: null }))
    .map(([start, plannedSec, label, p]): Session => ({ id: 1, start, plannedSec, label, purpose: p, memo: null }));

  it('TIME UP uses the scheduled end; HANG UP uses floor(elapsed) and keeps end ≥ start', () => {
    fc.assert(
      fc.property(session, fc.integer({ min: -100_000, max: 4_000_000 }), (s, d) => {
        const now = s.start + d;
        const t = endRecord(s, 'TIME UP', now);
        expect(t).toMatchObject({ end: scheduledEnd(s), actualSec: s.plannedSec, fee: fee(s.plannedSec) });
        const h = endRecord(s, 'HANG UP', now);
        expect(h.actualSec).toBe(elapsedSeconds(s.start, now, s.plannedSec));
        expect(h.fee).toBe(fee(h.actualSec));
        expect(h.end).toBeGreaterThanOrEqual(h.start);
        // The record carries the Session's Purpose and starts as NO ANSWER (Req 5.5).
        for (const r of [t, h]) expect(r).toMatchObject({ purpose: s.purpose, outcome: 'NO ANSWER' });
      }),
      { numRuns: 500 },
    );
  });

  it('a HANG_UP at or after the scheduled end yields a TIME UP record', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (late) => {
        const start = finalState(toConnected);
        const now = scheduledEnd(start.session as Session) + late;
        const end = effectsOf(replay([{ type: 'HANG_UP', now }], start)).find((e) => e.type === 'endSession');
        expect(end?.type === 'endSession' && end.record.reason).toBe('TIME UP');
      }),
    );
  });
});

describe('Property 16: Connect step starts once', () => {
  const connectEvent = fc.oneof(
    fc.integer({ min: 0, max: 9 }).map((n): Event => ({ type: 'MENU_KEY', n })),
    fc.constantFrom<Event>({ type: 'BACK' }, { type: 'CONFIRM' }, { type: 'POPUP_BLOCKED' }),
    time.map((now): Event => ({ type: 'OPENED', now })),
    time.map((now): Event => ({ type: 'LINK_OPENED', now })),
  );

  it('at most one open and one session, with the confirmed duration and first start', () => {
    fc.assert(
      fc.property(fc.array(connectEvent, { maxLength: 40 }), (events) => {
        const start = finalState([
          { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 2 },
          { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: MEMO },
        ]);
        const steps = replay(events, start);
        const opens = steps.filter((s) => s.effects.some((e) => e.type === 'openDestination'));
        const saves = steps.filter((s) => s.effects.some((e) => e.type === 'saveActive'));
        expect(opens.length).toBeLessThanOrEqual(1);
        expect(saves.length).toBeLessThanOrEqual(1);
        const opened = saves[0];
        if (opened) {
          const confirmed = opens[0]?.before.confirm?.plannedSec;
          expect(opened.after.session?.plannedSec).toBe(confirmed);
          const ev = opened.event;
          expect(opened.after.session?.start).toBe(ev.type === 'OPENED' || ev.type === 'LINK_OPENED' ? ev.now : NaN);
        }
      }),
      { numRuns: 500 },
    );
  });
});
