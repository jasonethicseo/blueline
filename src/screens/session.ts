// Session_Screen (design Requirement 7; core Requirement 6): the Purpose first, then elapsed time and fee
// in big numbers, the Progress_Bar, and the hang-up control. Plain text only (core Req 11.3); the Purpose is
// never in the tab title or a notification. Text updates every 250 ms through slots, so focus survives.
import { FEE_RATE, NO_PURPOSE } from '../core/config';
import { formatClock, formatWon, progressBar, progressCells } from '../core/display';
import type { AppState } from '../core/session';
import { todaySoFar } from '../core/summary';
import { el, fill, item, mount, slot, type ViewModel } from './view';

function texts(state: AppState, view: ViewModel) {
  const s = state.session;
  const planned = s?.plannedSec ?? 0;
  const today = todaySoFar(view.stored, s?.start ?? 0, view.fee);
  return {
    elapsed: formatClock(view.elapsedSec),
    fee: formatWon(view.fee),
    bar: progressBar(progressCells(view.elapsedSec, planned)),
    pct: `${planned > 0 ? Math.floor((100 * view.elapsedSec) / planned) : 0}% OF BOOKED TIME`,
    left: `${formatClock(view.remainingSec)} LEFT · TODAY ${today.calls} CALLS · ${formatWon(today.fee)}`,
  };
}

/** A label above a big number, and a caption below it. */
function column(label: string, value: HTMLElement, caption: string): HTMLElement {
  const col = el('div', 'big');
  col.append(el('span', 'dim', label), value, el('span', 'dim', caption));
  return col;
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const session = state.session;
  if (!session) return;
  const t = texts(state, view);

  mount(root, `session:${session.id}`, () => {
    const band = el('div', 'purpose-band');
    band.append(el('span', 'band-label', 'PURPOSE'), el('span', 'band-text', session.purpose ?? NO_PURPOSE));

    // Updated every 250 ms; not announced each time (Req 11.4).
    const numbers = el('div', 'session-numbers');
    numbers.setAttribute('role', 'timer');
    numbers.setAttribute('aria-live', 'off');
    numbers.append(
      column('ON LINE', slot(t.elapsed, 'elapsed', 'display-xl'), `OF ${formatClock(session.plannedSec)} BOOKED`),
      column('FEE SO FAR', slot(t.fee, 'fee', 'display-xl em'), `${formatWon(FEE_RATE)} PER STARTED MINUTE · FICTIONAL`),
    );

    // The cells are decoration; the percentage is the text equivalent (Req 11.2).
    const progress = el('div', 'progress');
    const bar = slot(t.bar, 'bar', 'progress-bar');
    bar.setAttribute('aria-hidden', 'true');
    const left = el('p', 'line dim');
    left.append(slot(t.left, 'left'));
    progress.append(bar, slot(t.pct, 'pct', 'sr-only'), left);

    const actions = el('div', 'session-actions');
    actions.append(item('ESC · HANG UP', () => view.on.hangUp(), 'action danger'), el('span', 'dim', 'OR TYPE BYE'));
    return [band, numbers, progress, actions];
  });

  for (const name of ['elapsed', 'fee', 'bar', 'pct', 'left'] as const) fill(root, name, t[name]);
}
