// Feature: blueline-core-flow, Property 2: MM:SS format round trip
// Feature: blueline-core-flow, Property 3: Elapsed and remaining are clamped
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { elapsedSeconds, formatMMSS, parseMMSS, remainingSeconds } from '../../src/core/time';
import { DURATIONS, MAX_PLANNED_SECONDS } from '../../src/core/config';

describe('Property 2: MM:SS format round trip', () => {
  it('formats as two-digit MM:SS with no minus sign and parses back', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_PLANNED_SECONDS }), (s) => {
        const text = formatMMSS(s);
        expect(text).toMatch(/^\d{2}:\d{2}$/);
        expect(text).not.toContain('-');
        expect(parseMMSS(text)).toBe(s);
      }),
      { numRuns: 200 },
    );
  });

  it('matches the documented examples', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(75)).toBe('01:15');
    expect(formatMMSS(1800)).toBe('30:00');
  });
});

describe('Property 3: Elapsed and remaining are clamped', () => {
  const start = fc.integer({ min: 0, max: 4_000_000_000_000 });
  // From well before start (clock moved back) to well past the longest session.
  const delta = fc.integer({ min: -10_000_000, max: 4_000_000 });
  const planned = fc.constantFrom(...DURATIONS.map((d) => d.seconds));

  it('keeps elapsed in 0..planned and remaining = planned − elapsed', () => {
    fc.assert(
      fc.property(start, delta, planned, (s, d, p) => {
        const now = s + d;
        const e = elapsedSeconds(s, now, p);
        expect(Number.isInteger(e)).toBe(true);
        expect(e).toBeGreaterThanOrEqual(0);
        expect(e).toBeLessThanOrEqual(p);
        expect(remainingSeconds(s, now, p)).toBe(p - e);
        if (d < 0) expect(e).toBe(0);
        if (d >= p * 1000) expect(e).toBe(p);
        if (d >= 0 && d < p * 1000) expect(e).toBe(Math.floor(d / 1000));
      }),
      { numRuns: 300 },
    );
  });
});
