import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { acceptedCommands, resolveInput, viewOf } from '../../src/core/commands';
import { MSG_NO_MORE_PAGES, boardPage } from '../../src/core/board';
import type { HistoryStatus } from '../../src/core/history';
import type { SessionRecord } from '../../src/core/record';
import {
  MSG_INVALID_SELECTION, initialState, step, type AppState, type Effect, type Event,
} from '../../src/core/session';
import { anyEvent } from '../property/session-arb';

function run(events: Event[], start: AppState = initialState()) {
  let state = start;
  const effects: Effect[] = [];
  for (const e of events) {
    const r = step(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const rec = (no: number, purpose: string | null = `목적 ${no}`): SessionRecord => ({
  no, start: no * 1000, end: no * 1000 + 60_000, plannedSec: 60, actualSec: 75, fee: 80,
  reason: 'TIME UP', label: 'YOUTUBE', purpose, outcome: no % 3 === 0 ? 'DONE' : no % 3 === 1 ? 'DRIFTED' : 'NO ANSWER',
});
const records = (n: number) => Array.from({ length: n }, (_, i) => rec(i + 1));
const menu = run([{ type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }]).state;
const open = (history: HistoryStatus) =>
  run([{ type: 'MENU_KEY', n: 4 }, { type: 'BOARD_LOADED', history }], menu);

describe('opening the Board', () => {
  it('4 on the Destination_Menu opens the Board and asks for the stored history', () => {
    const { state, effects } = run([{ type: 'MENU_KEY', n: 4 }], menu);
    expect(state).toMatchObject({ phase: 'SELECT_DEST', board: { page: 1, history: null }, destination: null });
    expect(effects).toEqual([{ type: 'loadBoard' }]);
    expect(viewOf(state)).toBe('board');
  });

  it('keeps INVALID SELECTION for 0 and 5–9 on the Destination_Menu', () => {
    for (const n of [0, 5, 9]) expect(run([{ type: 'MENU_KEY', n }], menu).state.message).toBe(MSG_INVALID_SELECTION);
  });

  it('opening and paging return no effect other than loadBoard (Req 7.11)', () => {
    fc.assert(fc.property(fc.array(anyEvent, { maxLength: 30 }), (events) => {
      const board = open({ kind: 'ok', records: records(45) }).state;
      for (const e of events) {
        const r = step(board, e);
        const kinds = r.effects.map((x) => x.type);
        expect(kinds.filter((k) => k !== 'loadBoard')).toEqual([]);
      }
    }), { numRuns: 100 });
  });
});

describe('paging', () => {
  it('an empty history is PAGE 1/1 with no posts', () => {
    expect(boardPage([], 1)).toEqual({ rows: [], page: 1, pages: 1 });
  });

  it('21 records make 2 pages; N goes older, P newer, NO MORE PAGES at both ends', () => {
    const board = open({ kind: 'ok', records: records(21) }).state;
    expect(boardPage(records(21), 1).rows.map((r) => r.no)).toEqual(records(21).slice(1).map((r) => r.no).reverse());
    expect(boardPage(records(21), 2).rows.map((r) => r.no)).toEqual([1]);
    expect(run([{ type: 'BOARD_PAGE', dir: 'prev' }], board).state).toMatchObject({ message: MSG_NO_MORE_PAGES, board: { page: 1 } });
    const second = run([{ type: 'BOARD_PAGE', dir: 'next' }], board).state;
    expect(second).toMatchObject({ message: null, board: { page: 2 } });
    expect(run([{ type: 'BOARD_PAGE', dir: 'next' }], second).state).toMatchObject({ message: MSG_NO_MORE_PAGES, board: { page: 2 } });
    expect(run([{ type: 'BOARD_PAGE', dir: 'prev' }], second).state.board?.page).toBe(1);
  });

  it('shows the stored Post_Number, the date, (NO PURPOSE), MM:SS, and the Outcome', () => {
    const [row] = boardPage([rec(7, null)], 1).rows;
    expect(row).toMatchObject({ no: 7, purpose: '(NO PURPOSE)', time: '01:15', outcome: 'DRIFTED', mark: 'N' });
    expect(row?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('unreadable and unavailable history page as empty', () => {
    for (const history of [{ kind: 'reset', records: [] }, { kind: 'unavailable' }] as HistoryStatus[]) {
      const board = open(history).state;
      expect(board.board?.history).toEqual(history);
      expect(run([{ type: 'BOARD_PAGE', dir: 'next' }], board).state.message).toBe(MSG_NO_MORE_PAGES);
    }
  });
});

describe('keys and commands on the Board', () => {
  const board = open({ kind: 'ok', records: records(3) }).state;

  it('digits 1–9 show INVALID SELECTION; 0 and BACK return to the menu with no Board', () => {
    for (const n of [1, 4, 9]) expect(run([{ type: 'MENU_KEY', n }], board).state).toMatchObject({ message: MSG_INVALID_SELECTION, board: { page: 1 } });
    for (const e of [{ type: 'MENU_KEY', n: 0 }, { type: 'BACK' }] as Event[]) {
      expect(run([e], board).state).toMatchObject({ phase: 'SELECT_DEST', board: null, destination: null });
    }
  });

  it('accepts n, p, back, numbers, and help; other words are not available', () => {
    expect(resolveInput('board', ' N ')).toEqual({ kind: 'command', command: { kind: 'word', word: 'n' } });
    expect(resolveInput('board', 'p')).toEqual({ kind: 'command', command: { kind: 'word', word: 'p' } });
    expect(resolveInput('board', 'back')).toEqual({ kind: 'command', command: { kind: 'back' } });
    expect(resolveInput('board', '0')).toEqual({ kind: 'command', command: { kind: 'number', n: 0 } });
    for (const text of ['y', 'yes', 'bye', 'go yt']) {
      expect(resolveInput('board', text)).toEqual({ kind: 'message', text: 'COMMAND NOT AVAILABLE HERE - TYPE HELP' });
    }
  });

  it('n and p are not Commands on the Destination_Menu; p does not answer on NO CARRIER', () => {
    expect(resolveInput('destination', 'n')).toEqual({ kind: 'message', text: 'COMMAND NOT AVAILABLE HERE - TYPE HELP' });
    expect(resolveInput('nocarrierCheck', 'p')).toEqual({ kind: 'message', text: 'PRESS Y OR N' });
  });

  it('help lists the Board keys, and the Destination_Menu lists 4 - BOARD', () => {
    expect(acceptedCommands('board')).toEqual([
      'N - NEXT (OLDER) PAGE', 'P - PREV (NEWER) PAGE', '0 - BACK', 'ESC - BACK', 'BACK - MAIN MENU', 'HELP - SHOW COMMANDS',
    ]);
    expect(acceptedCommands('destination').slice(0, 4)).toEqual(['1 - YOUTUBE', '2 - INSTAGRAM', '3 - CUSTOM URL', '4 - BOARD']);
  });
});
