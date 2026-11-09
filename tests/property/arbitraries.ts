// Shared fast-check generators for core property tests.
import fc from 'fast-check';
import { DURATIONS, FEE_RATE } from '../../src/core/config';
import { END_REASONS, LABELS, type SessionRecord } from '../../src/core/record';

/** 2020-01-01 .. 2035-01-01 in ms. */
export const timestamp = fc.integer({ min: 1_577_836_800_000, max: 2_051_222_400_000 });

export const planned = fc.constantFrom(...DURATIONS.map((d) => d.seconds));

/** A valid Session_Record (end ≥ start, fee a multiple of the rate). */
export const sessionRecord: fc.Arbitrary<SessionRecord> = fc
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

/** A record that ends at a given offset (ms, may be negative = in the future) before `now`. */
export function recordEndingAt(end: number, fee: number): SessionRecord {
  return { start: end - 60_000, end, plannedSec: 60, actualSec: 60, fee, reason: 'TIME UP', label: 'YOUTUBE' };
}
