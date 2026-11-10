// Feature: blueline-design, Property 6: Summaries match the receipt rules
// Runs in Asia/Seoul and again in America/New_York (DST) — see vitest.config.ts.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_HISTORY } from '../../src/core/config';
import { outcomeCounts, totals } from '../../src/core/history';
import type { SessionRecord } from '../../src/core/record';
import { callerNumber, lastDays, periods } from '../../src/core/summary';
import { outcome, recordEndingAt, storedHistory, timestamp } from './arbitraries';

type Ymd = [number, number, number];
const ymd = (t: number): Ymd => {
  const d = new Date(t);
  return [d.getFullYear(), d.getMonth(), d.getDate()];
};
const cmp = (a: Ymd, b: Ymd) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const dayAt = (t: number, back: number): Ymd => {
  const d = new Date(t);
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
};

const DAY = 86_400_000;
const offset = fc.oneof(fc.integer({ min: -3 * DAY, max: 20 * DAY }), fc.constantFrom(0, 1, -1));
const items = fc.array(fc.tuple(offset, fc.integer({ min: 0, max: 30 }), outcome), { maxLength: 300 });

const build = (now: number, list: [number, number, SessionRecord['outcome']][]) =>
  list.map(([off, n, o]) => ({ ...recordEndingAt(now - off, n * 40), outcome: o }));

describe('Property 6: Summaries match the receipt rules', () => {
  it('periods has the fees of totals(), the counts of outcomeCounts(), and calls = records in the period', () => {
    fc.assert(
      fc.property(timestamp, items, (now, list) => {
        const records = build(now, list);
        const p = periods(records, now);
        const t = totals(records, now);
        const c = outcomeCounts(records, now);
        expect(p.today.fee).toBe(t.today);
        expect(p.week.fee).toBe(t.week);
        expect(p.today.counts).toEqual(c.today);
        expect(p.week.counts).toEqual(c.week);
        const today = ymd(now);
        const monday = dayAt(now, (new Date(now).getDay() + 6) % 7);
        const live = records.filter((r) => r.end <= now);
        expect(p.today.calls).toBe(live.filter((r) => cmp(ymd(r.end), today) === 0).length);
        expect(p.week.calls).toBe(live.filter((r) => cmp(ymd(r.end), monday) >= 0).length);
        expect(p.week.calls).toBeGreaterThanOrEqual(p.today.calls);
      }),
      { numRuns: 300 },
    );
  });

  it('lastDays(…, 7) equals a reference filter on local calendar dates', () => {
    fc.assert(
      fc.property(timestamp, items, (now, list) => {
        const records = build(now, list);
        const from = dayAt(now, 6);
        const ref = { done: 0, drifted: 0, noAnswer: 0 };
        for (const r of records) {
          if (r.end > now || cmp(ymd(r.end), from) < 0) continue;
          if (r.outcome === 'DONE') ref.done += 1;
          else if (r.outcome === 'DRIFTED') ref.drifted += 1;
          else ref.noAnswer += 1;
        }
        expect(lastDays(records, now, 7)).toEqual(ref);
      }),
      { numRuns: 300 },
    );
  });

  it('callerNumber is the largest stored Post_Number + 1, and 1 when empty or unreadable', () => {
    fc.assert(
      fc.property(storedHistory(MAX_HISTORY, 0, 'max'), (records) => {
        const largest = records.reduce((m, r) => Math.max(m, r.no), 0);
        expect(callerNumber({ kind: 'ok', records })).toBe(largest + 1);
        expect(callerNumber({ kind: 'reset', records })).toBe(largest + 1);
      }),
      { numRuns: 50 },
    );
    expect(callerNumber(null)).toBe(1);
    expect(callerNumber({ kind: 'unavailable' })).toBe(1);
    expect(callerNumber({ kind: 'ok', records: [] })).toBe(1);
  });
});
