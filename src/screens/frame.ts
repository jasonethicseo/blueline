// The Screen_Frame text for every screen: theme, Status_Bar, Function_Key_Bar (design Requirement 2).
// Pure: it describes the bars; main.ts draws them. Neither bar ever holds the Purpose or the Message (Req 2.2).
import type { ViewName } from '../core/commands';
import { boardPage, boardRecords } from '../core/board';
import { FEE_RATE } from '../core/config';
import { formatWon } from '../core/display';
import type { AppState } from '../core/session';

export type Theme = 'blue' | 'black' | 'haunted';
export type Key = readonly [key: string, label: string];

export interface Frame {
  theme: Theme;
  /** Status_Bar items, left to right: app and version, context, fee rate (not on black screens), line status. */
  status: string[];
  /** The last status item is the green `● ON LINE` badge. */
  online: boolean;
  keys: Key[];
  hint?: string;
}

const HELP: Key = ['HELP', '도움말 (HELP)'];
const OFF = 'OFF LINE';
const NOT_YET = 'CONNECTED · NOT ON LINE YET';
const HANGUL_HINT = '한글 입력 중 Enter는 제출되지 않음 (ENTER WHILE COMPOSING HANGUL DOES NOT SUBMIT)';
const SESSION_HINT = '이 탭은 열어 두세요 · 시간이 되면 회선이 끊깁니다 (KEEP THIS TAB OPEN · THE LINE DROPS AT TIME UP)';
const NO_ANSWER_HINT = '답하지 않고 떠나면 NO ANSWER로 기록됩니다 (LEAVE WITHOUT ANSWERING = NO ANSWER)';

const fee = `FEE ${formatWon(FEE_RATE)}/MIN (FICTIONAL)`;

/** What the bars show for `view`. `state` supplies the destination, the Board page, and the dial progress. */
export function frameFor(view: ViewName, state: AppState): Frame {
  const app = `BLUELINE ${__APP_VERSION__}`;
  const label = state.destination?.label ?? state.session?.label ?? '';
  const blue = (context: string, line: string, keys: Key[], hint?: string): Frame => {
    const f: Frame = { theme: 'blue', status: [app, context, fee, line], online: false, keys };
    return hint === undefined ? f : { ...f, hint };
  };

  switch (view) {
    case 'dial': {
      const dialing = state.phase === 'DIALING' && !state.dial.connectShown;
      return blue('COM1 · 2400 BPS · 8N1', dialing ? 'DIALING...' : OFF, [['ENTER', 'DIAL'], HELP]);
    }
    case 'destination':
      return blue('MAIN MENU', NOT_YET, [['1-4', 'SELECT'], ['GO YT/IG', 'QUICK'], HELP]);
    case 'urlEntry':
      return blue('ENTER URL', NOT_YET, [['ENTER', 'SUBMIT'], ['BACK', 'MENU'], HELP]);
    case 'board': {
      const h = state.board?.history ?? null;
      const p = h ? boardPage(boardRecords(h), state.board?.page ?? 1) : null;
      const context = p ? `BOARD · PAGE ${p.page}/${p.pages}` : 'BOARD';
      return blue(context, NOT_YET, [['N', 'OLDER'], ['P', 'NEWER'], ['0/ESC', 'BACK'], HELP]);
    }
    case 'purpose':
    case 'memo':
      return blue(`DESTINATION: ${label}`, NOT_YET, [['ENTER', 'NEXT'], ['ESC', 'BACK']], HANGUL_HINT);
    case 'duration':
      return blue(`DESTINATION: ${label}`, NOT_YET, [['1-5', 'DURATION'], ['0', 'BACK'], HELP]);
    case 'confirm':
      return blue('CONNECT?', NOT_YET, state.pending
        ? [['ENTER', 'OPEN LINK'], HELP]
        : [['ENTER', 'CONNECT'], ['0/ESC', 'BACK'], HELP]);
    case 'session':
      return {
        theme: 'blue', status: [app, `DESTINATION: ${label} (OPENED IN NEW TAB)`, fee, '● ON LINE'], online: true,
        keys: [['ESC', 'HANG UP'], ['BYE', 'HANG UP'], HELP], hint: SESSION_HINT,
      };
    case 'nocarrierCheck':
      return {
        theme: 'black', status: [app, 'NO CARRIER', OFF], online: false,
        keys: [['Y', 'DONE'], ['N', 'DRIFTED'], HELP], hint: NO_ANSWER_HINT,
      };
    case 'nocarrier':
      return { theme: 'black', status: [app, 'NO CARRIER', OFF], online: false, keys: [['ENTER', 'RECEIPT'], HELP] };
    case 'haunted':
      return {
        theme: 'haunted', status: [app, 'LINE STATUS: UNSTABLE', '░▒▓ SIGNAL ▓▒░'], online: false,
        keys: [['ENTER', 'FACE IT'], HELP],
      };
    case 'receipt':
      return blue('RECEIPT', OFF, [['1', 'DIAL AGAIN'], HELP]);
  }
}
