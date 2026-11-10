// Feature: blueline-design, Property 5: Progress_Bar
// Feature: blueline-design, Property 7: Number formats
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PROGRESS_CELLS } from '../../src/core/config';
import { formatClock, formatWon, progressBar, progressCells } from '../../src/core/display';
import { parseMMSS } from '../../src/core/time';
import { planned } from './arbitraries';

describe('Property 5: Progress_Bar', () => {
  it('cells are floor(20 × e / p) in 0..20, never decrease, and the bar has 20 characters', () => {
    fc.assert(
      fc.property(planned, fc.nat({ max: 2000 }), fc.nat({ max: 2000 }), (p, a, b) => {
        const [e1, e2] = a <= b ? [a, b] : [b, a];
        const c1 = progressCells(e1, p);
        const c2 = progressCells(e2, p);
        expect(c1).toBeGreaterThanOrEqual(0);
        expect(c2).toBeLessThanOrEqual(PROGRESS_CELLS);
        expect(c1).toBeLessThanOrEqual(c2);
        if (e2 <= p) expect(c2).toBe(Math.floor((20 * e2) / p));
        const bar = progressBar(c2);
        expect([...bar]).toHaveLength(PROGRESS_CELLS);
        expect([...bar].filter((ch) => ch === '▓')).toHaveLength(c2);
        expect([...bar].filter((ch) => ch === '░')).toHaveLength(PROGRESS_CELLS - c2);
      }),
      { numRuns: 300 },
    );
  });
});

describe('Property 7: Number formats', () => {
  it('formatWon puts commas every three digits and gives n back without them', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10_000_000 }), (n) => {
        const text = formatWon(n);
        expect(text.startsWith('₩')).toBe(true);
        expect(text.slice(1)).toMatch(/^\d{1,3}(,\d{3})*$/);
        expect(Number(text.slice(1).replaceAll(',', ''))).toBe(n);
      }),
      { numRuns: 300 },
    );
  });

  it('formatClock is MM:SS up to 5999 s and 99:59 above, and parses back', () => {
    fc.assert(
      fc.property(fc.nat({ max: 20_000 }), (s) => {
        const text = formatClock(s);
        expect(text).toMatch(/^\d{2}:[0-5]\d$/);
        expect(parseMMSS(text)).toBe(Math.min(s, 5999));
      }),
      { numRuns: 300 },
    );
  });
});
