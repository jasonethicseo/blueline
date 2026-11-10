// Session recovery after a reload of the BLUELINE tab (core Requirement 11, 14.3; Req 9). Pure.
import { parseActive } from './record';
import { endSession, scheduledEnd } from './session-end';
import { initialState, type Session, type StepResult } from './session-state';

/**
 * Decide the starting state from the stored Active_Session_State text.
 * - nothing stored → IDLE
 * - unreadable, or a start later than now → IDLE and clear it (Req 11.5)
 * - not yet expired → CONNECTED with the stored values; no new tab (Req 11.1, 11.2)
 * - expired → ENDED with a TIME UP record at the scheduled end (Req 11.3, 11.4)
 */
export function recover(storedText: string | null, now: number, seq = 0): StepResult {
  const base = initialState(seq);
  if (storedText === null) return { state: base, effects: [] };

  const active = parseActive(storedText);
  if (!active || active.start > now) return { state: base, effects: [{ type: 'clearActive' }] };

  // The stored Purpose and Message come back with the Session (Req 9.2); null for a v1 state (Req 9.4).
  const session: Session = {
    id: seq + 1, start: active.start, plannedSec: active.plannedSec, label: active.label,
    purpose: active.purpose, memo: active.memo,
  };
  const connected = { ...base, phase: 'CONNECTED' as const, seq: session.id, session };
  if (now < scheduledEnd(session)) return { state: connected, effects: [] };

  // The user is looking at the tab, so no notification (only the NO CARRIER screen and sound).
  return endSession(connected, session, 'TIME UP', now, false);
}
