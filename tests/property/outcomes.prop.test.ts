// Feature: blueline-purpose-board, Property 11: Writing an answer changes one Outcome only
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { setOutcome } from '../../src/core/history';
import type { SessionRecord } from '../../src/core/record';
import { outcome, storedHistory } from './arbitraries';

/** Some histories share start timestamps, so "the newest record with that start" is exercised. */
const history = fc.oneof(
  storedHistory(200),
  storedHistory(50, 2).map((rs) => rs.map((r, i) => ({ ...r, start: rs[i % 3]?.start ?? r.start }))),
);

describe('Property 11: Writing an answer changes one Outcome only', () => {
  it('changes only the Outcome of the newest record with that start', () => {
    fc.assert(
      fc.property(history.filter((h) => h.length > 0), fc.nat(), outcome, (h, i, o) => {
        const start = (h[i % h.length] as SessionRecord).start;
        let target = -1;
        h.forEach((r, j) => { if (r.start === start) target = j; });
        const next = setOutcome(h, start, o);
        expect(next.length).toBe(h.length);
        next.forEach((r, j) => {
          expect(r).toEqual(j === target ? { ...h[j], outcome: o } : h[j]);
        });
      }),
      { numRuns: 200 },
    );
  });

  it('returns equal records when no record has that start', () => {
    fc.assert(
      fc.property(storedHistory(200), fc.integer(), outcome, (h, start, o) => {
        fc.pre(h.every((r) => r.start !== start));
        expect(setOutcome(h, start, o)).toEqual(h);
      }),
      { numRuns: 200 },
    );
  });
});
