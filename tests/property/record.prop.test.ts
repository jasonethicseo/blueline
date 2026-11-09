// Feature: blueline-core-flow, Property 12: History serialization round trip
// Feature: blueline-core-flow, Property 13: Unreadable history is rejected as a whole
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseHistory, serializeHistory, type SessionRecord } from '../../src/core/record';
import { sessionRecord } from './arbitraries';

const history = fc.array(sessionRecord, { maxLength: 1000 });

describe('Property 12: History serialization round trip', () => {
  it('parse(serialize(h)) returns the same records in the same order', () => {
    fc.assert(
      fc.property(history, (h) => {
        expect(parseHistory(serializeHistory(h))).toEqual({ ok: true, records: h });
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 13: Unreadable history is rejected as a whole', () => {
  const fields: (keyof SessionRecord)[] = ['start', 'end', 'plannedSec', 'actualSec', 'fee', 'reason', 'label'];
  type Mutation = (r: SessionRecord) => Record<string, unknown>;
  const mutations: fc.Arbitrary<Mutation> = fc.oneof(
    fc.constantFrom(...fields).map((f): Mutation => (r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy[f];
      return copy;
    }),
    fc.string().filter((s) => s !== 'TIME UP' && s !== 'HANG UP').map((s): Mutation => (r) => ({ ...r, reason: s })),
    fc.string().filter((s) => !['YOUTUBE', 'INSTAGRAM', 'CUSTOM'].includes(s)).map((s): Mutation => (r) => ({ ...r, label: s })),
    fc.integer({ min: 1, max: 1_000_000 }).map((d): Mutation => (r) => ({ ...r, end: r.start - d })),
  );

  it('rejects the whole text when any one record is broken', () => {
    fc.assert(
      fc.property(fc.array(sessionRecord, { minLength: 1, maxLength: 50 }), fc.nat(), mutations, (h, i, mutate) => {
        const records: unknown[] = [...h];
        const at = i % h.length;
        records[at] = mutate(h[at] as SessionRecord);
        expect(parseHistory(JSON.stringify({ v: 1, records }))).toEqual({ ok: false });
      }),
      { numRuns: 300 },
    );
  });

  it('rejects malformed JSON and wrong shapes', () => {
    for (const text of ['', 'not json', '[]', '{"v":2,"records":[]}', '{"v":1}', '{"v":1,"records":{}}', 'null']) {
      expect(parseHistory(text)).toEqual({ ok: false });
    }
  });
});
