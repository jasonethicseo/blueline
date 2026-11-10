// What screens receive from the shell, plus small DOM helpers shared by screens.
// Screens build DOM only; they never read the clock or call other browser APIs.
import type { ReceiptModel } from '../core/history';

/** User actions a screen can trigger from a click or tap. Each runs synchronously. */
export interface Handlers {
  dial(): void;
  menu(n: number): void;
  urlSubmit(text: string): void;
  /** Enter in the Purpose_Field / Message_Field (Req 1.2, 2.2). */
  purposeSubmit(text: string): void;
  memoSubmit(text: string): void;
  /** The user typed in a text field; clears a shown message (Req 1.7). */
  typing(): void;
  back(): void;
  confirm(): void;
  linkOpened(): void;
  hangUp(): void;
  noCarrierDone(): void;
  /** Y or N on the NO_CARRIER_Screen (Req 5.3, 5.4). */
  answer(yes: boolean): void;
}

/** Values the shell computes from `now` before each render. */
export interface ViewModel {
  /** How many characters of DIAL_TEXT are typed so far. */
  dialTyped: number;
  elapsedSec: number;
  remainingSec: number;
  fee: number;
  receipt: ReceiptModel | null;
  on: Handlers;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function line(text: string, cls?: string): HTMLParagraphElement {
  return el('p', cls ? `line ${cls}` : 'line', text);
}

/** A menu button that runs `onPick` on one click or tap (Req 12.7). */
export function item(text: string, onPick: () => void, cls = 'item'): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onPick();
  });
  return b;
}

/** Fictional won amount, e.g. ₩40 (Req 6.8, 9.7). */
export function won(n: number): string {
  return `₩${n}`;
}

/** "LABEL        VALUE" padded to a fixed label width for box rows. */
export function pair(label: string, value: string, width = 13): string {
  return label.padEnd(width) + value;
}

/**
 * Rebuild `root` only when the screen key changes; otherwise keep the DOM so focus,
 * typed text, and caret survive re-renders. Returns true if it rebuilt.
 */
export function mount(root: HTMLElement, key: string, build: () => Node[]): boolean {
  if (root.dataset.key === key) return false;
  root.dataset.key = key;
  root.replaceChildren(...build());
  return true;
}

/** Set text on the element with `data-slot="name"` inside root, if it changed. */
export function fill(root: HTMLElement, name: string, text: string): void {
  const node = root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  if (node && node.textContent !== text) node.textContent = text;
}

export function slot(text: string, name: string, cls?: string): HTMLSpanElement {
  const s = el('span', cls, text);
  s.dataset.slot = name;
  return s;
}
