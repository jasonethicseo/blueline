// Receipt_Screen (Requirement 9, 10.6, 10.7).
import { durationBySeconds } from '../core/config';
import { formatMMSS } from '../core/time';
import type { AppState } from '../core/session';
import { box } from './box';
import { item, line, mount, pair, won, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const r = view.receipt;
  if (!r || !state.ended) return;
  const rec = r.record;

  mount(root, `receipt:${state.session?.id ?? 0}`, () => {
    const nodes: Node[] = [
      line('RECEIPT', 'title'),
      box([
        pair('DESTINATION', rec.label),
        pair('PLANNED', durationBySeconds(rec.plannedSec)?.short ?? `${rec.plannedSec / 60} MIN`),
        pair('ACTUAL', formatMMSS(rec.actualSec)),
        pair('ENDED BY', rec.reason),
        pair('SESSION FEE', won(rec.fee)),
        pair('TODAY', won(r.today)),
        pair('THIS WEEK', won(r.week)),
      ]),
      line('FICTIONAL CURRENCY - NO MONETARY VALUE', 'dim'),
    ];
    if (r.notice) nodes.push(line(r.notice, 'notice'));
    nodes.push(box([item('1. DIAL AGAIN', () => view.on.menu(1))]));
    return nodes;
  });
}
