// Shell helpers for ended Sessions: when the user has first seen one (SEEN), the snapshot of the
// stored history that the summaries use, and the once-a-second render while the line is haunted.
// Lives outside src/core because it reads storage and uses timers.
import { viewOf } from '../core/commands';
import type { HistoryStatus } from '../core/history';
import type { AppState } from '../core/session';
import * as storage from '../platform/storage';

const HAUNT_RENDER_MS = 1000;

/** An ended Session the user has not seen yet (SEEN not handled). */
export function unseen(state: AppState): boolean {
  return state.phase === 'ENDED' && state.ended !== null && state.ended.view === 'nocarrier' && state.ended.seenAt === null;
}

/**
 * The stored-history snapshot after a state change: read again on entering IDLE, SET_PURPOSE, and
 * CONNECTED (a new Session starts). Reading never writes (design Req 4.8).
 */
export function refreshStored(prev: AppState, next: AppState, current: HistoryStatus | null): HistoryStatus | null {
  const entering = (p: AppState['phase']) => next.phase === p && prev.phase !== p;
  return entering('IDLE') || entering('SET_PURPOSE') || entering('CONNECTED') ? storage.loadHistory() : current;
}

/** Re-render once a second while the Haunted_Screen shows; the drift comes from the clock, not from counting (Req 9.4). */
export function createHauntTicker(paint: () => void): (state: AppState) => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  return (state) => {
    const on = viewOf(state) === 'haunted';
    if (on && timer === null) timer = setInterval(paint, HAUNT_RENDER_MS);
    if (!on && timer !== null) { clearInterval(timer); timer = null; }
  };
}
