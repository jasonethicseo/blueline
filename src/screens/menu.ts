// Destination_Menu, URL entry, and Duration_Menu (Requirements 2, 3, 4).
import { DURATIONS, FEE_RATE, MAX_URL_LENGTH } from '../core/config';
import type { AppState } from '../core/session';
import { box } from './box';
import { el, item, line, mount, won, type ViewModel } from './view';

const FICTIONAL = 'FICTIONAL CURRENCY - NO MONETARY VALUE';

function destinationMenu(view: ViewModel): Node[] {
  const pick = (n: number) => () => view.on.menu(n);
  return [
    line('MAIN MENU', 'title'),
    box([item('1. YOUTUBE', pick(1)), item('2. INSTAGRAM', pick(2)), item('3. CUSTOM URL', pick(3))]),
    line('PRESS 1-3, OR TYPE GO YT / GO IG', 'dim'),
  ];
}

function urlEntry(view: ViewModel, previous: string): Node[] {
  const form = el('form', 'screen');
  form.noValidate = true;
  const label = el('label', 'line title', 'ENTER URL:');
  label.htmlFor = 'url-input';
  const input = el('input', 'url-input');
  input.id = 'url-input';
  input.type = 'text';
  input.inputMode = 'url';
  input.maxLength = MAX_URL_LENGTH;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('enterkeyhint', 'go');
  input.value = previous;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    view.on.urlSubmit(input.value);
  });
  form.append(label, input, line('ENTER TO CONNECT. TYPE BACK TO RETURN.', 'dim'));
  // Focus after the form is in the document (Req 2.4).
  queueMicrotask(() => input.focus());
  return [form];
}

function durationMenu(state: AppState, view: ViewModel): Node[] {
  const pick = (n: number) => () => view.on.menu(n);
  return [
    line(`DESTINATION: ${state.destination?.label ?? ''}`, 'title'),
    box(DURATIONS.map((d) => item(`${d.key}. ${d.label}`, pick(d.key)))),
    line(`${won(FEE_RATE)} PER STARTED MINUTE`),
    line(FICTIONAL, 'dim'),
    item('0. BACK', () => view.on.back(), 'action'),
  ];
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  if (state.phase === 'SELECT_DEST' && state.urlEntry) {
    // Keep typed text across re-renders (e.g. after INVALID URL), Req 3.4–3.6.
    const old = root.querySelector<HTMLInputElement>('.url-input');
    mount(root, 'url-entry', () => urlEntry(view, old?.value ?? ''));
    return;
  }
  if (state.phase === 'SELECT_DEST') {
    mount(root, 'destination', () => destinationMenu(view));
    return;
  }
  mount(root, `duration:${state.destination?.label ?? ''}`, () => durationMenu(state, view));
}
