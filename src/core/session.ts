// Session_State_Machine (core Requirement 14, purpose-board Requirement 10): a pure reducer
// that returns effects as data. Types and shared helpers live in session-state.ts.
import { PRESETS, ALIASES, durationByKey, type PresetLabel } from './config';
import { normalizeUrl } from './url';
import { endSession, reasonAt, scheduledEnd } from './session-end';
import { boardStep } from './board';
import { endedStep } from './session-ended';
import { intentStep } from './session-intent';
import {
  MSG_INVALID_SCHEME, MSG_INVALID_SELECTION, MSG_INVALID_URL, same, say, toDestMenu,
  type AppState, type Destination, type Event, type Session, type StepResult,
} from './session-state';

export * from './session-state';

// User inputs clear the previous message before they are handled (core Req 2.6, 4.5; Req 1.7).
const USER_INPUTS = new Set<Event['type']>([
  'DIAL', 'DIAL_SKIP', 'MENU_KEY', 'GO', 'URL_SUBMIT', 'BACK', 'CONFIRM',
  'PURPOSE_SUBMIT', 'MEMO_SUBMIT', 'TYPING', 'ANSWER', 'BOARD_PAGE',
  'LINK_OPENED', 'HANG_UP', 'NOCARRIER_DONE', 'DIAL_AGAIN', 'FACE_IT',
]);

const preset = (label: PresetLabel): Destination => ({ label, url: PRESETS[label] });

/** A Destination was selected: ask for the Purpose next, with nothing written yet (Req 1.1). */
const toPurpose = (s: AppState, destination: Destination): StepResult =>
  same({
    ...s, phase: 'SET_PURPOSE', textStep: 'purpose', urlEntry: false, destination, intent: null,
    confirm: null, pending: null,
  });

export function step(state: AppState, event: Event): StepResult {
  if (event.type === 'MESSAGE') return same({ ...state, message: event.text });
  const s = USER_INPUTS.has(event.type) && state.message !== null ? { ...state, message: null } : state;
  switch (s.phase) {
    case 'IDLE': return event.type === 'DIAL'
      ? { state: { ...s, phase: 'DIALING', dial: { connectShown: false } }, effects: [{ type: 'playHandshake' }] }
      : same(s);
    case 'DIALING': return dialing(s, event);
    case 'SELECT_DEST': return s.urlEntry ? urlEntry(s, event) : destinationMenu(s, event);
    case 'SET_PURPOSE': return intentStep(s, event);
    case 'SELECT_DURATION': return s.pending ? connecting(s, event) : s.confirm ? confirmScreen(s, event) : durationMenu(s, event);
    case 'CONNECTED': return connected(s, event);
    case 'ENDED': return endedStep(s, event);
  }
}

function dialing(s: AppState, e: Event): StepResult {
  const shown = s.dial.connectShown;
  if ((e.type === 'DIAL' || e.type === 'DIAL_SKIP') && !shown) {
    return { state: { ...s, dial: { connectShown: true } }, effects: [{ type: 'stopSound' }] };
  }
  if (e.type === 'HANDSHAKE_DONE' && !shown) return same({ ...s, dial: { connectShown: true } });
  if (e.type === 'SHOW_MENU' && shown) return toDestMenu({ ...s, phase: 'SELECT_DEST' });
  return same(s);
}

function destinationMenu(s: AppState, e: Event): StepResult {
  if (s.board) return boardStep(s, e);
  if (e.type === 'GO') return toPurpose(s, preset(ALIASES[e.alias]));
  if (e.type !== 'MENU_KEY') return same(s);
  if (e.n === 1) return toPurpose(s, preset('YOUTUBE'));
  if (e.n === 2) return toPurpose(s, preset('INSTAGRAM'));
  if (e.n === 3) return same({ ...s, urlEntry: true });
  // The Board reads the stored history through an effect, so this reducer stays pure (Req 7.2).
  if (e.n === 4) return { state: { ...s, board: { page: 1, history: null } }, effects: [{ type: 'loadBoard' }] };
  return say(s, MSG_INVALID_SELECTION);
}

function urlEntry(s: AppState, e: Event): StepResult {
  if (e.type === 'BACK') return toDestMenu(s);
  if (e.type !== 'URL_SUBMIT') return same(s);
  if (e.text.trim().toLowerCase() === 'back') return toDestMenu(s);
  const r = normalizeUrl(e.text);
  if (r.ok) return toPurpose(s, { label: 'CUSTOM', url: r.url });
  return say(s, r.error === 'SCHEME' ? MSG_INVALID_SCHEME : MSG_INVALID_URL);
}

function durationMenu(s: AppState, e: Event): StepResult {
  // Back goes to the Message_Screen with the Message written earlier (Req 3.5).
  if (e.type === 'BACK' || (e.type === 'MENU_KEY' && e.n === 0)) {
    return same({ ...s, phase: 'SET_PURPOSE', textStep: 'memo', confirm: null, pending: null });
  }
  if (e.type !== 'MENU_KEY') return same(s);
  const d = durationByKey(e.n);
  if (!d) return say(s, MSG_INVALID_SELECTION);
  const next = { ...s, confirm: { plannedSec: d.seconds }, notifyAsked: true };
  return { state: next, effects: s.notifyAsked ? [] : [{ type: 'requestNotifyPermission' }] };
}

function confirmScreen(s: AppState, e: Event): StepResult {
  const confirm = s.confirm;
  if (!confirm || !s.destination) return same(s);
  if (e.type === 'BACK' || (e.type === 'MENU_KEY' && e.n === 0)) return same({ ...s, confirm: null });
  if (e.type !== 'CONFIRM') return same(s);
  return {
    state: { ...s, pending: { plannedSec: confirm.plannedSec, blocked: false } },
    effects: [{ type: 'openDestination', url: s.destination.url }],
  };
}

function connecting(s: AppState, e: Event): StepResult {
  const pending = s.pending;
  const purpose = s.intent?.purpose;
  if (!pending || !s.destination || !purpose) return same(s);
  if (e.type === 'POPUP_BLOCKED' && !pending.blocked) return same({ ...s, pending: { ...pending, blocked: true } });
  const opened = e.type === 'OPENED' || (e.type === 'LINK_OPENED' && pending.blocked);
  if (!opened) return same(s);
  const memo = s.intent?.memo ?? null;
  const session: Session = {
    id: s.seq + 1, start: e.now, plannedSec: pending.plannedSec, label: s.destination.label, purpose, memo,
  };
  return {
    state: {
      ...s, phase: 'CONNECTED', seq: session.id, session,
      destination: null, intent: null, confirm: null, pending: null, urlEntry: false,
    },
    // The Purpose and the Message are written with the core fields before the Session_Screen (Req 9.1).
    effects: [{
      type: 'saveActive',
      active: { start: session.start, plannedSec: session.plannedSec, label: session.label, purpose, memo },
    }],
  };
}

function connected(s: AppState, e: Event): StepResult {
  const session = s.session;
  if (!session) return same(s);
  if (e.type === 'TICK' && e.now >= scheduledEnd(session)) return endSession(s, session, 'TIME UP', e.now, true);
  if (e.type === 'HANG_UP') return endSession(s, session, reasonAt(session, 'HANG UP', e.now), e.now, true);
  return same(s);
}
