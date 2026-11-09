// NO_CARRIER_Screen (Requirements 7.1, 7.7, 7.8, 8.4). States only that the session is over;
// never claims BLUELINE closed or blocked the destination.
import type { AppState } from '../core/session';
import { el, line, mount, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const record = state.ended?.record;
  if (!record) return;

  mount(root, `nocarrier:${state.session?.id ?? 0}`, () => {
    const surface = el('div', 'screen');
    surface.addEventListener('click', () => view.on.noCarrierDone());
    surface.append(
      line('NO CARRIER', 'title'),
      line(record.reason === 'TIME UP' ? 'SESSION TIME IS UP.' : 'LINE DISCONNECTED.'),
      line('PRESS ENTER OR TAP TO SEE THE RECEIPT', 'dim'),
    );
    return [surface];
  });
}
