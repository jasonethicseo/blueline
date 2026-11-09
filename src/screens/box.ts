// ASCII boxes drawn only with text characters (Req 2.1, 4.1, 9.2) as real DOM text (Req 15.1).
// Borders are aria-hidden so screen readers read only the content.
import { el } from './view';

export const BOX_COLS = 32;

/** A row is plain text, an element (e.g. a menu button), or several inline nodes. */
export type Row = string | HTMLElement | Node[];

function edge(cols: number): HTMLParagraphElement {
  const p = el('p', 'box-edge', `+${'-'.repeat(cols - 2)}+`);
  p.setAttribute('aria-hidden', 'true');
  return p;
}

// A column of "|" taller than any row; CSS clips it to the row height. 12 lines covers a
// 60-Character Hangul Purpose (about 5 lines) with room to spare (purpose-board design).
const SIDE_TEXT = Array.from({ length: 12 }, () => '|').join('\n');

function side(): HTMLSpanElement {
  const s = el('span', 'box-side', SIDE_TEXT);
  s.setAttribute('aria-hidden', 'true');
  return s;
}

function cell(content: Row): HTMLElement {
  if (content instanceof HTMLButtonElement) return content;
  const c = el('span', 'box-cell');
  if (typeof content === 'string') c.textContent = content;
  else if (Array.isArray(content)) c.append(...content);
  else c.append(content);
  return c;
}

export function box(rows: Row[], cols = BOX_COLS): HTMLDivElement {
  const wrap = el('div', 'box');
  wrap.append(edge(cols));
  for (const r of rows) {
    const row = el('div', 'box-row');
    row.append(side(), cell(r), side());
    wrap.append(row);
  }
  wrap.append(edge(cols));
  return wrap;
}
