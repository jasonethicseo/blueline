// CSS boxes: a `4px double` or `1px dashed` border drawn by CSS, not by `+ - |` characters
// (design Req 2.4). Rows are plain DOM, so screen readers read only the content.
import { el } from './view';

/** A row is plain text, an element (e.g. a menu button), or several inline nodes. */
export type Row = string | HTMLElement | Node[];

export type BoxStyle = 'double' | 'dashed';

export function box(rows: Row[], style: BoxStyle = 'double'): HTMLDivElement {
  const wrap = el('div', `box box-${style}`);
  for (const r of rows) {
    const row = el('div', 'box-row');
    if (typeof r === 'string') row.textContent = r;
    else if (Array.isArray(r)) row.append(...r);
    else row.append(r);
    wrap.append(row);
  }
  return wrap;
}
