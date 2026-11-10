// SET_PURPOSE: the Purpose_Screen and the Message_Screen (Requirements 1, 2, 3). Pure.
// No event here requests notification permission or opens a tab (Req 10.4, 10.5).
import {
  MSG_MEMO_TOO_LONG, MSG_PURPOSE_REQUIRED, MSG_PURPOSE_TOO_LONG, validateMemo, validatePurpose,
} from './purpose';
import { same, say, toDestMenu, type AppState, type Event, type StepResult } from './session-state';

export function intentStep(s: AppState, e: Event): StepResult {
  // TYPING only clears the message, which the dispatcher already did (Req 1.7).
  if (e.type === 'TYPING') return same(s);
  return s.textStep === 'purpose' ? purposeStep(s, e) : memoStep(s, e);
}

function purposeStep(s: AppState, e: Event): StepResult {
  if (e.type === 'BACK') return toDestMenu(s); // Req 3.3
  if (e.type !== 'PURPOSE_SUBMIT') return same(s);
  const r = validatePurpose(e.text);
  if (!r.ok) return say(s, r.error === 'EMPTY' ? MSG_PURPOSE_REQUIRED : MSG_PURPOSE_TOO_LONG); // Req 1.4, 1.5
  // Keep a Message written earlier, so going back and forth loses nothing (Req 3.4, 3.5).
  return same({ ...s, intent: { purpose: r.purpose, memo: s.intent?.memo ?? null }, textStep: 'memo' });
}

function memoStep(s: AppState, e: Event): StepResult {
  const purpose = s.intent?.purpose;
  if (!purpose) return same(s);
  if (e.type === 'BACK') return same({ ...s, textStep: 'purpose' }); // Req 3.4
  if (e.type !== 'MEMO_SUBMIT') return same(s);
  const r = validateMemo(e.text);
  if (!r.ok) return say(s, MSG_MEMO_TOO_LONG); // Req 2.5
  // Empty skips the Message (memo null) and still goes on (Req 2.3, 2.4).
  return same({
    ...s, phase: 'SELECT_DURATION', intent: { purpose, memo: r.memo }, confirm: null, pending: null,
  });
}
