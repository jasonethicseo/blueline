// Command_Prompt parsing and per-screen command rules (core Requirement 12; Req 5.3–5.6). Pure.
import { DURATIONS, type Alias } from './config';
import { MSG_PRESS_Y_OR_N, type AppState } from './session-state';

export type Command =
  | { kind: 'number'; n: number }
  | { kind: 'bye' }
  | { kind: 'back' }
  | { kind: 'help' }
  | { kind: 'go'; alias: Alias }
  /** A one-word answer; accepted only where a screen asks for it (Req 5.3, 5.4). */
  | { kind: 'word'; word: Word };

export type Word = 'y' | 'yes' | 'n' | 'no' | 'p';
const WORDS: readonly Word[] = ['y', 'yes', 'n', 'no', 'p'];
/** The words that answer PURPOSE ACHIEVED? (Req 5.3, 5.4). */
export const ANSWER_WORDS: readonly Word[] = ['y', 'yes', 'n', 'no'];
/** The words that page the Board: N next (older), P prev (newer) (Req 7.5, 7.6). */
export const PAGE_WORDS: readonly Word[] = ['n', 'p'];

export type ParseResult =
  | { type: 'empty' }
  | { type: 'command'; command: Command }
  | { type: 'unknownDestination' }
  | { type: 'unknown' };

/**
 * The screens. All but `purpose` and `memo` have a Command_Prompt; those two have a text field instead.
 * `nocarrierCheck` is the NO_CARRIER_Screen of a Session with a Purpose, which asks PURPOSE ACHIEVED?;
 * `nocarrier` is the one for a Session without a Purpose (Req 5.1, 5.9).
 */
export type ViewName =
  | 'dial' | 'destination' | 'urlEntry' | 'board' | 'purpose' | 'memo' | 'duration' | 'confirm' | 'session'
  | 'nocarrier' | 'nocarrierCheck' | 'receipt';

/** Which screen the state shows; decides accepted commands and key handling. */
export function viewOf(state: AppState): ViewName {
  switch (state.phase) {
    case 'IDLE':
    case 'DIALING':
      return 'dial';
    case 'SELECT_DEST':
      if (state.board) return 'board';
      return state.urlEntry ? 'urlEntry' : 'destination';
    case 'SET_PURPOSE':
      return state.textStep;
    case 'SELECT_DURATION':
      return state.confirm || state.pending ? 'confirm' : 'duration';
    case 'CONNECTED':
      return 'session';
    case 'ENDED':
      if (state.ended?.view === 'receipt') return 'receipt';
      return state.ended?.record.purpose ? 'nocarrierCheck' : 'nocarrier';
  }
}

export const MSG_UNKNOWN = 'UNKNOWN COMMAND - TYPE HELP';
export const MSG_UNKNOWN_DESTINATION = 'UNKNOWN DESTINATION - TYPE HELP';
export const MSG_NOT_AVAILABLE = 'COMMAND NOT AVAILABLE HERE - TYPE HELP';

/** Trim, ignore letter case, and match the text to one Command (Req 12.2). */
export function parseCommand(text: string): ParseResult {
  const t = text.trim().toLowerCase();
  if (t === '') return { type: 'empty' };
  if (/^[0-9]$/.test(t)) return { type: 'command', command: { kind: 'number', n: Number(t) } };
  if (t === 'bye' || t === 'back' || t === 'help') return { type: 'command', command: { kind: t } };
  if (WORDS.includes(t as Word)) return { type: 'command', command: { kind: 'word', word: t as Word } };
  if (/^go(\s|$)/.test(t)) {
    const m = /^go\s+(yt|ig)$/.exec(t);
    return m ? { type: 'command', command: { kind: 'go', alias: m[1] as Alias } } : { type: 'unknownDestination' };
  }
  return { type: 'unknown' };
}

const HELP_LINE = 'HELP - SHOW COMMANDS';

/** `help` output for a screen: one Command per line, numbers matching the menu (Req 12.4). */
export function acceptedCommands(view: ViewName): string[] {
  switch (view) {
    case 'dial':
      return ['ENTER - DIAL (SKIP WHILE DIALING)', HELP_LINE];
    case 'destination':
      return [
        '1 - YOUTUBE', '2 - INSTAGRAM', '3 - CUSTOM URL', '4 - BOARD', 'GO YT - YOUTUBE', 'GO IG - INSTAGRAM', HELP_LINE,
      ];
    case 'urlEntry':
      return ['ENTER - SUBMIT URL', 'BACK - DESTINATION MENU', HELP_LINE];
    case 'board':
      return [
        'N - NEXT (OLDER) PAGE', 'P - PREV (NEWER) PAGE', '0 - BACK', 'ESC - BACK', 'BACK - MAIN MENU', HELP_LINE,
      ];
    // No Command_Prompt on these screens, so `help` cannot be typed there; listed for completeness.
    case 'purpose':
      return ['ENTER - SUBMIT PURPOSE', 'ESC - BACK (MAIN MENU)'];
    case 'memo':
      return ['ENTER - SUBMIT MESSAGE (EMPTY TO SKIP)', 'ESC - BACK (PURPOSE)'];
    case 'duration':
      return [...DURATIONS.map((d) => `${d.key} - ${d.label}`), '0 - BACK (MESSAGE)', 'BACK - MESSAGE SCREEN', HELP_LINE];
    case 'confirm':
      return ['ENTER - CONNECT', '0 - BACK', 'ESC - BACK', 'BACK - DURATION MENU', HELP_LINE];
    case 'session':
      return ['BYE - HANG UP', 'ESC - HANG UP', HELP_LINE];
    case 'nocarrier':
      return ['ENTER - SHOW RECEIPT', HELP_LINE];
    case 'nocarrierCheck':
      return ['Y - YES (DONE)', 'N - NO (DRIFTED)', HELP_LINE];
    case 'receipt':
      return ['1 - DIAL AGAIN', HELP_LINE];
  }
}

/** Whether a parsed Command is accepted on a screen (Req 12.5, 12.11, 12.16). */
export function isAccepted(view: ViewName, command: Command): boolean {
  if (command.kind === 'help') return true;
  switch (view) {
    case 'destination':
      return command.kind === 'number' || command.kind === 'go';
    case 'urlEntry':
      return command.kind === 'back';
    case 'board':
      return command.kind === 'number' || command.kind === 'back'
        || (command.kind === 'word' && PAGE_WORDS.includes(command.word));
    case 'duration':
      return command.kind === 'number' || command.kind === 'back';
    case 'confirm':
      return command.kind === 'back' || (command.kind === 'number' && command.n === 0);
    case 'session':
      return command.kind === 'bye';
    case 'nocarrierCheck':
      return command.kind === 'word' && ANSWER_WORDS.includes(command.word);
    case 'receipt':
      return command.kind === 'number';
    case 'dial':
    case 'purpose':
    case 'memo':
    case 'nocarrier':
      return false;
  }
}

export type InputAction =
  | { kind: 'none' }
  | { kind: 'message'; text: string }
  | { kind: 'help'; lines: string[] }
  | { kind: 'command'; command: Command };

/**
 * What the shell should do with submitted Command_Prompt text on a screen.
 * `none` for empty text: the shell may treat Enter as the screen's default action.
 * While NO CARRIER asks PURPOSE ACHIEVED?, everything but an answer or `help`, empty Enter
 * included, shows PRESS Y OR N (Req 5.6).
 */
export function resolveInput(view: ViewName, text: string): InputAction {
  const r = parseCommand(text);
  if (view === 'nocarrierCheck') {
    if (r.type === 'command' && r.command.kind === 'help') return { kind: 'help', lines: acceptedCommands(view) };
    if (r.type === 'command' && isAccepted(view, r.command)) return { kind: 'command', command: r.command };
    return { kind: 'message', text: MSG_PRESS_Y_OR_N };
  }
  switch (r.type) {
    case 'empty':
      return { kind: 'none' };
    case 'unknown':
      return { kind: 'message', text: MSG_UNKNOWN };
    case 'unknownDestination':
      return { kind: 'message', text: view === 'destination' ? MSG_UNKNOWN_DESTINATION : MSG_NOT_AVAILABLE };
    case 'command':
      if (r.command.kind === 'help') return { kind: 'help', lines: acceptedCommands(view) };
      if (!isAccepted(view, r.command)) return { kind: 'message', text: MSG_NOT_AVAILABLE };
      return { kind: 'command', command: r.command };
  }
}
