// Receipt_Screen (core Requirement 9, 10.6, 10.7; purpose-board Requirement 6).
import { NO_PURPOSE, OUTCOME_LABEL, durationBySeconds } from '../core/config';
import { countLine } from '../core/history';
import { formatMMSS } from '../core/time';
import type { AppState } from '../core/session';
import { box } from './box';
import { el, item, line, mount, pair, won, type ViewModel } from './view';

/** A box row indented under its label, for text that may wrap (Purpose, Outcome counts). */
const indented = (text: string, cls = ''): HTMLElement => el('span', `box-indent ${cls}`.trim(), text);

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const r = view.receipt;
  if (!r || !state.ended) return;
  const rec = r.record;

  mount(root, `receipt:${state.session?.id ?? 0}`, () => {
    const nodes: Node[] = [
      line('RECEIPT', 'title'),
      box([
        pair('DESTINATION', rec.label),
        'PURPOSE',
        // Plain text only (Req 11.3); a 60-Character Purpose wraps inside the box (Req 11.4).
        indented(rec.purpose ?? NO_PURPOSE),
        pair('PLANNED', durationBySeconds(rec.plannedSec)?.short ?? `${rec.plannedSec / 60} MIN`),
        pair('ACTUAL', formatMMSS(rec.actualSec)),
        pair('ENDED BY', rec.reason),
        pair('OUTCOME', OUTCOME_LABEL[rec.outcome]),
        pair('SESSION FEE', won(rec.fee)),
        pair('TODAY', won(r.today)),
        indented(countLine(r.counts.today), 'counts'),
        pair('THIS WEEK', won(r.week)),
        indented(countLine(r.counts.week), 'counts'),
      ]),
      line('FICTIONAL CURRENCY - NO MONETARY VALUE', 'dim'),
    ];
    if (r.notice) nodes.push(line(r.notice, 'notice'));
    nodes.push(box([item('1. DIAL AGAIN', () => view.on.menu(1))]));
    return nodes;
  });
}
