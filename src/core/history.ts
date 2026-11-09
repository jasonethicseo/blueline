// Today / this-week totals, the 1000-record cap, and the receipt model. Pure: `now` is passed in.
import { MAX_HISTORY } from './config';
import type { SessionRecord } from './record';

/** What the storage layer could read, as seen by the core. */
export type HistoryStatus =
  | { kind: 'ok'; records: SessionRecord[] }
  | { kind: 'reset'; records: SessionRecord[] }
  | { kind: 'unavailable' };

export const NOTICE_RESET = 'HISTORY RESET - STORED DATA UNREADABLE';
export const NOTICE_UNAVAILABLE = 'HISTORY NOT SAVED - STORAGE UNAVAILABLE';

export interface ReceiptModel {
  record: SessionRecord;
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

/** Sum of fees whose end falls in Today / This_Week, up to `now` (Req 9.3, 9.4). */
export function totals(records: readonly SessionRecord[], now: number): { today: number; week: number } {
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

/** Append a record and keep the newest MAX_HISTORY records (Req 10.10). */
export function appendRecord(records: readonly SessionRecord[], r: SessionRecord): SessionRecord[] {
  return [...records, r].slice(-MAX_HISTORY);
}

/**
 * Receipt values. `history` is the stored history after the record was appended.
 * When storage is unavailable, totals use only the current record (Req 10.7).
 */
export function buildReceipt(record: SessionRecord, history: HistoryStatus, now: number): ReceiptModel {
  if (history.kind === 'unavailable') {
    return { record, ...totals([record], now), notice: NOTICE_UNAVAILABLE };
  }
  return {
    record,
    ...totals(history.records, now),
    notice: history.kind === 'reset' ? NOTICE_RESET : null,
  };
}
