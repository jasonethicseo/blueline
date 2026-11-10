// Ending a Session: the Session_Record and the ENDED state (Req 7.6, 8.3, 9.1). Pure.
import { fee } from './fee';
import { elapsedSeconds } from './time';
import type { EndReason, NewRecord } from './record';
import type { AppState, Effect, Session, StepResult } from './session-state';

/** Wall-clock ms at which the Session reaches its Planned_Duration. */
export function scheduledEnd(session: Session): number {
  return session.start + session.plannedSec * 1000;
}

/**
 * The record for a Session that ends now.
 * TIME UP always uses the scheduled end, even if detected late (Req 7.6).
 * HANG UP uses the elapsed whole seconds; `end` is derived from them so end ≥ start (Req 8.3).
 * Every record starts as NO ANSWER, so leaving before the Purpose check keeps that (Req 5.5).
 * The Purpose comes from the Session (null only for a Session recovered from a legacy state).
 */
export function endRecord(session: Session, reason: EndReason, now: number): NewRecord {
  const { start, plannedSec, label, purpose } = session;
  const actualSec = reason === 'TIME UP' ? plannedSec : elapsedSeconds(start, now, plannedSec);
  return {
    start,
    end: start + actualSec * 1000,
    plannedSec,
    actualSec,
    fee: fee(actualSec),
    reason,
    label,
    purpose,
    outcome: 'NO ANSWER',
  };
}

/** HANG UP at or after the scheduled end is a TIME UP: Time_Up has already occurred (Req 7.10). */
export function reasonAt(session: Session, requested: EndReason, now: number): EndReason {
  return now >= scheduledEnd(session) ? 'TIME UP' : requested;
}

/**
 * Move to ENDED with the NO CARRIER view. Effects run in this order: write the record and clear
 * the active session, play the sound, then (time-up only, when asked) notify (Req 8.6, 9.1, 10.9).
 */
export function endSession(
  state: AppState,
  session: Session,
  reason: EndReason,
  now: number,
  notify: boolean,
): StepResult {
  const record = endRecord(session, reason, now);
  const effects: Effect[] = [{ type: 'endSession', record }, { type: 'playNoCarrier' }];
  if (notify && reason === 'TIME UP') effects.push({ type: 'notifyTimeUp' });
  // The Message moves from the Session to the NO CARRIER view; storage loses it with the
  // active state in the endSession effect (Req 4.1, 4.4).
  return {
    state: {
      ...state, phase: 'ENDED', message: null, session: { ...session, memo: null },
      ended: { record, view: 'nocarrier', memo: session.memo, seenAt: null, shownAt: null },
    },
    effects,
  };
}
