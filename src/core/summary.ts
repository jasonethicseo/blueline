// Summaries for the Dial_Screen, the Purpose_Screen, the Session_Screen, and the NO_CARRIER_Screen.
// They reuse the receipt rules of history.ts (same end-timestamp rules). Pure: `now` is passed in.
import { formatClock, formatWon } from './display';
import { outcomeCounts, periodStarts, setOutcome, totals, type Counts, type HistoryStatus } from './history';
import type { NewRecord, SessionRecord } from './record';

type Slim = Pick<SessionRecord, 'end' | 'fee' | 'outcome'>;

export interface Period {
  calls: number;
  fee: number;
  counts: Counts;
}

const sum = (c: Counts): number => c.done + c.drifted + c.noAnswer;

/** Calls, fee, and Outcome counts for Today and This_Week, by the rules of `totals` and `outcomeCounts`. */
export function periods(records: readonly Slim[], now: number): { today: Period; week: Period } {
  const t = totals(records, now);
  const c = outcomeCounts(records, now);
  return {
    today: { calls: sum(c.today), fee: t.today, counts: c.today },
    week: { calls: sum(c.week), fee: t.week, counts: c.week },
  };
}

/** Local 00:00 of the day `days - 1` days before the day containing `now`. */
function daysBackStart(now: number, days: number): number {
  const d = new Date(periodStarts(now).dayStart);
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Outcome counts for records ending in the last `days` local calendar days, today included (Req 5.4). */
export function lastDays(records: readonly Slim[], now: number, days: number): Counts {
  const from = daysBackStart(now, days);
  return outcomeCounts(records.filter((r) => r.end >= from && r.end <= now), now).all;
}

const stored = (h: HistoryStatus | null): readonly SessionRecord[] =>
  h === null || h.kind === 'unavailable' ? [] : h.records;

/** The next Post_Number: the largest stored one plus 1, or 1 with no history (Req 4.4). */
export function callerNumber(history: HistoryStatus | null): number {
  return stored(history).reduce((m, r) => Math.max(m, r.no), 0) + 1;
}

const two = (n: number): string => String(n).padStart(2, '0');
const hhmm = (d: Date): string => `${two(d.getHours())}:${two(d.getMinutes())}`;

/**
 * `TODAY 23:41 · 18:02 ON LINE · DRIFTED` for the newest record; null with no record
 * (the screen then shows FIRST CALL. WELCOME.). `<when>` is TODAY, YESTERDAY, or YYYY-MM-DD, local time.
 */
export function lastCall(history: HistoryStatus | null, now: number): string | null {
  const r = stored(history).at(-1);
  if (!r) return null;
  const end = new Date(r.end);
  const { dayStart } = periodStarts(now);
  const yesterday = new Date(dayStart);
  yesterday.setDate(yesterday.getDate() - 1);
  let when: string;
  if (r.end >= dayStart) when = 'TODAY';
  else if (r.end >= yesterday.getTime()) when = 'YESTERDAY';
  else when = `${end.getFullYear()}-${two(end.getMonth() + 1)}-${two(end.getDate())}`;
  return `${when} ${hhmm(end)} · ${formatClock(r.actualSec)} ON LINE · ${r.outcome}`;
}

/** Records that ended today before this Session started, plus this Session with its current fee (Req 7.4). */
export function todaySoFar(
  history: HistoryStatus | null,
  sessionStart: number,
  currentFee: number,
): { calls: number; fee: number } {
  const { dayStart } = periodStarts(sessionStart);
  let calls = 1;
  let fee = currentFee;
  for (const r of stored(history)) {
    if (r.end >= dayStart && r.end <= sessionStart) {
      calls += 1;
      fee += r.fee;
    }
  }
  return { calls, fee };
}

/**
 * The Receipt_Preview: Today and This_Week with the ended Session counted by its Outcome, and the
 * Post_Number of its stored record. Without usable storage only this Session counts and there is no Post_Number (Req 8.4).
 */
export function preview(
  record: NewRecord,
  history: HistoryStatus | null,
  now: number,
): { today: Period; week: Period; postNo: number | null } {
  if (history === null || history.kind === 'unavailable') return { ...periods([record], now), postNo: null };
  const records = setOutcome(history.records, record.start, record.outcome);
  let postNo: number | null = null;
  for (let i = records.length - 1; i >= 0 && postNo === null; i--) {
    if (records[i]?.start === record.start) postNo = records[i]?.no ?? null;
  }
  return { ...periods(records, now), postNo };
}

/**
 * The three text lines of the Dial_Screen (design Req 4.4–4.7). With no usable history the last-call line
 * is FIRST CALL. WELCOME. and the week line shows zeros.
 */
export function dialLines(history: HistoryStatus | null, now: number): { greeting: string; last: string; week: string } {
  const week = periods(stored(history), now).week;
  const c = week.counts;
  const last = lastCall(history, now);
  return {
    greeting: `반갑습니다 ^^  WELCOME BACK, CALLER #${String(callerNumber(history)).padStart(4, '0')}`,
    last: last === null ? 'FIRST CALL. WELCOME.' : `LAST CALL: ${last}`,
    week: `THIS WEEK: ${week.calls} CALLS · ${formatWon(week.fee)} · DONE ${c.done} · DRIFTED ${c.drifted} · NO ANSWER ${c.noAnswer}`,
  };
}
