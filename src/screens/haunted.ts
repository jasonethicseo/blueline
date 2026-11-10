// Haunted_Screen (design Requirement 9). Plain text only: the Purpose is never HTML. The drift and the
// Haunt_Level come from `view.now` and the record's end, never from counting ticks (Req 9.4). The ghost
// layers are decoration: aria-hidden, no pointer input, static under prefers-reduced-motion.
import { GHOST_ASCII, ghostLayout, hauntLevel, type Ghost } from '../core/haunt';
import { formatClock, formatWon } from '../core/display';
import type { AppState } from '../core/session';
import { el, fill, item, line, mount, slot, type ViewModel } from './view';

const secs = (ms: number): number => Math.max(0, Math.floor(ms / 1000));
const SIG = 'sig';

function ghostNode(g: Ghost): HTMLElement {
  const node = el('span', 'ghost', g.text);
  const set = (k: string, v: number) => node.style.setProperty(k, String(v));
  set('--x', g.x); set('--y', g.y); set('--r', g.rotate); set('--s', g.size); set('--ls', g.spacing); set('--o', g.opacity);
  return node;
}

/** Redraw the ghosts only when the layout changed (a new ghost appears, or an opacity step). */
function drawGhosts(layer: HTMLElement, ghosts: Ghost[], level: number): void {
  const sig = JSON.stringify([ghosts, level > 0]);
  if (layer.dataset[SIG] === sig) return;
  layer.dataset[SIG] = sig;
  const nodes: HTMLElement[] = ghosts.map(ghostNode);
  if (level > 0) {
    const ascii = el('pre', 'ghost-ascii', GHOST_ASCII);
    ascii.style.setProperty('--o', String(Math.min(1, 0.8 * level)));
    nodes.push(ascii);
  }
  layer.replaceChildren(...nodes);
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const ended = state.ended;
  if (!ended) return;
  const rec = ended.record;
  const purpose = rec.purpose ?? '';
  const driftMs = view.now - rec.end;
  const drift = formatClock(secs(driftMs));
  const said = `YOU SAID, ${formatClock(secs(view.now - rec.start))} AGO`;
  const dropped = `YOUR LINE DROPPED ${drift} AGO.`;
  const billed = `BILLED ${formatWon(rec.fee)} (${formatClock(rec.plannedSec)} BOOKED) · DRIFT +${drift} NOT BILLED, BUT REMEMBERED`;

  mount(root, `haunted:${state.session?.id ?? 0}`, () => {
    // Behind the text: the strong scanlines and the ghosts (Req 9.5, 9.8).
    const layer = el('div', 'haunted-layer');
    layer.setAttribute('aria-hidden', 'true');
    layer.append(el('div', 'haunt-scan'), el('div', 'ghosts'));

    const quote = el('div', 'haunted-said');
    quote.append(slot(said, 'said', 'dim'), line(`"${purpose}"`, 'said-text'));
    const dropLine = el('p', 'line');
    dropLine.append(slot(dropped, 'dropped'));
    const billLine = el('p', 'line dim');
    billLine.append(slot(billed, 'billed'));

    const content = el('div', 'haunted-content');
    content.append(
      el('h1', 'display-m haunted-title', 'THE LINE IS HAUNTED'),
      dropLine,
      line('YOU NEVER CAME BACK.'),
      line('SOMETHING STAYED ON THE LINE WITH YOU:', 'ghost-line'),
      quote,
      billLine,
      line('THE LONGER YOU STAY OUT, THE LOUDER IT GETS.', 'dim'),
      item('ENTER · FACE IT', () => view.on.faceIt(), 'action white'),
    );
    return [layer, content];
  });

  fill(root, 'dropped', dropped);
  fill(root, 'said', said);
  fill(root, 'billed', billed);
  const level = hauntLevel(driftMs, rec.plannedSec);
  const ghosts = root.querySelector<HTMLElement>('.ghosts');
  if (ghosts) drawGhosts(ghosts, ghostLayout(purpose, level), level);
}
