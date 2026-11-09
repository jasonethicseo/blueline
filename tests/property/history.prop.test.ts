// Feature: blueline-core-flow, Property 11: Today and week totals
// Feature: blueline-core-flow, Property 18: History keeps the newest 1000 records
// Runs in Asia/Seoul and again in America/New_York (DST) — see vitest.config.ts.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { appendRecord, totals } from '../../src/core/history';
import { FEE_RATE, MAX_HISTORY } from '../../src/core/config';
import { recordEndingAt, sessionRecord, timestamp } from './arbitraries';

// Reference model built from local calendar dates, independent of periodStarts.
type Ymd = [number, number, number];
const ymd = (t: number): Ymd => {
  const d = new Date(t);
  return [d.getFullYear(), d.getMonth(), d.getDate()];
};
const cmp = (a: Ymd, b: Ymd) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const mondayOf = (t: number): Ymd => {
  const d = new Date(t);
  const back = (d.getDay() + 6) % 7;
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
};

describe('Property 11: Today and week totals', () => {
  const DAY = 86_400_000;
  // Ends from 3 days in the future to 20 days in the past, plus exact-boundary hits.
  const offset = fc.oneof(fc.integer({ min: -3 * DAY, max: 20 * DAY }), fc.constantFrom(0, 1, -1));

  it('today equals the reference sum, and week ≥ today', () => {
    fc.assert(
      fc.property(
        timestamp,
        fc.array(fc.tuple(offset, fc.integer({ min: 0, max: 30 })), { maxLength: 200 }),
        (now, items) => {
          const records = items.map(([off, n]) => recordEndingAt(now - off, n * FEE_RATE));
          const today = ymd(now);
          const monday = mondayOf(now);
          let refToday = 0;
          let refWeek = 0;
          for (const r of records) {
            if (r.end > now) continue;
            if (cmp(ymd(r.end), today) === 0) refToday += r.fee;
            if (cmp(ymd(r.end), monday) >= 0) refWeek += r.fee;
          }
          const t = totals(records, now);
          expect(t.today).toBe(refToday);
          expect(t.week).toBe(refWeek);
          expect(t.week).toBeGreaterThanOrEqual(t.today);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('Property 18: History keeps the newest 1000 records', () => {
  it('appendRecord keeps min(n + 1, 1000) records ending with the new one', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_HISTORY }), sessionRecord, (n, r) => {
        const old = Array.from({ length: n }, (_, i) => ({ ...r, start: i, end: i, fee: i }));
        const next = appendRecord(old, r);
        expect(next.length).toBe(Math.min(n + 1, MAX_HISTORY));
        expect(next[next.length - 1]).toBe(r);
        expect(next.slice(0, -1)).toEqual(old.slice(old.length - (next.length - 1)));
      }),
      { numRuns: 200 },
    );
  });
});
