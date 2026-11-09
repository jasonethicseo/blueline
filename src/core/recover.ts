// Session recovery after a reload of the BLUELINE tab (Requirement 11, 14.3). Pure.
import { parseActive } from './record';
import { initialState, type Session, type StepResult } from './session';
import { endSession, scheduledEnd } from './session-end';

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

  const session: Session = { id: seq + 1, start: active.start, plannedSec: active.plannedSec, label: active.label };
  const connected = { ...base, phase: 'CONNECTED' as const, seq: session.id, session };
  if (now < scheduledEnd(session)) return { state: connected, effects: [] };

  // The user is looking at the tab, so no notification (only the NO CARRIER screen and sound).
  return endSession(connected, session, 'TIME UP', now, false);
}
