// Today / this-week totals, post numbers, the 1000-record cap, Outcome updates, and the
// receipt model. Pure: `now` is passed in.
import { MAX_HISTORY } from './config';
import type { NewRecord, Outcome, SessionRecord } from './record';

/** What the storage layer could read, as seen by the core. */
export type HistoryStatus =
  | { kind: 'ok'; records: SessionRecord[] }
  | { kind: 'reset'; records: SessionRecord[] }
  | { kind: 'unavailable' };

export const NOTICE_RESET = 'HISTORY RESET - STORED DATA UNREADABLE';
export const NOTICE_UNAVAILABLE = 'HISTORY NOT SAVED - STORAGE UNAVAILABLE';

export interface ReceiptModel {
  record: NewRecord;
  today: number;
  week: number;
  /** Outcome counts for Today and This_Week, including the Session that just ended (Req 6.2, 6.3). */
  counts: { today: Counts; week: Counts };
  notice: typeof NOTICE_RESET | typeof NOTICE_UNAVAILABLE | null;
}

export interface Counts {
  done: number;
  drifted: number;
  noAnswer: number;
}

const zero = (): Counts => ({ done: 0, drifted: 0, noAnswer: 0 });

function add(c: Counts, outcome: Outcome): void {
  if (outcome === 'DONE') c.done += 1;
  else if (outcome === 'DRIFTED') c.drifted += 1;
  else c.noAnswer += 1;
}

/**
 * Local 00:00 of the day containing `now`, and local 00:00 of the most recent
 * Monday (today if today is Monday). Uses the local time zone, so DST days work.
 */
export function periodStarts(now: number): { dayStart: number; weekStart: number } {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const week = new Date(day.getTime());
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  week.setHours(0, 0, 0, 0);
  return { dayStart: day.getTime(), weekStart: week.getTime() };
}

/** Sum of fees whose end falls in Today / This_Week, up to `now` (core Req 9.3, 9.4). Unchanged by Req 8.4. */
export function totals(
  records: readonly Pick<SessionRecord, 'end' | 'fee'>[],
  now: number,
): { today: number; week: number } {
  const { dayStart, weekStart } = periodStarts(now);
  let today = 0;
  let week = 0;
  for (const r of records) {
    if (r.end > now) continue;
    if (r.end >= weekStart) week += r.fee;
    if (r.end >= dayStart) today += r.fee;
  }
  return { today, week };
}

/**
 * Outcome counts for Today and This_Week by the same end-timestamp rule as `totals()`,
 * and for every record (`all`). Each record adds 1 to exactly one count (Req 6.3–6.6).
 */
export function outcomeCounts(
  records: readonly Pick<SessionRecord, 'end' | 'outcome'>[],
  now: number,
): { today: Counts; week: Counts; all: Counts } {
  const { dayStart, weekStart } = periodStarts(now);
  const today = zero();
  const week = zero();
  const all = zero();
  for (const r of records) {
    add(all, r.outcome);
    if (r.end > now) continue;
    if (r.end >= weekStart) add(week, r.outcome);
    if (r.end >= dayStart) add(today, r.outcome);
  }
  return { today, week, all };
}

// No-break spaces keep each label with its number and keep "·" on the line before a wrap,
// so an Outcome_Count_Line can only wrap after a "·" (Req 6.2).
const NB = '\u00a0';

/** `DONE 1 · DRIFTED 0 · NO ANSWER 2`, with no-break spaces except after each "·". */
export function countLine(c: Counts): string {
  return [
    `DONE${NB}${c.done}${NB}·`,
    `DRIFTED${NB}${c.drifted}${NB}·`,
    `NO${NB}ANSWER${NB}${c.noAnswer}`,
  ].join(' ');
}

/**
 * Number the record and append it, keeping the newest MAX_HISTORY records (Req 13.1, 13.2, core 10.10).
 * Post_Numbers increase strictly and the oldest records go first, so the last record always holds
 * the largest number given out so far.
 */
export function appendRecord(records: readonly SessionRecord[], r: NewRecord): SessionRecord[] {
  const no = (records.at(-1)?.no ?? 0) + 1;
  // `no` last, so a stray `no` on the input can never override it.
  return [...records, { ...r, no }].slice(-MAX_HISTORY);
}

/**
 * Set the Outcome of the newest record whose start equals `start`. Count, order, Post_Numbers,
 * and every other field stay the same; no match returns the records unchanged (Req 8.8, 8.9).
 */
export function setOutcome(records: readonly SessionRecord[], start: number, outcome: Outcome): SessionRecord[] {
  let at = records.length - 1;
  while (at >= 0 && records[at]?.start !== start) at -= 1;
  if (at < 0) return [...records];
  return records.map((r, i) => (i === at ? { ...r, outcome } : r));
}

/**
 * The history status to keep after a write. A `reset` notice must survive the answer write,
 * which reads back the freshly written history as `ok` (purpose-board design).
 */
export function keepReset(prev: HistoryStatus | null, next: HistoryStatus): HistoryStatus {
  return prev?.kind === 'reset' && next.kind === 'ok' ? { kind: 'reset', records: next.records } : next;
}

/**
 * Receipt values. `history` is the stored history after the record was appended.
 * The just-ended Session is counted with its answered Outcome even if writing the answer
 * failed (Req 6.3). When storage is unavailable, totals and counts use only the current
 * record (core Req 10.7, Req 6.7).
 */
export function buildReceipt(record: NewRecord, history: HistoryStatus, now: number): ReceiptModel {
  if (history.kind === 'unavailable') {
    const { today, week } = outcomeCounts([record], now);
    return { record, ...totals([record], now), counts: { today, week }, notice: NOTICE_UNAVAILABLE };
  }
  const { today, week } = outcomeCounts(setOutcome(history.records, record.start, record.outcome), now);
  return {
    record,
    ...totals(history.records, now),
    counts: { today, week },
    notice: history.kind === 'reset' ? NOTICE_RESET : null,
  };
}
