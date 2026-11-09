// localStorage wrapper (Requirement 10). Every access is in try/catch; the app keeps
// working when storage is missing, blocked, or full.
import { parseHistory, serializeActive, serializeHistory, type ActiveSession, type SessionRecord } from '../core/record';
import type { HistoryStatus } from '../core/history';

export const HISTORY_KEY = 'blueline.history.v1';
export const ACTIVE_KEY = 'blueline.active.v1';

/** The Storage object, or null when it is missing or access itself throws (e.g. blocked cookies). */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Read the history: ok (possibly empty), reset (unreadable text), or unavailable. */
export function loadHistory(): HistoryStatus {
  const s = store();
  if (!s) return { kind: 'unavailable' };
  try {
    const text = s.getItem(HISTORY_KEY);
    if (text === null) return { kind: 'ok', records: [] };
    const parsed = parseHistory(text);
    return parsed.ok ? { kind: 'ok', records: parsed.records } : { kind: 'reset', records: [] };
  } catch {
    return { kind: 'unavailable' };
  }
}

export function saveHistory(records: readonly SessionRecord[]): boolean {
  return write(HISTORY_KEY, serializeHistory(records));
}

/** Stored Active_Session_State text, or null if none is stored or storage is unavailable. */
export function loadActive(): string | null {
  const s = store();
  if (!s) return null;
  try {
    return s.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActive(active: ActiveSession): boolean {
  return write(ACTIVE_KEY, serializeActive(active));
}

export function clearActive(): boolean {
  const s = store();
  if (!s) return false;
  try {
    s.removeItem(ACTIVE_KEY);
    return true;
  } catch {
    return false;
  }
}

function write(key: string, text: string): boolean {
  const s = store();
  if (!s) return false;
  try {
    s.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}
