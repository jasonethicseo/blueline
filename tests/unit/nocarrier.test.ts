import { describe, expect, it } from 'vitest';
import { acceptedCommands, resolveInput, viewOf } from '../../src/core/commands';
import { NOTICE_RESET, keepReset } from '../../src/core/history';
import { recover } from '../../src/core/recover';
import {
  MSG_PRESS_Y_OR_N, initialState, step, type AppState, type Effect, type Event,
} from '../../src/core/session';

const T0 = 1_794_200_000_000;
const PURPOSE = '강의 영상 하나만';
const MEMO = '다 봤으면 바로 끄자';

function run(events: Event[], start: AppState = initialState()) {
  let state = start;
  const effects: Effect[] = [];
  for (const e of events) {
    const r = step(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const connect = (memo: string): Event[] => [
  { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 1 },
  { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: memo }, { type: 'MENU_KEY', n: 1 },
  { type: 'CONFIRM' }, { type: 'OPENED', now: T0 },
];
const hungUp = run([...connect(MEMO), { type: 'HANG_UP', now: T0 + 10_000 }]).state;

describe('NO CARRIER shows the Message', () => {
  it('after a Hang_Up and after a Time_Up, and only in the ended view', () => {
    expect(hungUp.ended).toMatchObject({ view: 'nocarrier', memo: MEMO });
    expect(hungUp.session?.memo).toBeNull();
    const timeUp = run([...connect(MEMO), { type: 'TICK', now: T0 + 60_000 }]).state;
    expect(timeUp.ended).toMatchObject({ view: 'nocarrier', memo: MEMO, record: { reason: 'TIME UP' } });
  });

  it('has no Message when none was written', () => {
    expect(run([...connect(''), { type: 'HANG_UP', now: T0 + 1 }]).state.ended?.memo).toBeNull();
  });

  it('after a reload past the end, from the stored active state', () => {
    const active = JSON.stringify({ v: 2, start: T0, plannedSec: 60, label: 'YOUTUBE', purpose: PURPOSE, memo: MEMO });
    const { state } = recover(active, T0 + 120_000);
    expect(state.ended).toMatchObject({ view: 'nocarrier', memo: MEMO, record: { purpose: PURPOSE } });
    expect(viewOf(state)).toBe('nocarrierCheck');
  });
});

describe('the Purpose check on NO CARRIER', () => {
  it('is the nocarrierCheck view while a Purpose is set', () => {
    expect(viewOf(hungUp)).toBe('nocarrierCheck');
  });

  it('does not move on for NOCARRIER_DONE (timer, Enter, or tap) or Escape (BACK)', () => {
    for (const e of [{ type: 'NOCARRIER_DONE' }, { type: 'BACK' }, { type: 'DIAL_AGAIN' }] as Event[]) {
      const { state, effects } = run([e], hungUp);
      expect(state.ended).toMatchObject({ view: 'nocarrier', memo: MEMO, record: { outcome: 'NO ANSWER' } });
      expect(effects).toEqual([]);
    }
  });

  it('shows PRESS Y OR N for digits, empty Enter, and other text', () => {
    expect(run([{ type: 'MENU_KEY', n: 5 }], hungUp).state.message).toBe(MSG_PRESS_Y_OR_N);
    for (const text of ['', '  ', '5', 'bye', 'back', 'xyz', 'go yt']) {
      expect(resolveInput('nocarrierCheck', text)).toEqual({ kind: 'message', text: MSG_PRESS_Y_OR_N });
    }
  });

  it('accepts y, yes, n, no in any case, and help', () => {
    for (const [text, word] of [['Y', 'y'], [' yes ', 'yes'], ['n', 'n'], ['No', 'no']] as const) {
      expect(resolveInput('nocarrierCheck', text)).toEqual({ kind: 'command', command: { kind: 'word', word } });
    }
    expect(resolveInput('nocarrierCheck', 'help')).toEqual({ kind: 'help', lines: acceptedCommands('nocarrierCheck') });
    expect(acceptedCommands('nocarrierCheck')).toEqual(['Y - YES (DONE)', 'N - NO (DRIFTED)', 'HELP - SHOW COMMANDS']);
  });

  it('the answer words are not Commands on other screens', () => {
    expect(resolveInput('session', 'y')).toEqual({ kind: 'message', text: 'COMMAND NOT AVAILABLE HERE - TYPE HELP' });
    expect(resolveInput('nocarrier', 'n')).toEqual({ kind: 'message', text: 'COMMAND NOT AVAILABLE HERE - TYPE HELP' });
  });

  it('Y saves DONE, drops the Message, and shows the receipt; later answers change nothing', () => {
    const { state, effects } = run([{ type: 'ANSWER', yes: true }, { type: 'ANSWER', yes: false }], hungUp);
    expect(state.ended).toMatchObject({ view: 'receipt', memo: null, record: { outcome: 'DONE' } });
    expect(effects).toEqual([{ type: 'saveOutcome', start: T0, outcome: 'DONE' }]);
  });

  it('N saves DRIFTED', () => {
    const { state, effects } = run([{ type: 'ANSWER', yes: false }], hungUp);
    expect(state.ended?.record.outcome).toBe('DRIFTED');
    expect(effects).toEqual([{ type: 'saveOutcome', start: T0, outcome: 'DRIFTED' }]);
  });
});

describe('a Session without a Purpose (recovered from a v1 active state)', () => {
  const legacy = recover(JSON.stringify({ v: 1, start: T0, plannedSec: 60, label: 'CUSTOM' }), T0 + 120_000).state;

  it('asks nothing and moves on as in the core spec, keeping NO ANSWER', () => {
    expect(viewOf(legacy)).toBe('nocarrier');
    expect(run([{ type: 'ANSWER', yes: true }], legacy).state.ended?.view).toBe('nocarrier');
    const { state, effects } = run([{ type: 'NOCARRIER_DONE' }], legacy);
    expect(state.ended).toMatchObject({ view: 'receipt', record: { purpose: null, outcome: 'NO ANSWER' } });
    expect(effects).toEqual([]);
  });
});

describe('keepReset', () => {
  it('keeps the HISTORY RESET notice through the answer write', () => {
    const records = [{ ...{ no: 1, start: 1, end: 1, plannedSec: 60, actualSec: 0, fee: 0 },
      reason: 'HANG UP' as const, label: 'YOUTUBE' as const, purpose: 'x', outcome: 'DONE' as const }];
    expect(keepReset({ kind: 'reset', records: [] }, { kind: 'ok', records })).toEqual({ kind: 'reset', records });
    expect(keepReset({ kind: 'reset', records: [] }, { kind: 'unavailable' })).toEqual({ kind: 'unavailable' });
    expect(keepReset({ kind: 'ok', records: [] }, { kind: 'ok', records })).toEqual({ kind: 'ok', records });
    expect(keepReset(null, { kind: 'ok', records })).toEqual({ kind: 'ok', records });
    expect(NOTICE_RESET).toBe('HISTORY RESET - STORED DATA UNREADABLE');
  });
});
