// DOM input → controller calls (Requirement 12). Every handler runs synchronously in the
// browser's event, so window.open, the permission request, and audio unlock keep the gesture.
import { viewOf, type ViewName } from '../core/commands';
import type { Controller } from './controller';

// Screens where a bare digit key is a menu selection (Req 2.3, 4.3, 4.8, 9.9).
const DIGIT_VIEWS = new Set<ViewName>(['destination', 'duration', 'confirm', 'receipt']);

let pointer = false;

/** True if the last input was a mouse or touch, so the shell should not pop up a keyboard. */
export function usedPointer(): boolean {
  return pointer;
}

function isControl(el: EventTarget | null): boolean {
  return el instanceof HTMLInputElement || el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement
    || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

export function attachInput(c: Controller, prompt: HTMLInputElement, form: HTMLFormElement): void {
  document.addEventListener('pointerdown', () => { pointer = true; }, { capture: true });

  // Enter in the Command_Prompt (Req 12.2, 12.12).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = prompt.value;
    prompt.value = '';
    c.submit(text);
    if (!prompt.isConnected) return;
    prompt.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', (e) => {
    pointer = false;
    if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target;

    // Escape works wherever focus is (Req 8.2, 4.8).
    if (e.key === 'Escape') {
      c.escape();
      return;
    }

    // A bare digit selects on menu screens, unless the user is typing text (Req 3.9, 12.5).
    if (/^[0-9]$/.test(e.key) && DIGIT_VIEWS.has(viewOf(c.state()))) {
      const typing = target instanceof HTMLInputElement && (target !== prompt || prompt.value !== '');
      if (!typing) {
        e.preventDefault();
        c.handlers.menu(Number(e.key));
      }
      return;
    }

    // Enter with focus outside any control acts like an empty prompt submit.
    if (e.key === 'Enter' && !isControl(target)) {
      e.preventDefault();
      c.submit('');
    }
  });
}
