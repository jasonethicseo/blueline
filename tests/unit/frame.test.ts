// The Screen_Frame text per view (design Req 2.2, 2.3, 9.3).
import { describe, expect, it } from 'vitest';
import type { ViewName } from '../../src/core/commands';
import { initialState } from '../../src/core/session';
import { frameFor, type Frame } from '../../src/screens/frame';
import { MEMO, PURPOSE, finalState, toConnected, toEnded, toTimeUp } from '../property/session-arb';

const VIEWS: ViewName[] = [
  'dial', 'destination', 'urlEntry', 'board', 'purpose', 'memo', 'duration', 'confirm', 'session',
  'haunted', 'nocarrier', 'nocarrierCheck', 'receipt',
];

const text = (f: Frame): string => JSON.stringify([f.status, f.keys, f.hint ?? '']);

describe('frameFor', () => {
  const states = [initialState(), finalState(toConnected), finalState(toEnded), finalState(toTimeUp)];

  it('gives every view a Status_Bar starting with the app version and at least one key', () => {
    for (const state of states) {
      for (const view of VIEWS) {
        const f = frameFor(view, state);
        expect(f.status[0]).toBe(`BLUELINE ${__APP_VERSION__}`);
        expect(f.keys.length).toBeGreaterThan(0);
      }
    }
  });

  it('never puts the Purpose or the Message in either bar', () => {
    for (const state of states) {
      for (const view of VIEWS) {
        const all = text(frameFor(view, state));
        expect(all).not.toContain(PURPOSE);
        expect(all).not.toContain(MEMO);
      }
    }
  });

  it('shows the fee rate on blue screens, and not on NO CARRIER or the Haunted_Screen', () => {
    const s = initialState();
    expect(frameFor('destination', s).status).toContain('FEE ₩40/MIN (FICTIONAL)');
    expect(frameFor('receipt', s).status).toContain('FEE ₩40/MIN (FICTIONAL)');
    expect(text(frameFor('nocarrierCheck', s))).not.toContain('FEE');
    expect(text(frameFor('haunted', s))).not.toContain('FEE');
  });

  it('themes: blue by default, black for NO CARRIER, haunted with LINE STATUS: UNSTABLE', () => {
    const s = finalState(toTimeUp);
    expect(frameFor('destination', s).theme).toBe('blue');
    expect(frameFor('nocarrier', s).theme).toBe('black');
    expect(frameFor('nocarrierCheck', s).theme).toBe('black');
    const h = frameFor('haunted', s);
    expect(h.theme).toBe('haunted');
    expect(h.status).toContain('LINE STATUS: UNSTABLE');
    expect(h.keys[0]).toEqual(['ENTER', 'FACE IT']);
  });

  it('session: green badge last, destination and Hang_Up keys', () => {
    const f = frameFor('session', finalState(toConnected));
    expect(f.online).toBe(true);
    expect(f.status.at(-1)).toBe('● ON LINE');
    expect(f.status).toContain('DESTINATION: YOUTUBE (OPENED IN NEW TAB)');
    expect(f.keys).toEqual(expect.arrayContaining([['ESC', 'HANG UP'], ['BYE', 'HANG UP']]));
    expect(f.hint).toContain('KEEP THIS TAB OPEN');
    expect(frameFor('dial', initialState()).online).toBe(false);
  });

  it('NO CARRIER question: Y and N keys and the NO ANSWER hint', () => {
    const f = frameFor('nocarrierCheck', finalState(toEnded));
    expect(f.keys).toEqual(expect.arrayContaining([['Y', 'DONE'], ['N', 'DRIFTED']]));
    expect(f.hint).toContain('LEAVE WITHOUT ANSWERING = NO ANSWER');
  });

  it('dial lists no GO BOARD key (confirmed decision 6) and says DIALING... while dialing', () => {
    expect(text(frameFor('dial', initialState()))).not.toContain('BOARD');
    const dialing = { ...initialState(), phase: 'DIALING' as const };
    expect(frameFor('dial', dialing).status.at(-1)).toBe('DIALING...');
    expect(frameFor('dial', initialState()).status.at(-1)).toBe('OFF LINE');
  });
});
