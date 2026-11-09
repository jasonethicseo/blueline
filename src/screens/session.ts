// Session_Screen (Requirement 6): label, elapsed, remaining, fee meter, hang-up controls.
import { formatMMSS } from '../core/time';
import type { AppState } from '../core/session';
import { box } from './box';
import { el, fill, item, line, mount, pair, slot, won, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const session = state.session;
  if (!session) return;

  mount(root, `session:${session.id}`, () => {
    const meter = box([
      [slot(pair('ELAPSED', formatMMSS(view.elapsedSec)), 'elapsed')],
      [slot(pair('REMAINING', formatMMSS(view.remainingSec)), 'remaining')],
      [slot(pair('FEE', won(view.fee)), 'fee')],
    ]);
    meter.classList.add('meter');
    // Updated every 250 ms; not announced each time (Req 15.1, design accessibility note).
    meter.setAttribute('role', 'timer');
    meter.setAttribute('aria-live', 'off');

    const hangUp = item('HANG UP', () => view.on.hangUp(), 'action');
    return [
      line(`CONNECTED TO ${session.label}`, 'title'),
      meter,
      line('FEES ARE FICTIONAL - NO MONETARY VALUE', 'dim'),
      el('p', 'line', 'TYPE BYE OR PRESS ESC TO HANG UP'),
      hangUp,
    ];
  });

  fill(root, 'elapsed', pair('ELAPSED', formatMMSS(view.elapsedSec)));
  fill(root, 'remaining', pair('REMAINING', formatMMSS(view.remainingSec)));
  fill(root, 'fee', pair('FEE', won(view.fee)));
}
