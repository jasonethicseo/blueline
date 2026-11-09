// Feature: blueline-core-flow, Property 1: Fee formula and laws
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fee } from '../../src/core/fee';
import { FEE_RATE, MAX_PLANNED_SECONDS } from '../../src/core/config';

const seconds = fc.integer({ min: 0, max: MAX_PLANNED_SECONDS });

describe('Property 1: Fee formula and laws', () => {
  it('equals ceil(t / 60) × rate, is non-negative and a multiple of the rate', () => {
    fc.assert(
      fc.property(seconds, (t) => {
        const f = fee(t);
        expect(f).toBe(Math.ceil(t / 60) * FEE_RATE);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f % FEE_RATE).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it('is non-decreasing as elapsed time grows', () => {
    fc.assert(
      fc.property(seconds, seconds, (a, b) => {
        const [t1, t2] = a <= b ? [a, b] : [b, a];
        expect(fee(t1)).toBeLessThanOrEqual(fee(t2));
      }),
      { numRuns: 200 },
    );
  });

  it('is zero at zero', () => {
    expect(fee(0)).toBe(0);
  });
});
