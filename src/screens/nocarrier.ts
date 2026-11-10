// NO_CARRIER_Screen with the Message and the Purpose check (core Requirements 7.1, 7.7, 7.8, 8.4;
// purpose-board Requirements 4, 5). States only that the session is over; never claims BLUELINE
// closed or blocked the destination. Purpose and Message are plain text (Req 11.3).
import type { AppState } from '../core/session';
import { el, item, line, mount, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const ended = state.ended;
  if (!ended) return;
  const { record, memo } = ended;
  const purpose = record.purpose;

  mount(root, `nocarrier:${state.session?.id ?? 0}`, () => {
    const surface = el('div', 'screen');
    surface.append(
      line('NO CARRIER', 'title'),
      line(record.reason === 'TIME UP' ? 'SESSION TIME IS UP.' : 'LINE DISCONNECTED.'),
    );

    // Only while this screen is up; the reducer drops it when NO CARRIER is left (Req 4.1, 4.3, 4.5).
    if (memo !== null) {
      const box = el('div', 'memo');
      box.append(line('MESSAGE FROM THE PAST', 'em'), line(memo), line('THIS MESSAGE WILL NOT BE SHOWN AGAIN.', 'dim'));
      surface.append(box);
    }

    if (purpose === null) {
      // A Session from before the update: no question, the core move-on rule (Req 5.9).
      surface.addEventListener('click', () => view.on.noCarrierDone());
      surface.append(line('PRESS ENTER OR TAP TO SEE THE RECEIPT', 'dim'));
      return [surface];
    }

    // The question waits for Y or N; a tap elsewhere does nothing (Req 5.1, 5.2).
    const choices = el('div', 'choices');
    choices.append(
      item('Y · YES (DONE)', () => view.on.answer(true), 'action'),
      item('N · NO (DRIFTED)', () => view.on.answer(false), 'action'),
    );
    surface.append(
      line(`PURPOSE: ${purpose}`),
      line('PURPOSE ACHIEVED?', 'title'),
      choices,
      line('PRESS Y OR N. LEAVING WITHOUT AN ANSWER RECORDS NO ANSWER.', 'dim'),
    );
    return [surface];
  });
}
