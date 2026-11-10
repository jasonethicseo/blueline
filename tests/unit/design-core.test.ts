// Unit tests for the pure helpers of the design spec: lastCall, ghostLayout, modemLines, charCounter, formatWon.
import { describe, expect, it } from 'vitest';
import { CONNECT_TEXT, DIAL_TEXT } from '../../src/core/config';
import { charCounter, formatWon, modemLines } from '../../src/core/display';
import { GHOST_ASCII, ghostLayout, hauntLevel, hauntTiming, shouldHaunt } from '../../src/core/haunt';
import type { SessionRecord } from '../../src/core/record';
import { dialLines, lastCall, preview, sysopNotice, todaySoFar } from '../../src/core/summary';

const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).getTime();

const rec = (end: number, over: Partial<SessionRecord> = {}): SessionRecord => ({
  no: 1, start: end - 1_082_000, end, plannedSec: 1800, actualSec: 1082, fee: 760, reason: 'HANG UP',
  label: 'YOUTUBE', purpose: 'WATCH ONE VIDEO', outcome: 'DRIFTED', ...over,
});

describe('lastCall', () => {
  const now = at(2026, 11, 10, 12, 0);
  it('says TODAY, YESTERDAY, or the date, with ON LINE time and Outcome', () => {
    const h = (end: number) => ({ kind: 'ok' as const, records: [rec(end)] });
    expect(lastCall(h(at(2026, 11, 10, 9, 5)), now)).toBe('TODAY 09:05 · 18:02 ON LINE · DRIFTED');
    expect(lastCall(h(at(2026, 11, 9, 23, 41)), now)).toBe('YESTERDAY 23:41 · 18:02 ON LINE · DRIFTED');
    expect(lastCall(h(at(2026, 11, 7, 8, 0)), now)).toBe('2026-11-07 08:00 · 18:02 ON LINE · DRIFTED');
  });
  it('uses the newest record and gives null when there is none', () => {
    const records = [rec(at(2026, 11, 8, 8, 0), { no: 1 }), rec(at(2026, 11, 10, 8, 0), { no: 2, outcome: 'DONE' })];
    expect(lastCall({ kind: 'ok', records }, now)).toContain('TODAY 08:00');
    expect(lastCall({ kind: 'ok', records: [] }, now)).toBeNull();
    expect(lastCall({ kind: 'unavailable' }, now)).toBeNull();
    expect(lastCall(null, now)).toBeNull();
  });
});

describe('todaySoFar and preview', () => {
  const start = at(2026, 11, 10, 12, 0);
  it('todaySoFar counts earlier calls today plus this Session', () => {
    const records = [rec(at(2026, 11, 9, 23, 0), { fee: 100 }), rec(at(2026, 11, 10, 9, 0), { no: 2, fee: 40 })];
    expect(todaySoFar({ kind: 'ok', records }, start, 80)).toEqual({ calls: 2, fee: 120 });
    expect(todaySoFar({ kind: 'unavailable' }, start, 80)).toEqual({ calls: 1, fee: 80 });
  });
  it('preview gives the Post_Number, or none without storage', () => {
    const { no: _no, ...stored } = rec(start + 60_000, { start, outcome: 'NO ANSWER', fee: 40 });
    const p = preview(stored, { kind: 'ok', records: [{ no: 17, ...stored }] }, start + 61_000);
    expect(p.postNo).toBe(17);
    expect(p.today).toMatchObject({ calls: 1, fee: 40 });
    const q = preview(stored, { kind: 'unavailable' }, start + 61_000);
    expect(q.postNo).toBeNull();
    expect(q.today.counts.noAnswer).toBe(1);
  });
});

describe('haunt', () => {
  const purpose = '버그 해결 영상 하나만';
  it('timing is demo for 60 s and normal otherwise', () => {
    expect(hauntTiming(60)).toEqual({ graceSec: 10, fullSec: 60 });
    expect(hauntTiming(300)).toEqual({ graceSec: 60, fullSec: 600 });
    expect(hauntLevel(30_000, 60)).toBe(0.5);
    expect(hauntLevel(300_000, 600)).toBe(0.5);
  });
  it('shouldHaunt needs TIME UP and a Purpose', () => {
    const { no: _no, ...r } = rec(1_000_000, { reason: 'TIME UP', plannedSec: 60 });
    expect(shouldHaunt(r, 1_010_000)).toBe(true);
    expect(shouldHaunt(r, 1_009_999)).toBe(false);
    expect(shouldHaunt({ ...r, reason: 'HANG UP' }, 2_000_000)).toBe(false);
    expect(shouldHaunt({ ...r, purpose: null }, 2_000_000)).toBe(false);
  });
  it('ghostLayout shows 0, 3, and 6 ghosts at levels 0, 0.5, and 1', () => {
    expect(ghostLayout(purpose, 0)).toHaveLength(0);
    expect(ghostLayout(purpose, 0.5)).toHaveLength(3);
    const full = ghostLayout(purpose, 1);
    expect(full).toHaveLength(6);
    expect(full[0]?.text).toBe(purpose);
    expect(full.some((g) => /[▒█]/.test(g.text))).toBe(true);
    expect(full.every((g) => g.size % 11 === 0)).toBe(true);
    expect(GHOST_ASCII).toContain('(o o)');
  });
  it('gives the same layout twice for the same Purpose and level', () => {
    expect(ghostLayout(purpose, 0.7)).toEqual(ghostLayout(purpose, 0.7));
  });
});

describe('modemLines', () => {
  it('shows the lines in order and ends with CONNECT 2400 in green', () => {
    expect(modemLines(0, false).map((l) => l.text)).toEqual(['ATZ']);
    const all = modemLines(5000, true);
    expect(all.map((l) => l.text)).toEqual(['ATZ', 'OK', DIAL_TEXT, 'DIALING...', 'RING... RING...', CONNECT_TEXT]);
    expect(all.at(-1)).toEqual({ text: 'CONNECT 2400', cls: 'connect' });
    expect(all.map((l) => l.cls)).toEqual(['cmd', 'ok', 'cmd', 'resp', 'resp', 'connect']);
  });
  it('types the dial line one character at a time', () => {
    const typed = modemLines(660, false).at(-1);
    expect(typed?.text).toBe('AT');
    expect(modemLines(1000, false).find((l) => l.text.startsWith('ATD'))?.text.length).toBeLessThan(DIAL_TEXT.length);
  });
});

describe('charCounter and formatWon', () => {
  it('counts trimmed Characters and flags the overflow', () => {
    expect(charCounter('  가나다  ', 60)).toEqual({ text: '3/60', over: false });
    expect(charCounter('a'.repeat(61), 60)).toEqual({ text: '61/60', over: true });
    expect(charCounter('', 120)).toEqual({ text: '0/120', over: false });
  });
  it('formatWon writes thousands separators', () => {
    expect(formatWon(1840)).toBe('₩1,840');
    expect(formatWon(0)).toBe('₩0');
    expect(formatWon(1234567)).toBe('₩1,234,567');
  });
});

describe('dialLines (Dial_Screen text)', () => {
  const now = at(2026, 11, 11, 12, 0); // a Wednesday; the week began on Monday the 9th
  it('greets with a four-digit Caller_Number, then the last call and this week', () => {
    const records = [
      rec(at(2026, 11, 8, 20, 0), { no: 15, fee: 400, outcome: 'DONE' }), // last week
      rec(at(2026, 11, 9, 9, 0), { no: 16, fee: 40, outcome: 'DONE' }),
      rec(at(2026, 11, 10, 23, 41), { no: 17, fee: 1800, outcome: 'DRIFTED' }),
    ];
    const t = dialLines({ kind: 'ok', records }, now);
    expect(t.greeting).toBe('반갑습니다 ^^  WELCOME BACK, CALLER #0018');
    expect(t.last).toBe('LAST CALL: YESTERDAY 23:41 · 18:02 ON LINE · DRIFTED');
    expect(t.week).toBe('THIS WEEK: 2 CALLS · ₩1,840 · DONE 1 · DRIFTED 1 · NO ANSWER 0');
  });
  it('says FIRST CALL with zeros when there is no history, an unreadable one, or no storage', () => {
    for (const h of [null, { kind: 'unavailable' as const }, { kind: 'ok' as const, records: [] }, { kind: 'reset' as const, records: [] }]) {
      expect(dialLines(h, now)).toEqual({
        greeting: '반갑습니다 ^^  WELCOME BACK, CALLER #0001',
        last: 'FIRST CALL. WELCOME.',
        week: 'THIS WEEK: 0 CALLS · ₩0 · DONE 0 · DRIFTED 0 · NO ANSWER 0',
      });
    }
  });
});

describe('sysopNotice', () => {
  const now = at(2026, 11, 11, 12, 0);
  it('counts DONE and DRIFTED in the last 7 local days, today included', () => {
    const records = [
      rec(at(2026, 11, 4, 23, 59), { no: 1, outcome: 'DONE' }), // 7 days back: outside
      rec(at(2026, 11, 5, 0, 0), { no: 2, outcome: 'DONE' }), // the first day inside
      rec(at(2026, 11, 8, 9, 0), { no: 3, outcome: 'DRIFTED' }),
      rec(at(2026, 11, 11, 9, 0), { no: 4, outcome: 'NO ANSWER' }),
    ];
    expect(sysopNotice({ kind: 'ok', records }, now)).toEqual({
      ko: '최근 7일: 목적을 지킨 접속 1 / 떠내려간 접속 1',
      en: 'LAST 7 DAYS: DONE 1 · DRIFTED 1',
    });
    expect(sysopNotice(null, now).en).toBe('LAST 7 DAYS: DONE 0 · DRIFTED 0');
  });
});
