// Board_Screen (Requirement 7): past Sessions as BBS posts, newest first, one page at a time.
// Purposes are plain text and wrap (Req 7.10, 11.3). Each row carries the Outcome twice, as the
// word and as Y/N/?; crt.css shows the word at 600 px and wider and the letter below that (Req 7.3).
import { boardPage, boardRecords } from '../core/board';
import { NOTICE_RESET, NOTICE_UNAVAILABLE } from '../core/history';
import type { AppState } from '../core/session';
import { el, item, line, mount, type ViewModel } from './view';

function cell(cls: string, text: string): HTMLSpanElement {
  return el('span', cls, text);
}

function outcomeCells(long: string, short: string): HTMLSpanElement[] {
  return [cell('board-mark mark-long', long), cell('board-mark mark-short', short)];
}

function header(): HTMLElement {
  const row = el('div', 'board-row board-head');
  row.setAttribute('aria-hidden', 'true');
  row.append(cell('board-no', 'NO.'), cell('board-date', 'DATE'), cell('board-time', 'TIME'),
    ...outcomeCells('OUTCOME', 'Y/N'), cell('board-purpose', 'PURPOSE'));
  return row;
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const board = state.board;
  if (!board) return;
  const history = board.history;

  mount(root, `board:${board.page}:${history?.kind ?? 'loading'}`, () => {
    const nodes: Node[] = [line('BOARD', 'title')];
    if (!history) return [...nodes, line('LOADING...', 'dim')];

    const records = boardRecords(history);
    const page = boardPage(records, board.page);
    nodes.push(line(`PAGE ${page.page}/${page.pages}`, 'dim'));

    if (page.rows.length === 0) {
      nodes.push(line('NO POSTS'));
      if (history.kind === 'reset') nodes.push(line(NOTICE_RESET, 'notice'));
      if (history.kind === 'unavailable') nodes.push(line(NOTICE_UNAVAILABLE, 'notice'));
    } else {
      const list = el('div', 'board');
      list.append(header());
      for (const r of page.rows) {
        const row = el('div', 'board-row');
        row.append(cell('board-no', String(r.no)), cell('board-date', r.date), cell('board-time', r.time),
          ...outcomeCells(r.outcome, r.mark), cell('board-purpose', r.purpose));
        list.append(row);
      }
      nodes.push(list);
    }

    const keys = el('div', 'choices');
    keys.append(
      item('N. NEXT', () => view.on.page('next'), 'action'),
      item('P. PREV', () => view.on.page('prev'), 'action'),
      item('0. BACK', () => view.on.back(), 'action'),
    );
    nodes.push(keys, line('N OLDER, P NEWER, 0 OR ESC TO RETURN.', 'dim'));
    return nodes;
  });
}
