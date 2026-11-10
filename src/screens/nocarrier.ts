// NO_CARRIER_Screen with the Message and the Purpose check (design Requirement 8; core Requirements 7.1,
// 7.7, 8.4; purpose-board Requirements 4, 5). States only that the session is over; never claims BLUELINE
// closed or blocked the destination. Purpose and Message are plain text (core Req 11.3).
import { countLine } from '../core/history';
import { formatClock, formatWon } from '../core/display';
import type { AppState } from '../core/session';
import { preview, type Period } from '../core/summary';
import { box } from './box';
import { el, item, line, mount, type ViewModel } from './view';

const secs = (ms: number): number => Math.max(0, Math.floor(ms / 1000));

function periodBlock(title: string, p: Period): HTMLElement[] {
  return [
    el('span', 'dim', title),
    el('span', 'preview-total', `${p.calls} CALLS · ${formatWon(p.fee)}`),
    el('span', 'dim', countLine(p.counts)),
  ];
}

/** The Receipt_Preview column: the ended Session counts as NO ANSWER until the user answers (Req 8.3, 8.4). */
function previewColumn(state: AppState, view: ViewModel): HTMLElement {
  const rec = state.ended?.record;
  const side = el('div', 'col-side receipt-preview');
  if (!rec) return side;
  const p = preview(rec, view.stored, view.now);
  side.append(el('span', 'preview-head', 'RECEIPT PREVIEW'), ...periodBlock('TODAY', p.today), ...periodBlock('THIS WEEK', p.week));
  // No answer is asked of a Session without a Purpose, and no stored record means no Post_Number.
  if (rec.purpose !== null && p.postNo !== null) {
    side.append(el('span', 'dim post-line', `YOUR ANSWER GOES TO THE BOARD AS POST #${String(p.postNo).padStart(4, '0')}.`));
  }
  return side;
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const ended = state.ended;
  if (!ended) return;
  const { record, memo, shownAt } = ended;
  const purpose = record.purpose;

  // Rebuilt once when NO CARRIER is first shown, so SENT <MM:SS> AGO is measured to that moment (Req 8.2).
  mount(root, `nocarrier:${state.session?.id ?? 0}:${shownAt ?? 'unseen'}`, () => {
    const main = el('div', 'col-main');
    const head = el('div', 'nc-head');
    head.append(
      el('span', 'dim', '+++ ATH0'),
      el('span', 'display-xl', 'NO CARRIER'),
      el('span', 'dim', `${formatClock(record.plannedSec)} BOOKED · ${formatClock(record.actualSec)} ON LINE · ${formatWon(record.fee)} (FICTIONAL)`),
    );
    main.append(head);

    // Only while this screen is up; the reducer drops it when NO CARRIER is left (Req 8.2, core Req 4.5).
    if (memo !== null) {
      const sent = formatClock(secs((shownAt ?? view.now) - record.start));
      main.append(box([
        el('span', 'em', `✉ MESSAGE FROM THE PAST · SENT ${sent} AGO`),
        el('span', 'memo-text', memo),
        el('span', 'dim', 'THIS MESSAGE WILL NOT BE SHOWN AGAIN.'),
      ], 'double yellow'));
    }

    const surface = el('div', 'cols nocarrier');
    if (purpose === null) {
      // A Session from before the update: no question, the core move-on rule (Req 8.6).
      surface.addEventListener('click', () => view.on.noCarrierDone());
      main.append(line('PRESS ENTER OR TAP TO SEE THE RECEIPT', 'dim'));
    } else {
      // The question waits for Y or N; a tap elsewhere does nothing (Req 8.7).
      const purposeLine = line('PURPOSE: ');
      purposeLine.append(el('span', 'cyan', purpose));
      const choices = el('div', 'choices');
      choices.append(
        item('Y · YES (DONE)', () => view.on.answer(true), 'action green'),
        item('N · NO (DRIFTED)', () => view.on.answer(false), 'action'),
      );
      main.append(purposeLine, el('span', 'nc-question', 'PURPOSE ACHIEVED?'), choices);
    }
    surface.append(main, previewColumn(state, view));
    return [surface];
  });
}
