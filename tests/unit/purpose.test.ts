import { describe, expect, it } from 'vitest';
import {
  MSG_MEMO_TOO_LONG,
  MSG_PURPOSE_REQUIRED,
  MSG_PURPOSE_TOO_LONG,
  charCount,
  isStoredMemo,
  isStoredPurpose,
  validateMemo,
  validatePurpose,
} from '../../src/core/purpose';

const hangul = (n: number) => '가'.repeat(n);

describe('validatePurpose boundaries', () => {
  it('accepts 60 Hangul syllables and rejects 61', () => {
    expect(validatePurpose(hangul(60))).toEqual({ ok: true, purpose: hangul(60) });
    expect(validatePurpose(hangul(61))).toEqual({ ok: false, error: 'TOO_LONG' });
  });

  it('counts an emoji as one Character', () => {
    const text = '😀'.repeat(60);
    expect(text.length).toBe(120); // UTF-16 units
    expect(charCount(text)).toBe(60);
    expect(validatePurpose(text).ok).toBe(true);
    expect(validatePurpose(text + '😀')).toEqual({ ok: false, error: 'TOO_LONG' });
  });

  it('trims U+3000, NBSP, tabs, and newlines before counting', () => {
    expect(validatePurpose('\u3000\u00a0\t 강의 하나만 \n\u3000')).toEqual({ ok: true, purpose: '강의 하나만' });
    expect(validatePurpose(`\u3000${hangul(60)}\u3000`)).toEqual({ ok: true, purpose: hangul(60) });
  });

  it.each(['', '   ', '\u3000\u3000', '\t\n'])('rejects whitespace-only %j as EMPTY', (raw) => {
    expect(validatePurpose(raw)).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('accepts command words and digits as ordinary text', () => {
    for (const word of ['back', 'bye', 'help', '0', '4']) {
      expect(validatePurpose(word)).toEqual({ ok: true, purpose: word });
    }
  });

  it('uses the messages from the requirements', () => {
    expect(MSG_PURPOSE_REQUIRED).toBe('PURPOSE REQUIRED');
    expect(MSG_PURPOSE_TOO_LONG).toBe('PURPOSE TOO LONG - MAX 60 CHARS');
    expect(MSG_MEMO_TOO_LONG).toBe('MESSAGE TOO LONG - MAX 120 CHARS');
  });
});

describe('validateMemo boundaries', () => {
  it('accepts 120 Hangul syllables and rejects 121', () => {
    expect(validateMemo(hangul(120))).toEqual({ ok: true, memo: hangul(120) });
    expect(validateMemo(hangul(121))).toEqual({ ok: false });
  });

  it.each(['', '  ', '\u3000'])('treats empty %j as no Message', (raw) => {
    expect(validateMemo(raw)).toEqual({ ok: true, memo: null });
  });

  it('keeps the trimmed text', () => {
    expect(validateMemo('  다 봤으면 바로 끄자  ')).toEqual({ ok: true, memo: '다 봤으면 바로 끄자' });
  });
});

describe('stored text checks', () => {
  it('accepts trimmed text within the limit only', () => {
    expect(isStoredPurpose('강의')).toBe(true);
    expect(isStoredPurpose(' 강의')).toBe(false);
    expect(isStoredPurpose('')).toBe(false);
    expect(isStoredPurpose(hangul(61))).toBe(false);
    expect(isStoredPurpose(null)).toBe(false);
    expect(isStoredPurpose(42)).toBe(false);
    expect(isStoredMemo(hangul(120))).toBe(true);
    expect(isStoredMemo(hangul(121))).toBe(false);
    expect(isStoredMemo('note\u3000')).toBe(false);
  });
});
