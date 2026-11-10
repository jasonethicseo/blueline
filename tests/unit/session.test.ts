import { describe, expect, it } from 'vitest';
import {
  MSG_INVALID_SCHEME, MSG_INVALID_SELECTION, MSG_INVALID_URL, initialState, step,
  type AppState, type Effect, type Event,
} from '../../src/core/session';

const T0 = 1_794_200_000_000;

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

const toDest: Event[] = [{ type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }];
const PURPOSE = '릴스 세 개만';
const toDuration: Event[] = [
  ...toDest, { type: 'GO', alias: 'ig' }, { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: '' },
];
const toConfirm: Event[] = [...toDuration, { type: 'MENU_KEY', n: 2 }];

describe('dial', () => {
  it('plays the handshake once and shows the menu exactly once', () => {
    const { state, effects } = run([{ type: 'DIAL' }, { type: 'DIAL' }, { type: 'DIAL' }, { type: 'SHOW_MENU' }, { type: 'SHOW_MENU' }]);
    expect(effects).toEqual([{ type: 'playHandshake' }, { type: 'stopSound' }]);
    expect(state.phase).toBe('SELECT_DEST');
  });

  it('does not show the menu before CONNECT is shown', () => {
    expect(run([{ type: 'DIAL' }, { type: 'SHOW_MENU' }]).state.phase).toBe('DIALING');
  });
});

describe('destination menu and URL entry', () => {
  it('shows INVALID SELECTION and clears it on the next key', () => {
    const bad = run([...toDest, { type: 'MENU_KEY', n: 7 }]).state;
    expect(bad.message).toBe(MSG_INVALID_SELECTION);
    expect(bad.destination).toBeNull();
    expect(run([{ type: 'MENU_KEY', n: 1 }], bad).state).toMatchObject({ message: null, phase: 'SET_PURPOSE' });
  });

  it('maps URL errors to their messages and accepts a valid URL as CUSTOM', () => {
    const entry = run([...toDest, { type: 'MENU_KEY', n: 3 }]).state;
    expect(entry.urlEntry).toBe(true);
    expect(run([{ type: 'URL_SUBMIT', text: 'javascript:alert(1)' }], entry).state.message).toBe(MSG_INVALID_SCHEME);
    expect(run([{ type: 'URL_SUBMIT', text: '   ' }], entry).state.message).toBe(MSG_INVALID_URL);
    expect(run([{ type: 'URL_SUBMIT', text: 'example.com' }], entry).state).toMatchObject({
      phase: 'SET_PURPOSE', textStep: 'purpose', destination: { label: 'CUSTOM', url: 'https://example.com' },
    });
  });

  it('`back` in the URL field returns to the menu with no destination', () => {
    const entry = run([...toDest, { type: 'MENU_KEY', n: 3 }]).state;
    expect(run([{ type: 'URL_SUBMIT', text: ' Back ' }], entry).state).toMatchObject({ urlEntry: false, destination: null });
  });
});

describe('duration menu and confirm screen', () => {
  it('picking a duration shows the confirm screen and asks permission without opening', () => {
    const { state, effects } = run(toConfirm);
    expect(state).toMatchObject({ phase: 'SELECT_DURATION', confirm: { plannedSec: 300 }, pending: null });
    expect(effects).toEqual([{ type: 'playHandshake' }, { type: 'requestNotifyPermission' }]);
  });

  it('BACK (Escape, `back`, or 0) returns to the duration menu and keeps the destination', () => {
    for (const back of [{ type: 'BACK' }, { type: 'MENU_KEY', n: 0 }] as Event[]) {
      expect(run([...toConfirm, back]).state).toMatchObject({
        confirm: null, destination: { label: 'INSTAGRAM' }, phase: 'SELECT_DURATION',
      });
    }
  });

  it('ignores digits 1–9 on the confirm screen', () => {
    expect(run([...toConfirm, { type: 'MENU_KEY', n: 4 }]).state.confirm).toEqual({ plannedSec: 300 });
  });

  it('CONFIRM opens the destination; later input cannot open again', () => {
    const { state, effects } = run([...toConfirm, { type: 'CONFIRM' }, { type: 'CONFIRM' }, { type: 'BACK' }]);
    expect(effects.filter((e) => e.type === 'openDestination')).toEqual([
      { type: 'openDestination', url: 'https://www.instagram.com/' },
    ]);
    expect(state.pending).toEqual({ plannedSec: 300, blocked: false });
  });

  it('a blocked popup waits for the link, then starts the session at link time', () => {
    const { state, effects } = run([...toConfirm, { type: 'CONFIRM' }, { type: 'POPUP_BLOCKED' }, { type: 'LINK_OPENED', now: T0 }]);
    expect(state).toMatchObject({ phase: 'CONNECTED', session: { start: T0, plannedSec: 300, label: 'INSTAGRAM', purpose: PURPOSE, memo: null } });
    expect(effects).toContainEqual({
      type: 'saveActive', active: { start: T0, plannedSec: 300, label: 'INSTAGRAM', purpose: PURPOSE, memo: null },
    });
    expect(state.intent).toBeNull();
  });
});

describe('connected and ended', () => {
  const connected = run([...toConfirm, { type: 'CONFIRM' }, { type: 'OPENED', now: T0 }]).state;

  it('TICK before the end changes nothing; TICK at the end is TIME UP', () => {
    expect(run([{ type: 'TICK', now: T0 + 299_999 }], connected).state.phase).toBe('CONNECTED');
    const { state, effects } = run([{ type: 'TICK', now: T0 + 300_000 }], connected);
    expect(state.phase).toBe('ENDED');
    expect(effects.map((e) => e.type)).toEqual(['endSession', 'playNoCarrier', 'notifyTimeUp']);
  });

  it('hang-up records floor(elapsed), the fee, and no notification', () => {
    const { state, effects } = run([{ type: 'HANG_UP', now: T0 + 61_900 }], connected);
    expect(state.ended?.record).toMatchObject({
      reason: 'HANG UP', actualSec: 61, fee: 80, end: T0 + 61_000, purpose: PURPOSE, outcome: 'NO ANSWER',
    });
    expect(effects.map((e) => e.type)).toEqual(['endSession', 'playNoCarrier']);
  });

  it('receipt: 1 dials again, other digits show INVALID SELECTION', () => {
    const receipt = run([{ type: 'HANG_UP', now: T0 + 1_000 }, { type: 'NOCARRIER_DONE' }], connected).state;
    expect(receipt.ended?.view).toBe('receipt');
    expect(run([{ type: 'MENU_KEY', n: 2 }], receipt).state.message).toBe(MSG_INVALID_SELECTION);
    expect(run([{ type: 'MENU_KEY', n: 1 }], receipt).state).toMatchObject({ phase: 'IDLE', seq: 1, notifyAsked: false });
  });
});
