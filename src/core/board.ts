// Board_Screen: past Sessions as BBS posts, newest first, 20 per page (Requirement 7). Pure.
// The Board only reads the stored history; no event here writes anything (Req 7.11).
import { BOARD_PAGE_SIZE, NO_PURPOSE, OUTCOME_LABEL, OUTCOME_SHORT } from './config';
import type { HistoryStatus } from './history';
import type { SessionRecord } from './record';
import { formatMMSS } from './time';
import {
  MSG_INVALID_SELECTION, same, say, toDestMenu, type AppState, type Event, type StepResult,
} from './session-state';

export const MSG_NO_MORE_PAGES = 'NO MORE PAGES';

export interface BoardRow {
  /** The stored Post_Number (Req 7.3, 13). */
  no: number;
  /** Local date of the end timestamp, YYYY-MM-DD. */
  date: string;
  purpose: string;
  /** Actual duration, MM:SS. */
  time: string;
  /** Outcome_Label, shown at 600 px and wider. */
  outcome: (typeof OUTCOME_LABEL)[keyof typeof OUTCOME_LABEL];
  /** Outcome_Short_Form, shown only on a Narrow viewport. */
  mark: (typeof OUTCOME_SHORT)[keyof typeof OUTCOME_SHORT];
}

export interface BoardView { rows: BoardRow[]; page: number; pages: number }

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' in the local time zone, from a passed timestamp (no clock read). */
export function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The records a history status lets the Board show: none when storage is unavailable (Req 7.9). */
export function boardRecords(history: HistoryStatus | null): readonly SessionRecord[] {
  return history && history.kind !== 'unavailable' ? history.records : [];
}

export function pageCount(n: number): number {
  return Math.max(1, Math.ceil(n / BOARD_PAGE_SIZE));
}

/**
 * One Board_Page, newest first. Records are stored oldest first with increasing Post_Numbers,
 * so page 1 is the last 20 records reversed (Req 7.3, 7.4). `page` is clamped to 1..pages.
 */
export function boardPage(records: readonly SessionRecord[], page: number): BoardView {
  const pages = pageCount(records.length);
  const p = Math.min(Math.max(1, Math.floor(page)), pages);
  const end = records.length - BOARD_PAGE_SIZE * (p - 1);
  const begin = Math.max(0, end - BOARD_PAGE_SIZE);
  const rows = records.slice(begin, end).reverse().map((r): BoardRow => ({
    no: r.no,
    date: localDate(r.end),
    purpose: r.purpose ?? NO_PURPOSE,
    time: formatMMSS(r.actualSec),
    outcome: OUTCOME_LABEL[r.outcome],
    mark: OUTCOME_SHORT[r.outcome],
  }));
  return { rows, page: p, pages };
}

/** Events while the Board_Screen is shown (Req 7.5–7.7, 7.13). */
export function boardStep(s: AppState, e: Event): StepResult {
  const board = s.board;
  if (!board) return same(s);
  if (e.type === 'BOARD_LOADED') return same({ ...s, board: { ...board, history: e.history } });
  if (e.type === 'BACK' || (e.type === 'MENU_KEY' && e.n === 0)) return toDestMenu(s);
  if (e.type === 'MENU_KEY') return say(s, MSG_INVALID_SELECTION);
  if (e.type !== 'BOARD_PAGE' || !board.history) return same(s);
  const pages = pageCount(boardRecords(board.history).length);
  const page = board.page + (e.dir === 'next' ? 1 : -1);
  if (page < 1 || page > pages) return say(s, MSG_NO_MORE_PAGES);
  return same({ ...s, board: { ...board, page } });
}
