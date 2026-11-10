// Feature: blueline-design, Property 1: Haunt level stays in range and never decreases
// Feature: blueline-design, Property 2: Haunted only for a late return to a Time_Up with a Purpose
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DEMO_PLANNED_SEC, HAUNT } from '../../src/core/config';
import { ghostLayout, hauntLevel, MAX_GHOSTS, shouldHaunt } from '../../src/core/haunt';
import { newRecord, planned, purpose } from './arbitraries';

const fullSecOf = (p: number) => (p === DEMO_PLANNED_SEC ? HAUNT.demo.fullSec : HAUNT.normal.fullSec);
const graceSecOf = (p: number) => (p === DEMO_PLANNED_SEC ? HAUNT.demo.graceSec : HAUNT.normal.graceSec);

describe('Property 1: Haunt level stays in range and never decreases', () => {
  const drift = fc.oneof(fc.integer({ min: -100_000, max: 2_000_000 }), fc.constantFrom(0, 60_000, 600_000));

  it('is in [0, 1], 0 at the drop, 1 at the full time, and monotone', () => {
    fc.assert(
      fc.property(planned, drift, drift, (p, a, b) => {
        const [d1, d2] = a <= b ? [a, b] : [b, a];
        const l1 = hauntLevel(d1, p);
        const l2 = hauntLevel(d2, p);
        expect(l1).toBeGreaterThanOrEqual(0);
        expect(l2).toBeLessThanOrEqual(1);
        expect(l1).toBeLessThanOrEqual(l2);
        expect(hauntLevel(0, p)).toBe(0);
        expect(hauntLevel(fullSecOf(p) * 1000, p)).toBe(1);
        if (d2 >= fullSecOf(p) * 1000) expect(l2).toBe(1);
      }),
      { numRuns: 300 },
    );
  });

  it('the ghost count never decreases with the level and every opacity stays in [0, 1]', () => {
    fc.assert(
      fc.property(purpose, fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (text, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const g1 = ghostLayout(text, lo);
        const g2 = ghostLayout(text, hi);
        expect(g1.length).toBeLessThanOrEqual(g2.length);
        expect(g2.length).toBeLessThanOrEqual(MAX_GHOSTS);
        for (const g of g2) {
          expect(g.opacity).toBeGreaterThanOrEqual(0);
          expect(g.opacity).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property 2: Haunted only for a late return to a Time_Up with a Purpose', () => {
  it('shouldHaunt holds exactly for TIME UP, a Purpose, and a drift of at least the Grace_Period', () => {
    fc.assert(
      fc.property(newRecord, fc.integer({ min: -5_000, max: 800_000 }), fc.boolean(), (r, off, edge) => {
        const graceMs = graceSecOf(r.plannedSec) * 1000;
        const now = r.end + (edge ? graceMs + (off % 2) - 1 : off);
        const expected = r.reason === 'TIME UP' && r.purpose !== null && now - r.end >= graceMs;
        expect(shouldHaunt(r, now)).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });
});
