// Shell: owns the one mutable AppState, reads the clock, runs effects, and drives timers.
// Lives outside src/core because it uses timers, Date.now(), and browser APIs.
import { DIAL_TEXT, TIMING } from '../core/config';
import { fee } from '../core/fee';
import { buildReceipt, keepReset, type HistoryStatus, type ReceiptModel } from '../core/history';
import { viewOf } from '../core/commands';
import { recover } from '../core/recover';
import { initialState, step, type AppState, type Effect, type Event } from '../core/session';
import { scheduledEnd } from '../core/session-end';
import { elapsedSeconds, remainingSeconds } from '../core/time';
import * as modem from '../audio/modem';
import * as page from '../platform/page';
import * as storage from '../platform/storage';
import type { Handlers, ViewModel } from '../screens/view';
import { runEffect, type EffectHost } from './effects';
import { createHauntTicker, refreshStored, unseen } from './ended';
import { createKeys } from './keys';

export interface Controller {
  state(): AppState;
  dispatch(e: Event): void;
  handlers: Handlers;
  /** Command_Prompt submit. Empty text runs the screen's Enter action. */
  submit(text: string): void;
  escape(): void;
  /** Render now (boot, resume) and arm screen timers. */
  refresh(): void;
  view(): ViewModel;
  /** True while the last 00:00 Session_Screen frame is held before NO CARRIER (Req 7.1). */
  finalFrame(): boolean;
}

type Timer = ReturnType<typeof setTimeout> | null;

export function createController(render: (c: Controller) => void): Controller {
  let state: AppState = initialState();
  const queue: Event[] = [];
  let busy = false;
  let dialStart = 0;
  let history: HistoryStatus | null = null;
  let stored: HistoryStatus | null = null;
  let receipt: ReceiptModel | null = null;
  let finalUntil = 0;
  let raf = 0;
  const t: Record<'handshake' | 'menu' | 'end' | 'final' | 'noCarrier', Timer> = {
    handshake: null, menu: null, end: null, final: null, noCarrier: null,
  };
  let tick: ReturnType<typeof setInterval> | null = null;

  const clear = (k: keyof typeof t) => { if (t[k]) clearTimeout(t[k]); t[k] = null; };
  const later = (k: keyof typeof t, ms: number, fn: () => void) => {
    clear(k);
    t[k] = setTimeout(() => { t[k] = null; fn(); }, Math.max(0, ms));
  };

  const host: EffectHost = {
    queue: (e) => { queue.push(e); },
    handshakeStarted: () => {
      dialStart = Date.now();
      // Runs whether or not audio started, so a silent dial still connects (Req 1.9).
      later('handshake', TIMING.handshakeMs + 50, () => dispatch({ type: 'HANDSHAKE_DONE' }));
    },
    historyWritten: (h) => { history = keepReset(history, h); stored = history; },
  };
  const run = (fx: Effect) => {
    try { runEffect(fx, host); } catch { /* one failing effect must not stop the flow (Req 13.2) */ }
  };

  // SEEN: the tab is visible and the user has not seen this ended Session yet (design Req 9.1).
  const see = () => { if (unseen(state) && page.isVisible()) dispatch({ type: 'SEEN', now: Date.now() }); };
  const tickHaunt = createHauntTicker(() => paint());

  function sync(prev: AppState, next: AppState): void {
    stored = refreshStored(prev, next, stored);
    tickHaunt(next);
    if (next.phase !== 'DIALING') { clear('handshake'); clear('menu'); }
    else if (next.dial.connectShown && !t.menu) later('menu', TIMING.connectToMenuMs, () => dispatch({ type: 'SHOW_MENU' }));
    if (next.phase === 'DIALING' && !next.dial.connectShown && !raf) startTyping();

    const wasId = prev.phase === 'CONNECTED' ? prev.session?.id : undefined;
    const isId = next.phase === 'CONNECTED' ? next.session?.id : undefined;
    if (isId !== wasId) {
      if (tick) clearInterval(tick);
      tick = null;
      clear('end');
      const s = next.session;
      if (isId !== undefined && s) {
        tick = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), TIMING.tickMs);
        later('end', scheduledEnd(s) - Date.now() + 5, () => dispatch({ type: 'TICK', now: Date.now() }));
      }
    }

    if (prev.phase === 'CONNECTED' && next.phase === 'ENDED' && next.ended?.record.reason === 'TIME UP' && page.isVisible()) {
      finalUntil = Date.now() + TIMING.finalFrameMs;
      later('final', TIMING.finalFrameMs, () => { see(); paint(); });
    } else if (next.phase === 'ENDED' && prev.phase !== 'ENDED') see();
    const prevView = prev.phase === 'ENDED' ? prev.ended?.view : undefined;
    const nextView = next.phase === 'ENDED' ? next.ended?.view : undefined;
    if (nextView !== 'nocarrier') clear('noCarrier');
    if (nextView === 'receipt' && prevView !== 'receipt' && next.ended) {
      receipt = buildReceipt(next.ended.record, history ?? { kind: 'unavailable' }, Date.now());
    }
    if (next.phase === 'IDLE' && prev.phase !== 'IDLE') { receipt = null; history = null; finalUntil = 0; }
  }

  // Render, then start the NO CARRIER → receipt timer once NO CARRIER is visible (core Req 7.5, 7.7, 7.9).
  // Only for a Session without a Purpose: with one, the screen waits for Y or N (Req 5.2, 5.9).
  function paint(): void {
    render(api);
    const showing = viewOf(state) === 'nocarrier' && state.ended?.seenAt != null && !finalFrame() && page.isVisible();
    if (!showing) clear('noCarrier');
    else if (!t.noCarrier) later('noCarrier', TIMING.noCarrierMs, () => handlers.noCarrierDone());
  }

  function startTyping(): void {
    const loop = () => {
      if (state.phase !== 'DIALING' || state.dial.connectShown) { raf = 0; return; }
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function dispatch(e: Event): void {
    queue.push(e);
    if (busy) return;
    busy = true;
    try {
      while (queue.length) {
        const prev = state;
        const r = step(state, queue.shift() as Event);
        state = r.state;
        r.effects.forEach(run);
        sync(prev, state);
      }
    } finally {
      busy = false;
    }
    paint();
  }

  const finalFrame = () => state.phase === 'ENDED' && state.ended?.view === 'nocarrier' && Date.now() < finalUntil;

  function view(): ViewModel {
    const now = Date.now();
    const s = state.session;
    const rec = state.phase === 'ENDED' ? state.ended?.record : undefined;
    const elapsed = rec ? rec.actualSec : s ? elapsedSeconds(s.start, now, s.plannedSec) : 0;
    return {
      dialTyped: dialStart ? Math.min(DIAL_TEXT.length, Math.floor((now - dialStart) / TIMING.charMs) + 1) : 0,
      elapsedSec: elapsed,
      remainingSec: rec ? rec.plannedSec - rec.actualSec : s ? remainingSeconds(s.start, now, s.plannedSec) : 0,
      fee: fee(elapsed),
      receipt,
      now,
      stored,
      dialElapsedMs: dialStart ? now - dialStart : 0,
      on: handlers,
    };
  }

  const handlers: Handlers = {
    dial: () => { modem.unlock(); dispatch({ type: state.phase === 'DIALING' ? 'DIAL_SKIP' : 'DIAL' }); },
    menu: (n) => { modem.unlock(); dispatch({ type: 'MENU_KEY', n }); },
    urlSubmit: (text) => dispatch({ type: 'URL_SUBMIT', text }),
    purposeSubmit: (text) => dispatch({ type: 'PURPOSE_SUBMIT', text }),
    memoSubmit: (text) => dispatch({ type: 'MEMO_SUBMIT', text }),
    // Typing only clears a shown message (Req 1.7); skip the dispatch when there is none.
    typing: () => { if (state.message !== null) dispatch({ type: 'TYPING' }); },
    back: () => dispatch({ type: 'BACK' }),
    confirm: () => { modem.unlock(); dispatch({ type: 'CONFIRM' }); },
    linkOpened: () => dispatch({ type: 'LINK_OPENED', now: Date.now() }),
    hangUp: () => dispatch({ type: 'HANG_UP', now: Date.now() }),
    noCarrierDone: () => dispatch({ type: 'NOCARRIER_DONE' }),
    faceIt: () => dispatch({ type: 'FACE_IT', now: Date.now() }),
    // Not during the held 00:00 frame, so the user has seen the question (Req 5.1).
    answer: (yes) => { if (!finalFrame()) dispatch({ type: 'ANSWER', yes }); },
    page: (dir) => dispatch({ type: 'BOARD_PAGE', dir }),
  };

  const keys = createKeys({ state: () => state, dispatch, handlers });

  // Coming back to the tab: stop flashing, re-check time-up, re-render (Req 6.9, 7.12, 7.13).
  page.onResume(() => {
    page.stopTitleFlash();
    if (state.phase === 'CONNECTED') dispatch({ type: 'TICK', now: Date.now() });
    else { see(); paint(); }
  });

  const api: Controller = {
    state: () => state, dispatch, handlers, submit: keys.submit, escape: keys.escape, view, finalFrame,
    refresh: () => paint(),
  };

  // Boot from storage (Req 11, 14.3).
  stored = storage.loadHistory();
  const boot = recover(storage.loadActive(), Date.now());
  const prev = state;
  state = boot.state;
  boot.effects.forEach(run);
  sync(prev, state);

  return api;
}
