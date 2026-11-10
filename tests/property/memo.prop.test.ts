// Feature: blueline-purpose-board, Property 5: A Message is shown at most once
// Feature: blueline-design, Property 4: The Message is still shown at most once
// Reloads are modelled with a fake storage slot for the Active_Session_State: saveActive writes
// it, endSession and clearActive empty it, and a reload replaces the state with recover().
// Tab visibility only changes when the shell renders and dispatches TICK, so TICK events at
// random times stand in for hidden and visible periods.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { serializeActive } from '../../src/core/record';
import { recover } from '../../src/core/recover';
import { initialState, step, type AppState, type Effect, type Event } from '../../src/core/session';
import { BASE, anyEvent, time, toConnected, toEnded, toTimeUp } from './session-arb';

type Ev = Event | { type: 'RELOAD'; now: number };

const ev: fc.Arbitrary<Ev> = fc.oneof(
  { weight: 6, arbitrary: anyEvent },
  { weight: 1, arbitrary: time.map((now): Ev => ({ type: 'RELOAD', now })) },
);
const start = fc.constantFrom<Event[]>([], toConnected, toEnded, toTimeUp);
const script = fc.tuple(start, fc.array(ev, { maxLength: 60 })).map(([p, t]): Ev[] => [...p, ...t]);

/**
 * Does this state show a Message on the NO_CARRIER_Screen? Only after SEEN (the user has seen the
 * ended Session) and never on the Haunted_Screen, whose view is not `nocarrier`.
 */
const shows = (s: AppState) =>
  s.phase === 'ENDED' && s.ended?.view === 'nocarrier' && s.ended.memo !== null && s.ended.seenAt !== null;

describe('Property 5: A Message is shown at most once', () => {
  it('for every Session, at most one NO_CARRIER_Screen shows its Message, and none after its receipt', () => {
    let delivered = 0;
    let reloadedAfterDelivery = 0;
    fc.assert(
      fc.property(script, (events) => {
        // Two Sessions cannot start at the same millisecond in the app; keep that true here.
        const opens = events.filter((e) => e.type === 'OPENED' || e.type === 'LINK_OPENED')
          .map((e) => ('now' in e ? e.now : 0));
        fc.pre(new Set(opens).size === opens.length);

        let state = initialState();
        let stored: string | null = null;
        const apply = (effects: Effect[]) => {
          for (const e of effects) {
            if (e.type === 'saveActive') stored = serializeActive(e.active);
            if (e.type === 'endSession' || e.type === 'clearActive') stored = null;
          }
        };
        const shown = new Map<number, number>();
        const receipted = new Set<number>();
        let seenDelivery = false;

        for (const e of events) {
          const before = state;
          if (e.type === 'RELOAD') {
            if (seenDelivery) reloadedAfterDelivery += 1;
            const r = recover(stored, e.now, state.seq);
            state = r.state;
            apply(r.effects);
          } else {
            const r = step(state, e);
            state = r.state;
            apply(r.effects);
          }
          const key = state.ended?.record.start;
          if (key === undefined) continue;
          const stayed = e.type !== 'RELOAD' && shows(before) && before.ended?.record.start === key;
          if (shows(state) && !stayed) {
            shown.set(key, (shown.get(key) ?? 0) + 1);
            delivered += 1;
            seenDelivery = true;
            expect(shown.get(key)).toBeLessThanOrEqual(1);
            expect(receipted.has(key)).toBe(false);
          }
          if (state.ended?.view === 'receipt') receipted.add(key);
        }
      }),
      { numRuns: 500 },
    );
    // The scripts must deliver Messages and reload afterwards, or the property says little.
    expect(delivered).toBeGreaterThan(0);
    expect(reloadedAfterDelivery).toBeGreaterThan(0);
  });

  it('a reload on NO CARRIER before an answer shows the Dial_Screen and no Message', () => {
    let state = initialState();
    let stored: string | null = null;
    for (const e of toEnded) {
      const r = step(state, e);
      state = r.state;
      for (const fx of r.effects) {
        if (fx.type === 'saveActive') stored = serializeActive(fx.active);
        if (fx.type === 'endSession') stored = null;
      }
    }
    state = step(state, { type: 'SEEN', now: BASE + 6_000 }).state;
    expect(shows(state)).toBe(true);
    const after = recover(stored, BASE + 60_000);
    expect(after.state.phase).toBe('IDLE');
    expect(after.effects).toEqual([]);
  });
});

describe('Property 4: The Message is still shown at most once (with SEEN, FACE_IT, and reloads)', () => {
  it('the Haunted_Screen never shows the Message, and a reload while haunted shows the Dial_Screen', () => {
    let state = initialState();
    let stored: string | null = null;
    for (const e of toTimeUp) {
      const r = step(state, e);
      state = r.state;
      for (const fx of r.effects) {
        if (fx.type === 'saveActive') stored = serializeActive(fx.active);
        if (fx.type === 'endSession') stored = null;
      }
    }
    expect(shows(state)).toBe(false);
    state = step(state, { type: 'SEEN', now: BASE + 120_000 }).state;
    expect(state.ended?.view).toBe('haunted');
    expect(shows(state)).toBe(false);
    const after = recover(stored, BASE + 130_000);
    expect(after.state.phase).toBe('IDLE');
    expect(after.state.ended).toBeNull();
    state = step(state, { type: 'FACE_IT', now: BASE + 125_000 }).state;
    expect(shows(state)).toBe(true);
  });
});
