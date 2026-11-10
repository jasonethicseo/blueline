// localStorage wrapper (Requirement 10). Every access is in try/catch; the app keeps
// working when storage is missing, blocked, or full.
import { parseHistory, serializeActive, serializeHistory, type ActiveSession, type SessionRecord } from '../core/record';
import type { HistoryStatus } from '../core/history';

/** Written by this build (format v2). */
export const HISTORY_KEY = 'blueline.history.v2';
/** Written before the purpose-board feature. Read only when HISTORY_KEY is missing; never written or removed. */
export const LEGACY_HISTORY_KEY = 'blueline.history.v1';
/** Written by this build (format v2, with the Purpose and the Message). */
export const ACTIVE_KEY = 'blueline.active.v2';
/** Read only when ACTIVE_KEY is missing; removed with ACTIVE_KEY when a Session ends, so it is never recovered twice. */
export const LEGACY_ACTIVE_KEY = 'blueline.active.v1';

/** The Storage object, or null when it is missing or access itself throws (e.g. blocked cookies). */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Read the history: ok (possibly empty), reset (unreadable text), or unavailable.
 * The v2 key wins; the v1 key is read only when no v2 text exists. An unreadable v2 text is
 * a reset, with no fallback to v1 (Req 8.7, core 10.6).
 */
export function loadHistory(): HistoryStatus {
  const s = store();
  if (!s) return { kind: 'unavailable' };
  try {
    const text = s.getItem(HISTORY_KEY) ?? s.getItem(LEGACY_HISTORY_KEY);
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

/** Stored Active_Session_State text (v2 key first, then v1), or null if none or storage is unavailable. */
export function loadActive(): string | null {
  const s = store();
  if (!s) return null;
  try {
    return s.getItem(ACTIVE_KEY) ?? s.getItem(LEGACY_ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActive(active: ActiveSession): boolean {
  return write(ACTIVE_KEY, serializeActive(active));
}

/** Remove both active keys. True only if both removals succeeded. */
export function clearActive(): boolean {
  const s = store();
  if (!s) return false;
  let ok = true;
  for (const key of [ACTIVE_KEY, LEGACY_ACTIVE_KEY]) {
    try {
      s.removeItem(key);
    } catch {
      ok = false;
    }
  }
  return ok;
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
