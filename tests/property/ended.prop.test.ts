// Feature: blueline-purpose-board, Property 13: Ended screens move only forward, and ended is final
// Feature: blueline-purpose-board, Property 16: Only listed transitions happen (the ENDED views)
// Feature: blueline-design, Property 3: Ended views move forward, and the Haunted_Screen appears at most once
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { recover } from '../../src/core/recover';
import type { AppState, Event } from '../../src/core/session';
import { BASE, finalState, replay, tail, toEnded, toTimeUp } from './session-arb';

/** NO CARRIER for a Session with a Purpose (it asks PURPOSE ACHIEVED?). */
const askingStart = (): AppState => finalState(toEnded);
/** NO CARRIER for a Session recovered from a v1 active state (no Purpose, no question). */
const legacyStart = (): AppState =>
  recover(JSON.stringify({ v: 1, start: BASE, plannedSec: 60, label: 'YOUTUBE' }), BASE + 120_000).state;

describe('Property 13 and Property 16: NO CARRIER moves only forward to the receipt', () => {
  it('with a Purpose only an answer leaves NO CARRIER; without one only NOCARRIER_DONE; never back', () => {
    let left = { asking: 0, legacy: 0 };
    fc.assert(
      fc.property(fc.boolean(), tail(60), (asking, events) => {
        const start = asking ? askingStart() : legacyStart();
        const id = start.session?.id as number;
        const startTime = start.ended?.record.start;
        expect(start).toMatchObject({ phase: 'ENDED', ended: { view: 'nocarrier', record: { outcome: 'NO ANSWER' } } });
        const mine = (s: AppState) => s.phase === 'ENDED' && s.session?.id === id;
        let reachedReceipt = false;

        for (const s of replay(events, start)) {
          // Ended is final: a later CONNECTED state is a new Session (Req 10.6).
          if (s.after.phase === 'CONNECTED') {
            expect(s.after.session?.id).toBeGreaterThan(id);
            expect(s.after.session?.start).not.toBe(Number.NaN);
          }
          if (!mine(s.before)) continue;
          const from = s.before.ended?.view;
          const to = mine(s.after) ? s.after.ended?.view : undefined;

          if (from === 'nocarrier') {
            // NO CARRIER can only stay, or go to the receipt of the same Session.
            expect(mine(s.after)).toBe(true);
            if (to === 'receipt') {
              reachedReceipt = true;
              if (asking) {
                left.asking += 1;
                expect(s.event.type).toBe('ANSWER');
                const outcome = s.event.type === 'ANSWER' && s.event.yes ? 'DONE' : 'DRIFTED';
                expect(s.after.ended?.record.outcome).toBe(outcome);
                expect(s.effects).toEqual([{ type: 'saveOutcome', start: startTime, outcome }]);
              } else {
                left.legacy += 1;
                expect(s.event.type).toBe('NOCARRIER_DONE');
                expect(s.after.ended?.record.outcome).toBe('NO ANSWER');
                expect(s.effects).toEqual([]);
              }
            } else {
              // Staying on NO CARRIER changes nothing about the answer (Req 5.2, 5.6, 5.11).
              expect(s.after.ended?.record.outcome).toBe('NO ANSWER');
              expect(s.effects).toEqual([]);
            }
          }
          if (from === 'receipt') {
            // No way back to NO CARRIER, and the first answer is kept (Req 5.7, 10.3).
            expect(to === 'nocarrier').toBe(false);
            if (mine(s.after)) expect(s.after.ended?.record).toEqual(s.before.ended?.record);
          }
        }
        if (reachedReceipt) expect(startTime).toBeDefined();
      }),
      { numRuns: 500 },
    );
    // The generators must leave NO CARRIER both ways, or the property says little.
    expect(left.asking).toBeGreaterThan(0);
    expect(left.legacy).toBeGreaterThan(0);
  });

  it('Property 3: views move forward, and the Haunted_Screen appears at most once, only after the first SEEN', () => {
    let hauntedRuns = 0;
    fc.assert(
      fc.property(fc.boolean(), tail(60), (timeUp, events) => {
        const start = finalState(timeUp ? toTimeUp : toEnded);
        const id = start.session?.id as number;
        const fee = start.ended?.record.fee;
        const mine = (s: AppState) => s.phase === 'ENDED' && s.session?.id === id;
        let entered = 0;
        let seenBefore = false;

        for (const s of replay(events, start)) {
          if (!mine(s.before)) continue;
          const from = s.before.ended?.view;
          const to = mine(s.after) ? s.after.ended?.view : undefined;
          if (!mine(s.after)) continue;
          expect(s.after.ended?.record.fee).toBe(fee);
          if (from !== 'receipt' && s.event.type !== 'ANSWER' && s.event.type !== 'NOCARRIER_DONE') {
            expect(s.after.ended?.record.outcome).toBe('NO ANSWER');
          }
          if (to === 'haunted' && from !== 'haunted') {
            entered += 1;
            expect(from).toBe('nocarrier');
            expect(s.event.type).toBe('SEEN');
            expect(s.before.ended?.seenAt).toBeNull();
            expect(seenBefore).toBe(false); // the first SEEN decides
            expect(s.effects).toEqual([]);
          }
          if (from === 'haunted') {
            // Only FACE_IT leaves, and it leaves to NO CARRIER with no effects.
            expect(to === 'haunted' || (to === 'nocarrier' && s.event.type === 'FACE_IT')).toBe(true);
            expect(s.effects).toEqual([]);
            if (to === 'haunted') expect(s.after.ended).toEqual(s.before.ended);
          }
          if (from === 'receipt') expect(to).toBe('receipt');
          if (s.event.type === 'SEEN') seenBefore = true;
        }
        expect(entered).toBeLessThanOrEqual(1);
        if (!timeUp) expect(entered).toBe(0); // a Hang_Up is never haunted
        hauntedRuns += entered;
      }),
      { numRuns: 500 },
    );
    expect(hauntedRuns).toBeGreaterThan(0);
  });

  it('an answer is the only Event that writes the Outcome', () => {
    const events: Event[] = [
      { type: 'NOCARRIER_DONE' }, { type: 'MENU_KEY', n: 1 }, { type: 'BACK' }, { type: 'TICK', now: BASE + 9e6 },
      { type: 'HANG_UP', now: BASE + 9e6 }, { type: 'ANSWER', yes: false }, { type: 'ANSWER', yes: true },
    ];
    const steps = replay(events, askingStart());
    const writes = steps.flatMap((s) => s.effects).filter((e) => e.type === 'saveOutcome');
    expect(writes).toEqual([{ type: 'saveOutcome', start: BASE, outcome: 'DRIFTED' }]);
    expect(steps[steps.length - 1]?.after.ended).toMatchObject({ view: 'receipt', record: { outcome: 'DRIFTED' } });
  });
});
