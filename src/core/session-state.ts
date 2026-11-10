// Session_State_Machine types and small state helpers shared by the reducer files
// (session.ts, session-intent.ts, session-end.ts). Pure. Keeping them here means the
// reducer files import from this module and never from each other, so there is no cycle.
import type { Alias } from './config';
import type { HistoryStatus } from './history';
import type { ActiveSession, Label, NewRecord, Outcome } from './record';

export const MSG_INVALID_SELECTION = 'INVALID SELECTION';
export const MSG_INVALID_URL = 'INVALID URL';
export const MSG_INVALID_SCHEME = 'INVALID URL - HTTP OR HTTPS ONLY';
/** Any input other than an answer while NO CARRIER asks PURPOSE ACHIEVED? (Req 5.6). */
export const MSG_PRESS_Y_OR_N = 'PRESS Y OR N';
/** Any input other than Enter on the Haunted_Screen (design Req 9.9). */
export const MSG_PRESS_ENTER_FACE_IT = 'PRESS ENTER TO FACE IT';

export type Phase = 'IDLE' | 'DIALING' | 'SELECT_DEST' | 'SET_PURPOSE' | 'SELECT_DURATION' | 'CONNECTED' | 'ENDED';

export interface Destination { label: Label; url: string }

/** A Session in progress. `purpose` is null only when recovered from a legacy active state. */
export interface Session {
  id: number;
  start: number;
  plannedSec: number;
  label: Label;
  purpose: string | null;
  memo: string | null;
}

/** What the user wrote on the Purpose_Screen and the Message_Screen, before connecting. */
export interface Intent { purpose: string | null; memo: string | null }

/** The Board_Screen (SELECT_DEST only). `history` is null until the stored history has been read. */
export interface Board { page: number; history: HistoryStatus | null }

export interface AppState {
  phase: Phase;
  seq: number;
  message: string | null;
  dial: { connectShown: boolean };
  urlEntry: boolean;
  /** Held in memory only; never stored (core Req 10.1). */
  destination: Destination | null;
  /** SET_PURPOSE and SELECT_DURATION; cleared on the Destination_Menu and at connect (Req 1.8). */
  intent: Intent | null;
  /** Which field SET_PURPOSE shows. */
  textStep: 'purpose' | 'memo';
  /** Non-null while the Board_Screen is shown (Req 7). */
  board: Board | null;
  confirm: { plannedSec: number } | null;
  pending: { plannedSec: number; blocked: boolean } | null;
  notifyAsked: boolean;
  session: Session | null;
  /**
   * ENDED only. `memo` is the Session's Message while NO CARRIER shows it; it is set to null
   * when NO CARRIER is left, and nothing else holds it, so it is shown at most once (Req 4.5).
   * `seenAt` is when the user first saw the ended Session (null until `SEEN`); `shownAt` is when
   * NO CARRIER was first shown (null while haunted or unseen). Neither is stored.
   */
  ended: {
    record: NewRecord;
    view: 'haunted' | 'nocarrier' | 'receipt';
    memo: string | null;
    seenAt: number | null;
    shownAt: number | null;
  } | null;
}

export type Event =
  | { type: 'DIAL' } | { type: 'DIAL_SKIP' } | { type: 'HANDSHAKE_DONE' } | { type: 'SHOW_MENU' }
  | { type: 'MENU_KEY'; n: number } | { type: 'GO'; alias: Alias }
  | { type: 'URL_SUBMIT'; text: string } | { type: 'BACK' } | { type: 'CONFIRM' }
  | { type: 'PURPOSE_SUBMIT'; text: string } | { type: 'MEMO_SUBMIT'; text: string } | { type: 'TYPING' }
  | { type: 'OPENED'; now: number } | { type: 'POPUP_BLOCKED' } | { type: 'LINK_OPENED'; now: number }
  | { type: 'TICK'; now: number } | { type: 'HANG_UP'; now: number }
  | { type: 'NOCARRIER_DONE' } | { type: 'ANSWER'; yes: boolean } | { type: 'DIAL_AGAIN' }
  | { type: 'BOARD_LOADED'; history: HistoryStatus } | { type: 'BOARD_PAGE'; dir: 'next' | 'prev' }
  | { type: 'MESSAGE'; text: string | null }
  /** The user first sees an ended Session (the tab is visible, resumed, or reloaded). Not a user input. */
  | { type: 'SEEN'; now: number }
  /** Enter on the Haunted_Screen. */
  | { type: 'FACE_IT'; now: number };

export type Effect =
  | { type: 'playHandshake' } | { type: 'stopSound' } | { type: 'playNoCarrier' }
  | { type: 'openDestination'; url: string }
  | { type: 'requestNotifyPermission' }
  | { type: 'saveActive'; active: ActiveSession }
  | { type: 'clearActive' }
  | { type: 'endSession'; record: NewRecord }
  /** Write the answered Outcome into the stored record with this start (Req 5.3, 5.4, 8.9). */
  | { type: 'saveOutcome'; start: number; outcome: Outcome }
  /** Read the stored history for the Board; the shell answers with BOARD_LOADED (Req 7.2, 7.11). */
  | { type: 'loadBoard' }
  | { type: 'notifyTimeUp' };

export interface StepResult { state: AppState; effects: Effect[] }

export function initialState(seq = 0): AppState {
  return {
    phase: 'IDLE', seq, message: null, dial: { connectShown: false }, urlEntry: false,
    destination: null, intent: null, textStep: 'purpose', board: null, confirm: null, pending: null,
    notifyAsked: false, session: null, ended: null,
  };
}

export const same = (state: AppState): StepResult => ({ state, effects: [] });
export const say = (state: AppState, message: string): StepResult => ({ state: { ...state, message }, effects: [] });

/** Back to the Destination_Menu: no Destination, no Purpose, no Message, no Board (core Req 2.7, Req 1.8, 3.3, 7.7). */
export const toDestMenu = (s: AppState): StepResult =>
  same({
    ...s, phase: 'SELECT_DEST', urlEntry: false, destination: null, intent: null, textStep: 'purpose',
    board: null, confirm: null, pending: null,
  });
