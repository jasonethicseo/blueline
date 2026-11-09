import { afterEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_KEY, LEGACY_HISTORY_KEY, loadHistory, saveHistory } from '../../src/platform/storage';
import type { SessionRecord } from '../../src/core/record';

/** A Map-backed stand-in for window.localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const removes: string[] = [];
  const s = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { writes.push(k); data.set(k, v); },
    removeItem: (k: string) => { removes.push(k); data.delete(k); },
  };
  vi.stubGlobal('localStorage', s);
  return { data, writes, removes };
}

const legacy = {
  start: 1_794_200_000_000, end: 1_794_200_060_000, plannedSec: 60, actualSec: 60,
  fee: 40, reason: 'TIME UP', label: 'YOUTUBE',
};
const record: SessionRecord = {
  no: 7, ...legacy, reason: 'HANG UP', label: 'CUSTOM', purpose: '강의 하나만', outcome: 'DONE',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('history storage keys', () => {
  it('uses the v2 and v1 key names from the design', () => {
    expect(HISTORY_KEY).toBe('blueline.history.v2');
    expect(LEGACY_HISTORY_KEY).toBe('blueline.history.v1');
  });

  it('prefers the v2 key over the v1 key', () => {
    fakeStorage({
      [HISTORY_KEY]: JSON.stringify({ v: 2, records: [record] }),
      [LEGACY_HISTORY_KEY]: JSON.stringify({ v: 1, records: [legacy, legacy] }),
    });
    expect(loadHistory()).toEqual({ kind: 'ok', records: [record] });
  });

  it('falls back to the v1 key when no v2 text exists, as Legacy_Records', () => {
    fakeStorage({ [LEGACY_HISTORY_KEY]: JSON.stringify({ v: 1, records: [legacy, legacy] }) });
    expect(loadHistory()).toEqual({
      kind: 'ok',
      records: [
        { no: 1, ...legacy, purpose: null, outcome: 'NO ANSWER' },
        { no: 2, ...legacy, purpose: null, outcome: 'NO ANSWER' },
      ],
    });
  });

  it('returns an empty ok history when neither key exists', () => {
    fakeStorage();
    expect(loadHistory()).toEqual({ kind: 'ok', records: [] });
  });

  it('treats an unreadable v2 text as a reset, with no fallback to v1', () => {
    fakeStorage({
      [HISTORY_KEY]: 'not json',
      [LEGACY_HISTORY_KEY]: JSON.stringify({ v: 1, records: [legacy] }),
    });
    expect(loadHistory()).toEqual({ kind: 'reset', records: [] });
  });

  it('writes only the v2 key, and never writes or removes the v1 key', () => {
    const v1 = JSON.stringify({ v: 1, records: [legacy] });
    const s = fakeStorage({ [LEGACY_HISTORY_KEY]: v1 });
    expect(saveHistory([record])).toBe(true);
    expect(s.writes).toEqual([HISTORY_KEY]);
    expect(s.removes).toEqual([]);
    expect(s.data.get(LEGACY_HISTORY_KEY)).toBe(v1);
    expect(JSON.parse(s.data.get(HISTORY_KEY) as string)).toEqual({ v: 2, records: [record] });
  });

  it('reports unavailable when reading throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(loadHistory()).toEqual({ kind: 'unavailable' });
    expect(saveHistory([record])).toBe(false);
  });
});
