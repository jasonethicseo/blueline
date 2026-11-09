// Elapsed / remaining time and MM:SS formatting. `now` is always passed in.

/**
 * Whole seconds between `start` and `now` (ms timestamps), rounded down and
 * limited to 0..plannedSec. A clock earlier than `start` gives 0.
 */
export function elapsedSeconds(start: number, now: number, plannedSec: number): number {
  const raw = Math.floor((now - start) / 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, plannedSec);
}

/** plannedSec minus elapsedSeconds; never below 0. */
export function remainingSeconds(start: number, now: number, plannedSec: number): number {
  return plannedSec - elapsedSeconds(start, now, plannedSec);
}

/** Format whole seconds (0..1800) as "MM:SS". Negative or fractional input is floored at 0. */
export function formatMMSS(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const MMSS = /^(\d{2,}):([0-5]\d)$/;

/** Parse "MM:SS" back to whole seconds; null if the text is not in that form. */
export function parseMMSS(text: string): number | null {
  const m = MMSS.exec(text);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
