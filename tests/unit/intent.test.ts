import { describe, expect, it } from 'vitest';
import { acceptedCommands, resolveInput, viewOf } from '../../src/core/commands';
import { MSG_MEMO_TOO_LONG, MSG_PURPOSE_REQUIRED, MSG_PURPOSE_TOO_LONG } from '../../src/core/purpose';
import { initialState, step, type AppState, type Effect, type Event } from '../../src/core/session';

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

const toPurpose: Event[] = [{ type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 1 }];
const purposeScreen = run(toPurpose).state;

describe('Purpose_Screen', () => {
  it('follows a Destination selection, with nothing written yet', () => {
    expect(purposeScreen).toMatchObject({ phase: 'SET_PURPOSE', textStep: 'purpose', intent: null, destination: { label: 'YOUTUBE' } });
    expect(viewOf(purposeScreen)).toBe('purpose');
  });

  it('shows PURPOSE REQUIRED for empty or whitespace-only text and stays', () => {
    for (const text of ['', '   ', '\u3000']) {
      const { state } = run([{ type: 'PURPOSE_SUBMIT', text }], purposeScreen);
      expect(state).toMatchObject({ textStep: 'purpose', message: MSG_PURPOSE_REQUIRED, intent: null });
    }
  });

  it('shows PURPOSE TOO LONG for 61 Characters and stays', () => {
    const { state } = run([{ type: 'PURPOSE_SUBMIT', text: '가'.repeat(61) }], purposeScreen);
    expect(state).toMatchObject({ textStep: 'purpose', message: MSG_PURPOSE_TOO_LONG });
  });

  it('typing clears the message', () => {
    const bad = run([{ type: 'PURPOSE_SUBMIT', text: '' }], purposeScreen).state;
    expect(run([{ type: 'TYPING' }], bad).state).toMatchObject({ message: null, textStep: 'purpose' });
  });

  it('accepts back, bye, help, and digits as ordinary Purpose text (Req 3.2)', () => {
    for (const text of ['back', 'bye', 'help', '0', '4']) {
      const { state, effects } = run([{ type: 'PURPOSE_SUBMIT', text }], purposeScreen);
      expect(state).toMatchObject({ textStep: 'memo', intent: { purpose: text, memo: null } });
      expect(effects).toEqual([]);
    }
  });

  it('BACK returns to the Destination_Menu with no Destination and no Purpose', () => {
    expect(run([{ type: 'BACK' }], purposeScreen).state).toMatchObject({
      phase: 'SELECT_DEST', destination: null, intent: null, urlEntry: false,
    });
  });
});

describe('Message_Screen', () => {
  const memoScreen = run([{ type: 'PURPOSE_SUBMIT', text: '  강의 하나만  ' }], purposeScreen).state;

  it('keeps the trimmed Purpose', () => {
    expect(memoScreen).toMatchObject({ textStep: 'memo', intent: { purpose: '강의 하나만', memo: null } });
    expect(viewOf(memoScreen)).toBe('memo');
  });

  it('empty Enter skips the Message and shows the Duration_Menu', () => {
    expect(run([{ type: 'MEMO_SUBMIT', text: '   ' }], memoScreen).state).toMatchObject({
      phase: 'SELECT_DURATION', confirm: null, intent: { purpose: '강의 하나만', memo: null },
    });
  });

  it('keeps a Message of up to 120 Characters and rejects 121', () => {
    expect(run([{ type: 'MEMO_SUBMIT', text: '가'.repeat(120) }], memoScreen).state.intent?.memo).toBe('가'.repeat(120));
    expect(run([{ type: 'MEMO_SUBMIT', text: '가'.repeat(121) }], memoScreen).state).toMatchObject({
      phase: 'SET_PURPOSE', textStep: 'memo', message: MSG_MEMO_TOO_LONG,
    });
  });

  it('BACK returns to the Purpose_Screen with the Purpose kept (Req 3.4)', () => {
    expect(run([{ type: 'BACK' }], memoScreen).state).toMatchObject({
      phase: 'SET_PURPOSE', textStep: 'purpose', intent: { purpose: '강의 하나만' },
    });
  });

  it('back from the Duration_Menu shows the Message written earlier (Req 3.5)', () => {
    const duration = run([{ type: 'MEMO_SUBMIT', text: '다 봤으면 끄자' }], memoScreen).state;
    for (const back of [{ type: 'BACK' }, { type: 'MENU_KEY', n: 0 }] as Event[]) {
      expect(run([back], duration).state).toMatchObject({
        phase: 'SET_PURPOSE', textStep: 'memo', destination: { label: 'YOUTUBE' },
        intent: { purpose: '강의 하나만', memo: '다 봤으면 끄자' },
      });
    }
  });

  it('a changed Purpose keeps the Message written earlier', () => {
    const duration = run([{ type: 'MEMO_SUBMIT', text: '쪽지' }], memoScreen).state;
    const { state } = run([{ type: 'BACK' }, { type: 'BACK' }, { type: 'PURPOSE_SUBMIT', text: '새 목적' }], duration);
    expect(state).toMatchObject({ textStep: 'memo', intent: { purpose: '새 목적', memo: '쪽지' } });
  });
});

describe('commands on the new screens', () => {
  it('the Duration_Menu help says back returns to the Message_Screen', () => {
    expect(acceptedCommands('duration')).toEqual(expect.arrayContaining(['0 - BACK (MESSAGE)', 'BACK - MESSAGE SCREEN']));
  });

  it('the text-field screens accept no Command', () => {
    for (const view of ['purpose', 'memo'] as const) {
      expect(resolveInput(view, 'back')).toEqual({ kind: 'message', text: 'COMMAND NOT AVAILABLE HERE - TYPE HELP' });
    }
  });
});
