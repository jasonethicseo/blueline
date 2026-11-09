// Feature: blueline-core-flow, Property 12: History serialization round trip (updated to format v2)
// Feature: blueline-core-flow, Property 13: Unreadable history is rejected as a whole (v1 and v2)
// Feature: blueline-purpose-board, Property 6: Legacy history keeps its totals
// Feature: blueline-purpose-board, Property 7: v2 serialization round trip
// Feature: blueline-purpose-board, Property 8: Bad v2 records make the whole text unreadable
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { totals } from '../../src/core/history';
import { parseHistory, serializeHistory, type SessionRecord } from '../../src/core/record';
import { legacyRecord, storedHistory, timestamp, type LegacyRecord } from './arbitraries';

const CORE_FIELDS = ['start', 'end', 'plannedSec', 'actualSec', 'fee', 'reason', 'label'] as const;
const pickCore = (r: LegacyRecord | SessionRecord): LegacyRecord => {
  const { start, end, plannedSec, actualSec, fee, reason, label } = r;
  return { start, end, plannedSec, actualSec, fee, reason, label };
};
const v1Text = (records: unknown[]) => JSON.stringify({ v: 1, records });
const v2Text = (records: unknown[]) => JSON.stringify({ v: 2, records });

type Mutation = (r: Record<string, unknown>) => Record<string, unknown>;

/** Breaks one of the core fields; applies to v1 and v2 records alike (core Req 10.4). */
const coreMutation: fc.Arbitrary<Mutation> = fc.oneof(
  fc.constantFrom(...CORE_FIELDS).map((f): Mutation => (r) => {
    const copy = { ...r };
    delete copy[f];
    return copy;
  }),
  fc.string().filter((s) => s !== 'TIME UP' && s !== 'HANG UP').map((s): Mutation => (r) => ({ ...r, reason: s })),
  fc.string().filter((s) => !['YOUTUBE', 'INSTAGRAM', 'CUSTOM'].includes(s)).map((s): Mutation => (r) => ({ ...r, label: s })),
  fc.integer({ min: 1, max: 1_000_000 }).map((d): Mutation => (r) => ({ ...r, end: (r.start as number) - d })),
);

const badPurpose = fc.oneof(
  fc.constantFrom<unknown>('', ' ', ' 강의', '강의 ', '\u3000목적', '가'.repeat(61), 5, true, {}, []),
  fc.string({ minLength: 1 }).map((s) => ` ${s}`),
);
const badOutcome = fc.oneof(
  fc.constantFrom<unknown>('ACHIEVED', 'NOT ACHIEVED', 'done', 'Y', '', null, 0),
  fc.string().filter((s) => !['DONE', 'DRIFTED', 'NO ANSWER'].includes(s)),
);
const badNo = fc.constantFrom<unknown>(0, -1, 1.5, 2 ** 53, '3', null);

/** Breaks a v2-only field of one record (Req 8.6, 13.6). */
const v2Mutation: fc.Arbitrary<Mutation> = fc.oneof(
  fc.constantFrom('no', 'purpose', 'outcome').map((f): Mutation => (r) => {
    const copy = { ...r };
    delete copy[f];
    return copy;
  }),
  badPurpose.map((p): Mutation => (r) => ({ ...r, purpose: p })),
  badOutcome.map((o): Mutation => (r) => ({ ...r, outcome: o })),
  badNo.map((n): Mutation => (r) => ({ ...r, no: n })),
);

describe('Property 6: Legacy history keeps its totals', () => {
  it('reads v1 records with their core values, numbered 1..n, no Purpose, NO ANSWER, same totals', () => {
    fc.assert(
      fc.property(fc.array(legacyRecord, { maxLength: 1000, size: 'max' }), timestamp, (stored, now) => {
        const parsed = parseHistory(v1Text(stored));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.records.length).toBe(stored.length);
        parsed.records.forEach((r, i) => {
          expect(pickCore(r)).toEqual(stored[i]);
          expect(r.no).toBe(i + 1);
          expect(r.purpose).toBeNull();
          expect(r.outcome).toBe('NO ANSWER');
        });
        expect(totals(parsed.records, now)).toEqual(totals(stored, now));
        const sum = (rs: { actualSec: number }[]) => rs.reduce((a, r) => a + r.actualSec, 0);
        expect(sum(parsed.records)).toBe(sum(stored));
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 7 (and core Property 12): v2 serialization round trip', () => {
  it('parse(serialize(h)) returns the same records in the same order, Post_Numbers included', () => {
    fc.assert(
      fc.property(storedHistory(1000, 0, 'max'), (h) => {
        expect(parseHistory(serializeHistory(h))).toEqual({ ok: true, records: h });
      }),
      { numRuns: 100 },
    );
  });

  it('writing a parsed v1 history gives v2 text that reads back to the same records', () => {
    fc.assert(
      fc.property(fc.array(legacyRecord, { maxLength: 200 }), (stored) => {
        const first = parseHistory(v1Text(stored));
        if (!first.ok) throw new Error('v1 text should parse');
        const text = serializeHistory(first.records);
        expect(JSON.parse(text).v).toBe(2);
        expect(parseHistory(text)).toEqual({ ok: true, records: first.records });
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 8 (and core Property 13): unreadable history is rejected as a whole', () => {
  it('rejects v1 text when any one record breaks a core rule', () => {
    fc.assert(
      fc.property(fc.array(legacyRecord, { minLength: 1, maxLength: 50 }), fc.nat(), coreMutation, (h, i, mutate) => {
        const records: unknown[] = [...h];
        const at = i % h.length;
        records[at] = mutate({ ...(h[at] as LegacyRecord) });
        expect(parseHistory(v1Text(records))).toEqual({ ok: false });
      }),
      { numRuns: 300 },
    );
  });

  it('rejects v2 text when any one record has a bad core field, Purpose, Outcome, or Post_Number', () => {
    fc.assert(
      fc.property(
        storedHistory(50, 1),
        fc.nat(),
        fc.oneof(coreMutation, v2Mutation),
        (h, i, mutate) => {
          const records: unknown[] = [...h];
          const at = i % h.length;
          records[at] = mutate({ ...(h[at] as SessionRecord) });
          expect(parseHistory(v2Text(records))).toEqual({ ok: false });
        },
      ),
      { numRuns: 300 },
    );
  });

  it('rejects v2 text whose Post_Numbers do not increase strictly', () => {
    fc.assert(
      fc.property(storedHistory(50, 2), fc.nat(), fc.integer({ min: 0, max: 3 }), (h, i, back) => {
        const at = 1 + (i % (h.length - 1));
        const prev = h[at - 1] as SessionRecord;
        const records = h.map((r, j) => (j === at ? { ...r, no: Math.max(1, prev.no - back) } : r));
        expect(parseHistory(v2Text(records))).toEqual({ ok: false });
      }),
      { numRuns: 200 },
    );
  });

  it('rejects malformed JSON and wrong shapes', () => {
    for (const text of ['', 'not json', '[]', '{"v":3,"records":[]}', '{"v":2}', '{"v":1,"records":{}}', 'null']) {
      expect(parseHistory(text)).toEqual({ ok: false });
    }
  });
});
