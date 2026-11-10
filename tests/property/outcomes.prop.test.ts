// Feature: blueline-purpose-board, Property 3: Outcome counts add up
// Feature: blueline-purpose-board, Property 4: Week counts are at least today's counts
// Feature: blueline-purpose-board, Property 11: Writing an answer changes one Outcome only
// Runs in Asia/Seoul and again in America/New_York (DST) — see vitest.config.ts.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_HISTORY } from '../../src/core/config';
import { appendRecord, buildReceipt, outcomeCounts, setOutcome, type Counts } from '../../src/core/history';
import type { NewRecord, Outcome, SessionRecord } from '../../src/core/record';
import { outcome, recordEndingAt, storedHistory, timestamp } from './arbitraries';

// Reference model from local calendar dates, independent of periodStarts (as in Property 11).
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
const total = (c: Counts) => c.done + c.drifted + c.noAnswer;
const countOf = (rs: { outcome: Outcome }[], o: Outcome) => rs.filter((r) => r.outcome === o).length;

const DAY = 86_400_000;
// Ends from 3 days in the future to 20 days in the past, plus exact-boundary hits.
const offset = fc.oneof(fc.integer({ min: -3 * DAY, max: 20 * DAY }), fc.constantFrom(0, 1, -1));
const scenario = fc.tuple(
  timestamp,
  fc.array(fc.tuple(offset, outcome), { maxLength: MAX_HISTORY, size: 'max' }),
).map(([now, items]) => ({
  now,
  records: items.map(([off, o]) => ({ ...recordEndingAt(now - off, 40), outcome: o })),
}));

describe('Property 3: Outcome counts add up', () => {
  it('DONE + DRIFTED + NO ANSWER equals the number of records in Today, This_Week, and all', () => {
    fc.assert(
      fc.property(scenario, ({ now, records }) => {
        const today = ymd(now);
        const monday = mondayOf(now);
        const past = records.filter((r) => r.end <= now);
        const inToday = past.filter((r) => cmp(ymd(r.end), today) === 0);
        const inWeek = past.filter((r) => cmp(ymd(r.end), monday) >= 0);
        const c = outcomeCounts(records, now);
        expect(total(c.today)).toBe(inToday.length);
        expect(total(c.week)).toBe(inWeek.length);
        expect(total(c.all)).toBe(records.length);
        for (const [counts, rs] of [[c.today, inToday], [c.week, inWeek], [c.all, records]] as const) {
          expect(counts).toEqual({
            done: countOf(rs, 'DONE'), drifted: countOf(rs, 'DRIFTED'), noAnswer: countOf(rs, 'NO ANSWER'),
          });
        }
      }),
      { numRuns: 200 },
    );
  });

  it('counts every Legacy_Record as NO ANSWER', () => {
    fc.assert(
      fc.property(scenario, ({ now, records }) => {
        const legacy = records.map((r) => ({ ...r, outcome: 'NO ANSWER' as const }));
        const c = outcomeCounts(legacy, now);
        expect(c.all).toEqual({ done: 0, drifted: 0, noAnswer: legacy.length });
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 3 (merged NO CARRIER screen): a Session ended there is counted once', () => {
  const key = (o: Outcome): keyof Counts => (o === 'DONE' ? 'done' : o === 'DRIFTED' ? 'drifted' : 'noAnswer');
  const plus = (c: Counts, o: Outcome): Counts => ({ ...c, [key(o)]: c[key(o)] + 1 });

  it('answered Y, answered N, or left unanswered, the receipt counts add up and include it once', () => {
    fc.assert(
      fc.property(
        storedHistory(MAX_HISTORY, 0, 'max'), timestamp, fc.constantFrom('Y', 'N', 'none'), fc.boolean(),
        (history, now, answer, writeFails) => {
          // endSession appends the record as NO ANSWER (Req 5.5) ...
          const ended: NewRecord = { ...recordEndingAt(now, 40), purpose: '강의 하나만' };
          const afterEnd = appendRecord(history, ended);
          // ... and an answer on NO CARRIER writes the Outcome, unless the write fails (Req 5.3, 5.4, 5.8).
          const outcome: Outcome = answer === 'Y' ? 'DONE' : answer === 'N' ? 'DRIFTED' : 'NO ANSWER';
          const stored = answer === 'none' || writeFails ? afterEnd : setOutcome(afterEnd, ended.start, outcome);
          const r = buildReceipt({ ...ended, outcome }, { kind: 'ok', records: stored }, now);

          const others = outcomeCounts(afterEnd.slice(0, -1), now);
          expect(r.counts.today).toEqual(plus(others.today, outcome));
          expect(r.counts.week).toEqual(plus(others.week, outcome));
          const inToday = stored.filter((x) => x.end <= now && cmp(ymd(x.end), ymd(now)) === 0).length;
          expect(total(r.counts.today)).toBe(inToday);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 4: Week counts are at least today\'s counts', () => {
  it('each This_Week count is ≥ the same Today count', () => {
    fc.assert(
      fc.property(scenario, ({ now, records }) => {
        const { today, week } = outcomeCounts(records, now);
        expect(week.done).toBeGreaterThanOrEqual(today.done);
        expect(week.drifted).toBeGreaterThanOrEqual(today.drifted);
        expect(week.noAnswer).toBeGreaterThanOrEqual(today.noAnswer);
      }),
      { numRuns: 200 },
    );
  });
});

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
