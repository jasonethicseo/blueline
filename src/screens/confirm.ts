// Connect_Confirm_Screen and the POPUP BLOCKED link (Requirements 4.7, 4.8, 5.5, 5.6).
import { durationBySeconds } from '../core/config';
import type { AppState } from '../core/session';
import { box } from './box';
import { el, item, line, mount, pair, type ViewModel } from './view';

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const label = state.destination?.label ?? '';
  const plannedSec = state.pending?.plannedSec ?? state.confirm?.plannedSec ?? 0;
  const status = state.pending ? (state.pending.blocked ? 'blocked' : 'opening') : 'confirm';

  mount(root, `confirm:${label}:${plannedSec}:${status}`, () => {
    const nodes: Node[] = [
      box([pair('DESTINATION', label), pair('DURATION', durationBySeconds(plannedSec)?.short ?? '')]),
    ];

    if (status === 'confirm') {
      nodes.push(
        line('CONNECT? PRESS ENTER', 'title'),
        item('CONNECT', () => view.on.confirm(), 'action'),
        item('0 OR ESC: BACK', () => view.on.back(), 'action'),
      );
      return nodes;
    }

    if (status === 'opening') {
      nodes.push(line('CONNECTING...', 'dim'));
      return nodes;
    }

    // A real link is never popup-blocked and works from the keyboard (Req 5.6, 13.4).
    const link = el('a', 'action', `OPEN ${label}`);
    link.href = state.destination?.url ?? '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', () => view.on.linkOpened());
    nodes.push(line('POPUP BLOCKED', 'title'), line('PRESS ENTER OR TAP THE LINK TO OPEN IT.', 'dim'), link);
    queueMicrotask(() => link.focus());
    return nodes;
  });
}
