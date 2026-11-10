// Command_Prompt parsing and per-screen command rules (Requirement 12). Pure.
import { DURATIONS, type Alias } from './config';
import type { AppState } from './session';

export type Command =
  | { kind: 'number'; n: number }
  | { kind: 'bye' }
  | { kind: 'back' }
  | { kind: 'help' }
  | { kind: 'go'; alias: Alias };

export type ParseResult =
  | { type: 'empty' }
  | { type: 'command'; command: Command }
  | { type: 'unknownDestination' }
  | { type: 'unknown' };

/** The screens. All but `purpose` and `memo` have a Command_Prompt; those two have a text field instead. */
export type ViewName =
  | 'dial' | 'destination' | 'urlEntry' | 'purpose' | 'memo' | 'duration' | 'confirm' | 'session'
  | 'nocarrier' | 'receipt';

/** Which screen the state shows; decides accepted commands and key handling. */
export function viewOf(state: AppState): ViewName {
  switch (state.phase) {
    case 'IDLE':
    case 'DIALING':
      return 'dial';
    case 'SELECT_DEST':
      return state.urlEntry ? 'urlEntry' : 'destination';
    case 'SET_PURPOSE':
      return state.textStep;
    case 'SELECT_DURATION':
      return state.confirm || state.pending ? 'confirm' : 'duration';
    case 'CONNECTED':
      return 'session';
    case 'ENDED':
      return state.ended?.view === 'receipt' ? 'receipt' : 'nocarrier';
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
      return ['1 - YOUTUBE', '2 - INSTAGRAM', '3 - CUSTOM URL', 'GO YT - YOUTUBE', 'GO IG - INSTAGRAM', HELP_LINE];
    case 'urlEntry':
      return ['ENTER - SUBMIT URL', 'BACK - DESTINATION MENU', HELP_LINE];
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
    case 'duration':
      return command.kind === 'number' || command.kind === 'back';
    case 'confirm':
      return command.kind === 'back' || (command.kind === 'number' && command.n === 0);
    case 'session':
      return command.kind === 'bye';
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
 */
export function resolveInput(view: ViewName, text: string): InputAction {
  const r = parseCommand(text);
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
