// ENDED: the NO_CARRIER_Screen with the Message and the Purpose check, then the Receipt_Screen
// (Requirements 4, 5, 10.3; core Requirements 7.7, 9.9, 9.11). Pure.
// Views only move forward: nocarrier → receipt. With a Purpose, only an answer leaves NO CARRIER;
// without one (a Session recovered from a legacy state), NOCARRIER_DONE does, as in the core spec.
import {
  MSG_INVALID_SELECTION, MSG_PRESS_Y_OR_N, initialState, same, say,
  type AppState, type Event, type StepResult,
} from './session-state';

export function endedStep(s: AppState, e: Event): StepResult {
  const done = s.ended;
  if (!done) return same(s);

  if (done.view === 'nocarrier') {
    const asks = done.record.purpose !== null;
    if (asks) {
      if (e.type === 'ANSWER') {
        const outcome = e.yes ? 'DONE' : 'DRIFTED';
        return {
          // Leaving NO CARRIER drops the Message, so nothing can show it again (Req 4.5, 5.12).
          state: { ...s, ended: { record: { ...done.record, outcome }, view: 'receipt', memo: null } },
          effects: [{ type: 'saveOutcome', start: done.record.start, outcome }],
        };
      }
      // No timer, Enter, or tap moves on while the question waits (Req 5.2).
      if (e.type === 'MENU_KEY') return say(s, MSG_PRESS_Y_OR_N); // Req 5.6
      return same(s);
    }
    // No Purpose: no question, the core move-on rule, and NO ANSWER is kept (Req 5.9).
    return e.type === 'NOCARRIER_DONE' ? same({ ...s, ended: { ...done, view: 'receipt', memo: null } }) : same(s);
  }

  if (e.type === 'DIAL_AGAIN' || (e.type === 'MENU_KEY' && e.n === 1)) return same(initialState(s.seq));
  if (e.type === 'MENU_KEY') return say(s, MSG_INVALID_SELECTION);
  // A late ANSWER, TICK, or HANG_UP changes nothing (Req 5.7, core Req 8.7).
  return same(s);
}
