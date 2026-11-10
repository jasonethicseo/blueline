// Haunted_Screen (design Requirement 9). Plain text only: the Purpose is never HTML.
// The drift comes from `view.now` and the record's end, never from counting ticks (Req 9.4).
import { formatClock, formatWon } from '../core/display';
import type { AppState } from '../core/session';
import { el, fill, item, line, mount, slot, type ViewModel } from './view';

const secs = (ms: number): number => Math.max(0, Math.floor(ms / 1000));

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const ended = state.ended;
  if (!ended) return;
  const rec = ended.record;
  const drift = formatClock(secs(view.now - rec.end));
  const said = `YOU SAID, ${formatClock(secs(view.now - rec.start))} AGO`;
  const dropped = `YOUR LINE DROPPED ${drift} AGO.`;
  const billed = `BILLED ${formatWon(rec.fee)} (${formatClock(rec.plannedSec)} BOOKED) · DRIFT +${drift} NOT BILLED, BUT REMEMBERED`;

  mount(root, `haunted:${state.session?.id ?? 0}`, () => {
    const quote = el('div', 'haunted-said');
    quote.append(slot(said, 'said'), line(`"${rec.purpose ?? ''}"`));
    const dropLine = el('p', 'line');
    dropLine.append(slot(dropped, 'dropped'));
    const billLine = el('p', 'line dim');
    billLine.append(slot(billed, 'billed'));
    return [
      line('THE LINE IS HAUNTED', 'title'),
      dropLine,
      line('YOU NEVER CAME BACK.'),
      quote,
      billLine,
      item('ENTER · FACE IT', () => view.on.faceIt(), 'action'),
    ];
  });

  fill(root, 'dropped', dropped);
  fill(root, 'said', said);
  fill(root, 'billed', billed);
}
