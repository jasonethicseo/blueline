// ENDED: the Haunted_Screen (a late return to a Time_Up), the NO_CARRIER_Screen with the Message
// and the Purpose check, then the Receipt_Screen (Requirements 4, 5, 10.3; core Requirements 7.7,
// 9.9, 9.11; design Requirement 9). Pure.
// Views only move forward: nocarrier → haunted → nocarrier → receipt. `SEEN` is the moment the user
// first sees the ended Session; it decides haunted or not, once. With a Purpose, only an answer leaves
// NO CARRIER; without one (a Session recovered from a legacy state), NOCARRIER_DONE does.
import { shouldHaunt } from './haunt';
import {
  MSG_INVALID_SELECTION, MSG_PRESS_Y_OR_N, initialState, same, say,
  type AppState, type Event, type StepResult,
} from './session-state';

export function endedStep(s: AppState, e: Event): StepResult {
  const done = s.ended;
  if (!done) return same(s);

  if (done.view === 'haunted') {
    // Only FACE_IT leaves; the fee, the record, and the Message are untouched (Req 9.9, 9.10).
    return e.type === 'FACE_IT' ? same({ ...s, ended: { ...done, view: 'nocarrier', shownAt: e.now } }) : same(s);
  }

  if (done.view === 'nocarrier') {
    // The first SEEN decides; later ones do nothing, so the Haunted_Screen appears at most once (Req 9.10).
    if (e.type === 'SEEN') {
      if (done.seenAt !== null) return same(s);
      return shouldHaunt(done.record, e.now)
        ? same({ ...s, ended: { ...done, view: 'haunted', seenAt: e.now } })
        : same({ ...s, ended: { ...done, seenAt: e.now, shownAt: e.now } });
    }
    const asks = done.record.purpose !== null;
    if (asks) {
      if (e.type === 'ANSWER') {
        const outcome = e.yes ? 'DONE' : 'DRIFTED';
        return {
          // Leaving NO CARRIER drops the Message, so nothing can show it again (Req 4.5, 5.12).
          state: { ...s, ended: { ...done, record: { ...done.record, outcome }, view: 'receipt', memo: null } },
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
  // A late ANSWER, TICK, SEEN, or HANG_UP changes nothing (Req 5.7, core Req 8.7).
  return same(s);
}
