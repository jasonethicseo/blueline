// Feature: blueline-purpose-board, Property 1: Purpose validation
// Feature: blueline-purpose-board, Property 2: Message validation
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_MEMO, MAX_PURPOSE } from '../../src/core/config';
import { isStoredMemo, isStoredPurpose, validateMemo, validatePurpose } from '../../src/core/purpose';

// Reference code-point count, written independently of the implementation's spread.
const codePoints = (s: string): number => (s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) ?? []).length;

const VISIBLE = ['a', 'Z', '0', '9', '-', '?', '가', '힣', '목', '😀', '👍', 'é'];
const SPACE = [' ', '\t', '\n', '\u3000', '\u00a0'];

const visible = fc.constantFrom(...VISIBLE);
const text = (max: number) =>
  fc.array(fc.constantFrom(...VISIBLE, ...SPACE), { maxLength: max }).map((a) => a.join(''));
const padding = fc.array(fc.constantFrom(...SPACE), { maxLength: 4 }).map((a) => a.join(''));

/** k visible Characters, with whitespace allowed inside, wrapped in random whitespace. */
const padded = (maxK: number) =>
  fc
    .tuple(fc.integer({ min: 0, max: maxK }), padding, padding)
    .chain(([k, left, right]) =>
      fc.array(fc.tuple(visible, fc.boolean()), { minLength: k, maxLength: k }).map((parts) => {
        // Inner spaces go only between visible Characters, so the trimmed length is known.
        const core = parts.map(([c, gap], i) => (gap && i > 0 ? ` ${c}` : c)).join('');
        return { raw: left + core + right, core };
      }),
    );

describe('Property 1: Purpose validation', () => {
  it('accepts exactly when the trimmed text is 1 to 60 Characters, and returns the trimmed text', () => {
    fc.assert(
      fc.property(fc.oneof(text(80), fc.string({ maxLength: 80 })), (raw) => {
        const trimmed = raw.trim();
        const n = codePoints(trimmed);
        const r = validatePurpose(raw);
        if (n === 0) expect(r).toEqual({ ok: false, error: 'EMPTY' });
        else if (n > MAX_PURPOSE) expect(r).toEqual({ ok: false, error: 'TOO_LONG' });
        else expect(r).toEqual({ ok: true, purpose: trimmed });
      }),
      { numRuns: 300 },
    );
  });

  it('decides by the trimmed Character count at the boundary, whatever the padding', () => {
    fc.assert(
      fc.property(padded(MAX_PURPOSE + 10), ({ raw, core }) => {
        const n = codePoints(core);
        const r = validatePurpose(raw);
        expect(r.ok).toBe(n >= 1 && n <= MAX_PURPOSE);
        if (r.ok) {
          expect(r.purpose).toBe(core);
          expect(isStoredPurpose(r.purpose)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('Property 2: Message validation', () => {
  it('skips empty, keeps 1 to 120 Characters trimmed, and rejects longer text', () => {
    fc.assert(
      fc.property(fc.oneof(text(140), fc.string({ maxLength: 140 })), (raw) => {
        const trimmed = raw.trim();
        const n = codePoints(trimmed);
        const r = validateMemo(raw);
        if (n === 0) expect(r).toEqual({ ok: true, memo: null });
        else if (n > MAX_MEMO) expect(r).toEqual({ ok: false });
        else expect(r).toEqual({ ok: true, memo: trimmed });
      }),
      { numRuns: 300 },
    );
  });

  it('decides by the trimmed Character count at the boundary, whatever the padding', () => {
    fc.assert(
      fc.property(padded(MAX_MEMO + 10), ({ raw, core }) => {
        const n = codePoints(core);
        const r = validateMemo(raw);
        expect(r.ok).toBe(n <= MAX_MEMO);
        if (r.ok) {
          expect(r.memo).toBe(n === 0 ? null : core);
          if (r.memo !== null) expect(isStoredMemo(r.memo)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });
});
