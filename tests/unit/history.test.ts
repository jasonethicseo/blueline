import { describe, expect, it } from 'vitest';
import { NOTICE_RESET, NOTICE_UNAVAILABLE, buildReceipt, countLine, periodStarts } from '../../src/core/history';
import type { NewRecord, SessionRecord } from '../../src/core/record';

// Local-time constructors keep these checks valid in any time zone.
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s).getTime();

describe('periodStarts', () => {
  it('on a Monday, the week starts today', () => {
    expect(periodStarts(local(2026, 11, 9, 15, 30))).toEqual({
      dayStart: local(2026, 11, 9),
      weekStart: local(2026, 11, 9),
    });
  });

  it('on a Sunday, the week started six days earlier', () => {
    expect(periodStarts(local(2026, 11, 15, 23, 59, 59))).toEqual({
      dayStart: local(2026, 11, 15),
      weekStart: local(2026, 11, 9),
    });
  });

  it('one second after midnight belongs to the new day', () => {
    expect(periodStarts(local(2026, 11, 16, 0, 0, 1))).toEqual({
      dayStart: local(2026, 11, 16),
      weekStart: local(2026, 11, 16),
    });
  });

  it('crosses a month and a year boundary', () => {
    expect(periodStarts(local(2027, 1, 1, 9)).weekStart).toBe(local(2026, 12, 28));
  });
});

describe('buildReceipt', () => {
  const now = local(2026, 11, 11, 20); // Wednesday
  const rec = (end: number, fee: number): NewRecord => ({
    start: end - 60_000, end, plannedSec: 60, actualSec: 60, fee, reason: 'TIME UP', label: 'CUSTOM',
    purpose: '강의 하나만', outcome: 'NO ANSWER',
  });
  const current = rec(now - 1000, 40);
  const stored: SessionRecord[] = [rec(local(2026, 11, 9, 10), 200), rec(local(2026, 11, 8, 10), 999), current]
    .map((r, i) => ({ ...r, no: i + 1, outcome: i === 0 ? 'DONE' : r.outcome }));
  const storedCurrent = stored.slice(-1);
  const c = (done: number, drifted: number, noAnswer: number) => ({ done, drifted, noAnswer });

  it('uses the stored history when it was read', () => {
    expect(buildReceipt(current, { kind: 'ok', records: stored }, now)).toEqual({
      record: current, today: 40, week: 240,
      counts: { today: c(0, 0, 1), week: c(1, 0, 1) }, notice: null,
    });
  });

  it('shows the reset notice after unreadable history', () => {
    expect(buildReceipt(current, { kind: 'reset', records: storedCurrent }, now)).toEqual({
      record: current, today: 40, week: 40,
      counts: { today: c(0, 0, 1), week: c(0, 0, 1) }, notice: NOTICE_RESET,
    });
  });

  it('uses only the current record when storage is unavailable', () => {
    expect(buildReceipt(current, { kind: 'unavailable' }, now)).toEqual({
      record: current, today: 40, week: 40,
      counts: { today: c(0, 0, 1), week: c(0, 0, 1) }, notice: NOTICE_UNAVAILABLE,
    });
  });

  it('counts the answered Outcome even when the stored record still says NO ANSWER', () => {
    const answered: NewRecord = { ...current, outcome: 'DRIFTED' };
    const r = buildReceipt(answered, { kind: 'ok', records: stored }, now);
    expect(r.counts).toEqual({ today: c(0, 1, 0), week: c(1, 1, 0) });
    expect(r.today).toBe(40);
    expect(r.week).toBe(240);
  });

  it('counts the answered Outcome when storage is unavailable', () => {
    const answered: NewRecord = { ...current, outcome: 'DONE' };
    expect(buildReceipt(answered, { kind: 'unavailable' }, now).counts).toEqual({ today: c(1, 0, 0), week: c(1, 0, 0) });
  });
});

describe('countLine', () => {
  it('reads as DONE / DRIFTED / NO ANSWER with their numbers', () => {
    expect(countLine(c3(1, 0, 2)).replace(/\u00a0/g, ' ')).toBe('DONE 1 · DRIFTED 0 · NO ANSWER 2');
  });

  it('can wrap only after a "·": every other space is a no-break space', () => {
    const text = countLine(c3(12, 345, 1000));
    expect(text).toBe('DONE\u00a012\u00a0· DRIFTED\u00a0345\u00a0· NO\u00a0ANSWER\u00a01000');
    expect(text.split(' ')).toEqual(['DONE\u00a012\u00a0·', 'DRIFTED\u00a0345\u00a0·', 'NO\u00a0ANSWER\u00a01000']);
  });
});

function c3(done: number, drifted: number, noAnswer: number) {
  return { done, drifted, noAnswer };
}
