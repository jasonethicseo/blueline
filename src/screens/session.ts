// Session_Screen (core Requirement 6; Req 1.9): label, Purpose, elapsed, remaining, fee meter, hang-up controls.
import { NO_PURPOSE } from '../core/config';
import { formatMMSS } from '../core/time';
import type { AppState } from '../core/session';
import { box } from './box';
import { formatWon } from '../core/display';
import { el, fill, item, line, mount, pair, slot, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const session = state.session;
  if (!session) return;

  mount(root, `session:${session.id}`, () => {
    const meter = box([
      [slot(pair('ELAPSED', formatMMSS(view.elapsedSec)), 'elapsed')],
      [slot(pair('REMAINING', formatMMSS(view.remainingSec)), 'remaining')],
      [slot(pair('FEE', formatWon(view.fee)), 'fee')],
    ]);
    meter.classList.add('meter');
    // Updated every 250 ms; not announced each time (Req 15.1, design accessibility note).
    meter.setAttribute('role', 'timer');
    meter.setAttribute('aria-live', 'off');

    const hangUp = item('HANG UP', () => view.on.hangUp(), 'action');
    return [
      line(`CONNECTED TO ${session.label}`, 'title'),
      // Plain text (Req 11.3); never in the tab title or a notification (Req 1.9, 11.6).
      line(`PURPOSE: ${session.purpose ?? NO_PURPOSE}`),
      meter,
      line('FEES ARE FICTIONAL - NO MONETARY VALUE', 'dim'),
      el('p', 'line', 'TYPE BYE OR PRESS ESC TO HANG UP'),
      hangUp,
    ];
  });

  fill(root, 'elapsed', pair('ELAPSED', formatMMSS(view.elapsedSec)));
  fill(root, 'remaining', pair('REMAINING', formatMMSS(view.remainingSec)));
  fill(root, 'fee', pair('FEE', formatWon(view.fee)));
}
