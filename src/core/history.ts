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
  notice: typeof NOTICE_RESET | typeof NOTICE_UNAVAILABLE | null;
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
 * Receipt values. `history` is the stored history after the record was appended.
 * When storage is unavailable, totals use only the current record (core Req 10.7).
 */
export function buildReceipt(record: NewRecord, history: HistoryStatus, now: number): ReceiptModel {
  if (history.kind === 'unavailable') {
    return { record, ...totals([record], now), notice: NOTICE_UNAVAILABLE };
  }
  return {
    record,
    ...totals(history.records, now),
    notice: history.kind === 'reset' ? NOTICE_RESET : null,
  };
}
