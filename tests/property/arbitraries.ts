// Shared fast-check generators for core property tests.
import fc from 'fast-check';
import { DURATIONS, FEE_RATE, MAX_PURPOSE } from '../../src/core/config';
import { END_REASONS, LABELS, OUTCOMES, type NewRecord, type SessionRecord } from '../../src/core/record';

/** 2020-01-01 .. 2035-01-01 in ms. */
export const timestamp = fc.integer({ min: 1_577_836_800_000, max: 2_051_222_400_000 });

export const planned = fc.constantFrom(...DURATIONS.map((d) => d.seconds));

/** The seven fields of a format v1 record (end ≥ start, fee a multiple of the rate). */
export type LegacyRecord = Omit<NewRecord, 'purpose' | 'outcome'>;

export const legacyRecord: fc.Arbitrary<LegacyRecord> = fc
  .tuple(timestamp, planned, fc.nat(), fc.constantFrom(...END_REASONS), fc.constantFrom(...LABELS))
  .map(([start, plannedSec, n, reason, label]) => {
    const actualSec = reason === 'TIME UP' ? plannedSec : n % (plannedSec + 1);
    return {
      start,
      end: start + actualSec * 1000,
      plannedSec,
      actualSec,
      fee: Math.ceil(actualSec / 60) * FEE_RATE,
      reason,
      label,
    };
  });

const PIECES = ['가', '힣', '목', 'a', 'Z', '0', '-', '?', '😀', 'é'];

/** A valid stored Purpose: 1 to 60 Characters, inner spaces allowed, none at the ends. */
export const purpose: fc.Arbitrary<string> = fc
  .array(fc.tuple(fc.constantFrom(...PIECES), fc.boolean()), { minLength: 1, maxLength: MAX_PURPOSE / 2 })
  .map((parts) => parts.map(([c, gap], i) => (gap && i > 0 ? ` ${c}` : c)).join(''));

export const outcome = fc.constantFrom(...OUTCOMES);

/** A record as `endRecord` makes it, before it has a Post_Number. */
export const newRecord: fc.Arbitrary<NewRecord> = fc
  .tuple(legacyRecord, fc.option(purpose, { nil: null }), outcome)
  .map(([core, p, o]) => ({ ...core, purpose: p, outcome: o }));

/** Kept for the core-flow tests: any valid record shape without a Post_Number. */
export const sessionRecord = newRecord;

/**
 * A valid stored history: Post_Numbers strictly increase (gaps allowed, as after removals).
 * Pass `size: 'max'` to really reach `maxLength`; fast-check's default size keeps arrays short.
 */
export function storedHistory(maxLength: number, minLength = 0, size?: fc.SizeForArbitrary): fc.Arbitrary<SessionRecord[]> {
  return fc
    .tuple(
      fc.integer({ min: 1, max: 5000 }),
      fc.array(fc.tuple(newRecord, fc.integer({ min: 1, max: 3 })), { minLength, maxLength, size }),
    )
    .map(([first, items]) => {
      let no = first - 1;
      return items.map(([r, step]) => {
        no += step;
        return { no, ...r };
      });
    });
}

/** A record that ends at `end` with the given fee (other fields fixed). */
export function recordEndingAt(end: number, fee: number): NewRecord {
  return {
    start: end - 60_000, end, plannedSec: 60, actualSec: 60, fee,
    reason: 'TIME UP', label: 'YOUTUBE', purpose: null, outcome: 'NO ANSWER',
  };
}
