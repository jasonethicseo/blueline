import { describe, expect, it } from 'vitest';
import { NOTICE_RESET, NOTICE_UNAVAILABLE, buildReceipt, periodStarts } from '../../src/core/history';
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
    .map((r, i) => ({ ...r, no: i + 1 }));
  const storedCurrent = stored.slice(-1);

  it('uses the stored history when it was read', () => {
    expect(buildReceipt(current, { kind: 'ok', records: stored }, now)).toEqual({
      record: current, today: 40, week: 240, notice: null,
    });
  });

  it('shows the reset notice after unreadable history', () => {
    expect(buildReceipt(current, { kind: 'reset', records: storedCurrent }, now)).toEqual({
      record: current, today: 40, week: 40, notice: NOTICE_RESET,
    });
  });

  it('uses only the current record when storage is unavailable', () => {
    expect(buildReceipt(current, { kind: 'unavailable' }, now)).toEqual({
      record: current, today: 40, week: 40, notice: NOTICE_UNAVAILABLE,
    });
  });
});
