// Purpose and Message (memo) validation (Requirements 1, 2, 8.6, 9.5). Pure.
// Lengths are counted in Unicode code points after `trim()`, which also removes
// U+3000 (ideographic space) and NBSP.
import { MAX_MEMO, MAX_PURPOSE } from './config';

export const MSG_PURPOSE_REQUIRED = 'PURPOSE REQUIRED';
export const MSG_PURPOSE_TOO_LONG = `PURPOSE TOO LONG - MAX ${MAX_PURPOSE} CHARS`;
export const MSG_MEMO_TOO_LONG = `MESSAGE TOO LONG - MAX ${MAX_MEMO} CHARS`;

/** Number of Characters (code points): one Hangul syllable, letter, space, or emoji each count as 1. */
export function charCount(text: string): number {
  return [...text].length;
}

export type PurposeResult = { ok: true; purpose: string } | { ok: false; error: 'EMPTY' | 'TOO_LONG' };

/** Accept the trimmed text when it is 1 to 60 Characters long (Req 1.2–1.6). */
export function validatePurpose(raw: string): PurposeResult {
  const purpose = raw.trim();
  const n = charCount(purpose);
  if (n === 0) return { ok: false, error: 'EMPTY' };
  if (n > MAX_PURPOSE) return { ok: false, error: 'TOO_LONG' };
  return { ok: true, purpose };
}

export type MemoResult = { ok: true; memo: string | null } | { ok: false };

/** Empty after trimming skips the Message (null); 1 to 120 Characters is kept; longer is rejected (Req 2.2–2.5). */
export function validateMemo(raw: string): MemoResult {
  const memo = raw.trim();
  const n = charCount(memo);
  if (n === 0) return { ok: true, memo: null };
  if (n > MAX_MEMO) return { ok: false };
  return { ok: true, memo };
}

function isStoredText(v: unknown, max: number): v is string {
  if (typeof v !== 'string' || v !== v.trim()) return false;
  const n = charCount(v);
  return n >= 1 && n <= max;
}

/** A stored Purpose: a string of 1 to 60 Characters with no leading or trailing whitespace (Req 8.6, 9.5). */
export function isStoredPurpose(v: unknown): v is string {
  return isStoredText(v, MAX_PURPOSE);
}

/** A stored Message: a string of 1 to 120 Characters with no leading or trailing whitespace (Req 9.5). */
export function isStoredMemo(v: unknown): v is string {
  return isStoredText(v, MAX_MEMO);
}
