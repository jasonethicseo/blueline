// Dial_Screen (Requirement 1): BLUELINE name, Korean greeting, dial prompt, ATDT, CONNECT.
import { DIAL_TEXT } from '../core/config';
import type { AppState } from '../core/session';
import { box } from './box';
import { el, fill, line, mount, slot, type ViewModel } from './view';

function header(): HTMLElement {
  return box(['BLUELINE', 'DIAL-UP CONNECTION GATE']);
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const dialing = state.phase === 'DIALING';
  const connect = dialing && state.dial.connectShown;
  const key = dialing ? `dialing:${connect}` : 'dial';

  mount(root, key, () => {
    // One tap anywhere on the screen dials, or skips while dialing (Req 1.3, 1.7).
    const surface = el('div', 'screen');
    surface.addEventListener('click', () => view.on.dial());
    surface.append(header(), line('어서 오세요 (WELCOME)', 'em'));

    if (!dialing) {
      const tap = el('button', 'item', 'PRESS ENTER OR TAP TO DIAL');
      tap.type = 'button';
      surface.append(tap, line('ALL FEES ARE FICTIONAL.', 'dim'));
      return [surface];
    }

    const atdt = line('');
    atdt.append(slot('', 'atdt'));
    surface.append(atdt);
    surface.append(connect ? line('CONNECT', 'title') : line('PRESS ENTER OR TAP TO SKIP', 'dim'));
    return [surface];
  });

  if (dialing) {
    const typed = connect ? DIAL_TEXT.length : Math.min(view.dialTyped, DIAL_TEXT.length);
    fill(root, 'atdt', DIAL_TEXT.slice(0, typed));
  }
}
