// Draws a Frame into the Status_Bar and Function_Key_Bar, and sets the page theme (design Requirement 2).
// The bars are rebuilt only when their text changes, so screen readers read them once per screen.
import type { Frame } from './frame';
import { el } from './view';

const DECOR = /^[░▒▓]/;

export function drawFrame(statusBar: HTMLElement, keyBar: HTMLElement, f: Frame): void {
  if (document.body.dataset.theme !== f.theme) document.body.dataset.theme = f.theme;

  const statusKey = JSON.stringify([f.status, f.online]);
  if (statusBar.dataset.key !== statusKey) {
    statusBar.dataset.key = statusKey;
    statusBar.replaceChildren(...f.status.map((text, i) => {
      const item = el('span', f.online && i === f.status.length - 1 ? 'status-item badge' : 'status-item', text);
      // Signal bars are decoration, not text to read out (Req 11.2).
      if (DECOR.test(text)) item.setAttribute('aria-hidden', 'true');
      return item;
    }));
  }

  const keyKey = JSON.stringify([f.keys, f.hint ?? null]);
  if (keyBar.dataset.key !== keyKey) {
    keyBar.dataset.key = keyKey;
    const items = f.keys.map(([key, label]) => {
      const item = el('span', 'key-item');
      item.append(el('b', 'key-name', key), ` ${label}`);
      return item;
    });
    keyBar.replaceChildren(...items);
    if (f.hint) keyBar.append(el('span', 'key-hint', f.hint));
  }
}
