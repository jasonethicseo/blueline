// Text for the redesigned screens: Progress_Bar, number formats, Modem_Log, Character_Counter. Pure.
import { CONNECT_TEXT, DIAL_TEXT, MODEM_LOG, PROGRESS_CELLS, TIMING } from './config';
import { charCount } from './purpose';
import { formatMMSS } from './time';

/** `▓` cells for the elapsed share of the Planned_Duration: floor(20 × e / p), 0..20. */
export function progressCells(elapsedSec: number, plannedSec: number): number {
  if (!(plannedSec > 0) || !(elapsedSec > 0)) return 0;
  return Math.min(PROGRESS_CELLS, Math.max(0, Math.floor((PROGRESS_CELLS * elapsedSec) / plannedSec)));
}

/** Exactly 20 characters: `cells` of `▓`, the rest `░`. */
export function progressBar(cells: number): string {
  const n = Math.min(PROGRESS_CELLS, Math.max(0, Math.trunc(cells) || 0));
  return '▓'.repeat(n) + '░'.repeat(PROGRESS_CELLS - n);
}

/** `₩1,840`: whole fee units with a comma every three digits. */
export function formatWon(n: number): string {
  const whole = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return `₩${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** MM:SS, held at 99:59 for longer times. */
export function formatClock(sec: number): string {
  return formatMMSS(Math.min(sec, 99 * 60 + 59));
}

export interface ModemLine {
  text: string;
  /** `cmd` (we send), `ok` (the modem's OK), `resp` (other answers), `connect` (green, last). */
  cls: 'cmd' | 'ok' | 'resp' | 'connect';
}

/**
 * The Modem_Log lines visible `elapsedMs` after the Dial_Sequence started. The ATDT line is typed one
 * character at a time. `connectShown` adds `CONNECT 2400` last, once the handshake has ended.
 */
export function modemLines(elapsedMs: number, connectShown: boolean): ModemLine[] {
  const lines: ModemLine[] = [];
  for (const entry of MODEM_LOG) {
    if (elapsedMs < entry.at) break;
    const typed = Math.floor((elapsedMs - entry.at) / TIMING.charMs) + 1;
    const isCommand = entry.text.startsWith('AT');
    // Only the dialed number is typed; the other lines appear whole.
    const text = entry.text === DIAL_TEXT ? entry.text.slice(0, typed) : entry.text;
    lines.push({ text, cls: isCommand ? 'cmd' : text === 'OK' ? 'ok' : 'resp' });
  }
  if (connectShown) lines.push({ text: CONNECT_TEXT, cls: 'connect' });
  return lines;
}

/** `12/60`; `over` is true when the trimmed text is longer than `max` Characters. */
export function charCounter(text: string, max: number): { text: string; over: boolean } {
  const n = charCount(text.trim());
  return { text: `${n}/${max}`, over: n > max };
}
