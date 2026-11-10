// Feature: blueline-purpose-board, Property 12: Board pages cover the history
// Runs in Asia/Seoul and again in America/New_York (DST) — see vitest.config.ts.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { BOARD_PAGE_SIZE, MAX_HISTORY, NO_PURPOSE, OUTCOME_LABEL, OUTCOME_SHORT } from '../../src/core/config';
import { boardPage, localDate, pageCount } from '../../src/core/board';
import { formatMMSS } from '../../src/core/time';
import type { SessionRecord } from '../../src/core/record';
import { storedHistory, timestamp } from './arbitraries';

// Reference local date, written independently of localDate's padding.
const ref = (ms: number) => new Date(ms).toLocaleDateString('sv-SE');

describe('Property 12: Board pages cover the history', () => {
  it('all pages together list every record once, newest first, at most 20 per page', () => {
    fc.assert(
      fc.property(storedHistory(MAX_HISTORY, 0, 'max'), (records) => {
        const pages = pageCount(records.length);
        expect(pages).toBe(Math.max(1, Math.ceil(records.length / BOARD_PAGE_SIZE)));
        const all = [];
        for (let p = 1; p <= pages; p++) {
          const view = boardPage(records, p);
          expect(view.page).toBe(p);
          expect(view.pages).toBe(pages);
          expect(view.rows.length).toBeLessThanOrEqual(BOARD_PAGE_SIZE);
          if (p < pages) expect(view.rows.length).toBe(BOARD_PAGE_SIZE);
          all.push(...view.rows);
        }
        // Every record once, in descending Post_Number order (Req 7.3, 7.4).
        expect(all.map((r) => r.no)).toEqual(records.map((r) => r.no).reverse());
        // Page 1 holds the 20 newest.
        expect(boardPage(records, 1).rows.map((r) => r.no)).toEqual(
          records.slice(-BOARD_PAGE_SIZE).map((r) => r.no).reverse(),
        );
        // Each row matches its record.
        const byNo = new Map(records.map((r) => [r.no, r] as const));
        for (const row of all) {
          const r = byNo.get(row.no) as SessionRecord;
          expect(row).toEqual({
            no: r.no, date: ref(r.end), purpose: r.purpose ?? NO_PURPOSE, time: formatMMSS(r.actualSec),
            outcome: OUTCOME_LABEL[r.outcome], mark: OUTCOME_SHORT[r.outcome],
          });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('pages outside 1..pages are clamped', () => {
    fc.assert(
      fc.property(storedHistory(80), fc.integer({ min: -5, max: 10 }), (records, p) => {
        const view = boardPage(records, p);
        expect(view.page).toBe(Math.min(Math.max(1, p), view.pages));
      }),
      { numRuns: 100 },
    );
  });

  it('localDate is the local calendar date of the timestamp', () => {
    fc.assert(
      fc.property(timestamp, (t) => {
        expect(localDate(t)).toBe(ref(t));
        expect(localDate(t)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }),
      { numRuns: 300 },
    );
  });
});
