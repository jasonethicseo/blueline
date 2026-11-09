// Session_State_Machine (Requirement 14): a pure reducer that returns effects as data.
import { PRESETS, ALIASES, durationByKey, type Alias, type PresetLabel } from './config';
import { normalizeUrl } from './url';
import type { ActiveSession, Label, SessionRecord } from './record';
import { endSession, reasonAt, scheduledEnd } from './session-end';

export type Phase = 'IDLE' | 'DIALING' | 'SELECT_DEST' | 'SELECT_DURATION' | 'CONNECTED' | 'ENDED';

export interface Destination { label: Label; url: string }
export interface Session { id: number; start: number; plannedSec: number; label: Label }

export interface AppState {
  phase: Phase;
  seq: number;
  message: string | null;
  dial: { connectShown: boolean };
  urlEntry: boolean;
  /** Held in memory only; never stored (Req 10.1). */
  destination: Destination | null;
  confirm: { plannedSec: number } | null;
  pending: { plannedSec: number; blocked: boolean } | null;
  notifyAsked: boolean;
  session: Session | null;
  ended: { record: SessionRecord; view: 'nocarrier' | 'receipt' } | null;
}

export type Event =
  | { type: 'DIAL' } | { type: 'DIAL_SKIP' } | { type: 'HANDSHAKE_DONE' } | { type: 'SHOW_MENU' }
  | { type: 'MENU_KEY'; n: number } | { type: 'GO'; alias: Alias }
  | { type: 'URL_SUBMIT'; text: string } | { type: 'BACK' } | { type: 'CONFIRM' }
  | { type: 'OPENED'; now: number } | { type: 'POPUP_BLOCKED' } | { type: 'LINK_OPENED'; now: number }
  | { type: 'TICK'; now: number } | { type: 'HANG_UP'; now: number }
  | { type: 'NOCARRIER_DONE' } | { type: 'DIAL_AGAIN' }
  | { type: 'MESSAGE'; text: string | null };

export type Effect =
  | { type: 'playHandshake' } | { type: 'stopSound' } | { type: 'playNoCarrier' }
  | { type: 'openDestination'; url: string }
  | { type: 'requestNotifyPermission' }
  | { type: 'saveActive'; active: ActiveSession }
  | { type: 'clearActive' }
  | { type: 'endSession'; record: SessionRecord }
  | { type: 'notifyTimeUp' };

export interface StepResult { state: AppState; effects: Effect[] }

export const MSG_INVALID_SELECTION = 'INVALID SELECTION';
export const MSG_INVALID_URL = 'INVALID URL';
export const MSG_INVALID_SCHEME = 'INVALID URL - HTTP OR HTTPS ONLY';

export function initialState(seq = 0): AppState {
  return {
    phase: 'IDLE', seq, message: null, dial: { connectShown: false }, urlEntry: false,
    destination: null, confirm: null, pending: null, notifyAsked: false, session: null, ended: null,
  };
}

// User inputs clear the previous message before they are handled (Req 2.6, 4.5).
const USER_INPUTS = new Set<Event['type']>([
  'DIAL', 'DIAL_SKIP', 'MENU_KEY', 'GO', 'URL_SUBMIT', 'BACK', 'CONFIRM',
  'LINK_OPENED', 'HANG_UP', 'NOCARRIER_DONE', 'DIAL_AGAIN',
]);

const same = (state: AppState): StepResult => ({ state, effects: [] });
const say = (state: AppState, message: string): StepResult => ({ state: { ...state, message }, effects: [] });
const preset = (label: PresetLabel): Destination => ({ label, url: PRESETS[label] });
const toDuration = (s: AppState, destination: Destination): StepResult =>
  same({ ...s, phase: 'SELECT_DURATION', urlEntry: false, destination, confirm: null, pending: null });
const toDestMenu = (s: AppState): StepResult =>
  same({ ...s, phase: 'SELECT_DEST', urlEntry: false, destination: null, confirm: null, pending: null });

export function step(state: AppState, event: Event): StepResult {
  if (event.type === 'MESSAGE') return same({ ...state, message: event.text });
  const s = USER_INPUTS.has(event.type) && state.message !== null ? { ...state, message: null } : state;
  switch (s.phase) {
    case 'IDLE': return event.type === 'DIAL'
      ? { state: { ...s, phase: 'DIALING', dial: { connectShown: false } }, effects: [{ type: 'playHandshake' }] }
      : same(s);
    case 'DIALING': return dialing(s, event);
    case 'SELECT_DEST': return s.urlEntry ? urlEntry(s, event) : destinationMenu(s, event);
    case 'SELECT_DURATION': return s.pending ? connecting(s, event) : s.confirm ? confirmScreen(s, event) : durationMenu(s, event);
    case 'CONNECTED': return connected(s, event);
    case 'ENDED': return ended(s, event);
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
  if (e.type === 'GO') return toDuration(s, preset(ALIASES[e.alias]));
  if (e.type !== 'MENU_KEY') return same(s);
  if (e.n === 1) return toDuration(s, preset('YOUTUBE'));
  if (e.n === 2) return toDuration(s, preset('INSTAGRAM'));
  if (e.n === 3) return same({ ...s, urlEntry: true });
  return say(s, MSG_INVALID_SELECTION);
}

function urlEntry(s: AppState, e: Event): StepResult {
  if (e.type === 'BACK') return toDestMenu(s);
  if (e.type !== 'URL_SUBMIT') return same(s);
  if (e.text.trim().toLowerCase() === 'back') return toDestMenu(s);
  const r = normalizeUrl(e.text);
  if (r.ok) return toDuration(s, { label: 'CUSTOM', url: r.url });
  return say(s, r.error === 'SCHEME' ? MSG_INVALID_SCHEME : MSG_INVALID_URL);
}

function durationMenu(s: AppState, e: Event): StepResult {
  if (e.type === 'BACK' || (e.type === 'MENU_KEY' && e.n === 0)) return toDestMenu(s);
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
  if (!pending || !s.destination) return same(s);
  if (e.type === 'POPUP_BLOCKED' && !pending.blocked) return same({ ...s, pending: { ...pending, blocked: true } });
  const opened = e.type === 'OPENED' || (e.type === 'LINK_OPENED' && pending.blocked);
  if (!opened) return same(s);
  const session: Session = { id: s.seq + 1, start: e.now, plannedSec: pending.plannedSec, label: s.destination.label };
  return {
    state: {
      ...s, phase: 'CONNECTED', seq: session.id, session,
      destination: null, confirm: null, pending: null, urlEntry: false,
    },
    effects: [{ type: 'saveActive', active: { start: session.start, plannedSec: session.plannedSec, label: session.label } }],
  };
}

function connected(s: AppState, e: Event): StepResult {
  const session = s.session;
  if (!session) return same(s);
  if (e.type === 'TICK' && e.now >= scheduledEnd(session)) return endSession(s, session, 'TIME UP', e.now, true);
  if (e.type === 'HANG_UP') return endSession(s, session, reasonAt(session, 'HANG UP', e.now), e.now, true);
  return same(s);
}

function ended(s: AppState, e: Event): StepResult {
  const done = s.ended;
  if (!done) return same(s);
  if (done.view === 'nocarrier') {
    return e.type === 'NOCARRIER_DONE' ? same({ ...s, ended: { ...done, view: 'receipt' } }) : same(s);
  }
  if (e.type === 'DIAL_AGAIN' || (e.type === 'MENU_KEY' && e.n === 1)) return same(initialState(s.seq));
  if (e.type === 'MENU_KEY') return say(s, MSG_INVALID_SELECTION);
  return same(s);
}
