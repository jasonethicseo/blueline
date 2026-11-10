// Dial_Screen (design Requirement 4): the Modem_Log on the left, the BLUELINE box with the greeting,
// the last call, and this week's summary on the right. It only reads the stored snapshot; it never writes.
import { TIMING } from '../core/config';
import { modemLines } from '../core/display';
import type { AppState } from '../core/session';
import { dialLines } from '../core/summary';
import { box } from './box';
import { el, item, line, mount, type ViewModel } from './view';

const SIG = 'sig';

/** Redraw the Modem_Log only when its lines changed (the ATDT line is typed one character at a time). */
function drawLog(log: HTMLElement, lines: ReturnType<typeof modemLines>): void {
  const sig = JSON.stringify(lines);
  if (log.dataset[SIG] === sig) return;
  log.dataset[SIG] = sig;
  log.replaceChildren(...lines.map((l) => line(l.text, `modem-${l.cls}`)));
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const dialing = state.phase === 'DIALING';
  const connect = dialing && state.dial.connectShown;

  mount(root, dialing ? `dialing:${connect}` : 'dial', () => {
    // One tap anywhere on the screen dials, or skips while dialing (core Req 1.3, 1.7).
    const surface = el('div', 'cols dial');
    surface.addEventListener('click', () => view.on.dial());

    const text = dialLines(view.stored, view.now);
    const title = el('div', 'dial-title');
    title.append(
      el('span', 'display-l title', 'BLUELINE'),
      line('PERSONAL DIAL-UP GATE FOR ENDLESS FEEDS', 'cyan'),
      line('개인 통신망 (PERSONAL NETWORK) · SINCE 1994 (NOT REALLY)', 'dim'),
    );
    const main = el('div', 'col-main');
    main.append(
      box([[title]]),
      el('div', 'dial-facts'),
      ...(dialing
        ? (connect ? [] : [line('PRESS ENTER OR TAP TO SKIP', 'dim')])
        : [item('ENTER · DIAL IN', () => view.on.dial(), 'action fill')]),
      line('ALL FEES ARE FICTIONAL.', 'dim'),
    );
    main.querySelector('.dial-facts')?.append(line(text.greeting), line(text.last, 'dim'), line(text.week, 'dim'));

    const log = el('div', 'col-side modem-log');
    log.setAttribute('aria-label', 'MODEM LOG');
    surface.append(main, log);
    return [surface];
  });

  const log = root.querySelector<HTMLElement>('.modem-log');
  if (!log) return;
  if (!dialing) {
    // Before dialing: empty except a dim hint (Req 4.2).
    if (log.dataset[SIG] !== 'idle') {
      log.dataset[SIG] = 'idle';
      log.replaceChildren(line('MODEM READY', 'dim'));
    }
    return;
  }
  // A skip shows every line at once; the handshake length is the full timeline.
  drawLog(log, modemLines(connect ? TIMING.handshakeMs : view.dialElapsedMs, connect));
}
