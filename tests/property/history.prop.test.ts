// Feature: blueline-core-flow, Property 11: Today and week totals
// Feature: blueline-core-flow, Property 18: History keeps the newest 1000 records
// Feature: blueline-purpose-board, Property 9: Post numbers survive removal
// Feature: blueline-purpose-board, Property 10: Post numbers are unique and increasing
// Runs in Asia/Seoul and again in America/New_York (DST) — see vitest.config.ts.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { appendRecord, setOutcome, totals } from '../../src/core/history';
import { FEE_RATE, MAX_HISTORY } from '../../src/core/config';
import { parseHistory, type NewRecord, type Outcome, type SessionRecord } from '../../src/core/record';
import { legacyRecord, newRecord, outcome, recordEndingAt, storedHistory, timestamp } from './arbitraries';

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

describe('Property 18: History keeps the newest 1000 records (updated for Post_Numbers)', () => {
  it('appendRecord keeps min(n + 1, 1000) records ending with the new one, numbered after the last', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_HISTORY }), newRecord, (n, r) => {
        const old = Array.from({ length: n }, (_, i) => ({ ...r, no: i + 1, start: i, end: i, fee: i }));
        const next = appendRecord(old, r);
        expect(next.length).toBe(Math.min(n + 1, MAX_HISTORY));
        expect(next[next.length - 1]).toEqual({ ...r, no: n + 1 });
        expect(next.slice(0, -1)).toEqual(old.slice(old.length - (next.length - 1)));
      }),
      { numRuns: 200 },
    );
  });
});

/** Start histories for the post-number properties: empty (also a reset), parsed v1, and stored v2, up to the cap. */
const startHistory: fc.Arbitrary<SessionRecord[]> = fc.oneof(
  fc.constant<SessionRecord[]>([]),
  fc.array(legacyRecord, { maxLength: MAX_HISTORY, size: 'max' }).map((rs) => {
    const parsed = parseHistory(JSON.stringify({ v: 1, records: rs }));
    if (!parsed.ok) throw new Error('v1 text should parse');
    return parsed.records;
  }),
  storedHistory(MAX_HISTORY, 0, 'max'),
  storedHistory(MAX_HISTORY, MAX_HISTORY - 50, 'max'),
);
const appends = fc.array(newRecord, { maxLength: 300, size: 'max' });

describe('Property 9: Post numbers survive removal', () => {
  it('every record that is still there after the appends keeps its Post_Number and fields', () => {
    let crossed = 0;
    fc.assert(
      fc.property(startHistory, appends, (before, added) => {
        let after = before;
        for (const r of added) after = appendRecord(after, r);
        // The cap removes from the front, so the survivors are a suffix of `before`.
        const dropped = Math.max(0, before.length + added.length - MAX_HISTORY);
        if (dropped > 0) crossed += 1;
        const survivors = before.slice(Math.min(dropped, before.length));
        expect(after.length).toBe(Math.min(MAX_HISTORY, before.length + added.length));
        expect(after.slice(0, survivors.length)).toEqual(survivors);
      }),
      { numRuns: 100 },
    );
    // The generators must actually push past the 1000-record cap.
    expect(crossed).toBeGreaterThan(0);
  });
});

describe('Property 10: Post numbers are unique and increasing', () => {
  type Op = { kind: 'append'; r: NewRecord } | { kind: 'answer'; pick: number; outcome: Outcome };
  const op: fc.Arbitrary<Op> = fc.oneof(
    { weight: 3, arbitrary: newRecord.map((r): Op => ({ kind: 'append', r })) },
    { weight: 1, arbitrary: fc.tuple(fc.nat(), outcome).map(([pick, o]): Op => ({ kind: 'answer', pick, outcome: o })) },
  );

  it('appends get the largest number so far plus 1, and numbers stay strictly increasing', () => {
    fc.assert(
      fc.property(startHistory, fc.array(op, { maxLength: 300, size: 'max' }), (start, ops) => {
        let records = start;
        let largest = records.reduce((m, r) => Math.max(m, r.no), 0);
        for (const o of ops) {
          if (o.kind === 'append') {
            records = appendRecord(records, o.r);
            expect(records[records.length - 1]?.no).toBe(largest + 1);
            largest += 1;
          } else {
            const target = records.length ? (records[o.pick % records.length] as SessionRecord).start : o.pick;
            records = setOutcome(records, target, o.outcome);
          }
        }
        for (let i = 1; i < records.length; i++) {
          expect((records[i] as SessionRecord).no).toBeGreaterThan((records[i - 1] as SessionRecord).no);
        }
        expect(new Set(records.map((r) => r.no)).size).toBe(records.length);
      }),
      { numRuns: 100 },
    );
  });
});
