// When the shell dispatches SEEN, and what the core makes of it (design Req 9.1, 9.12). No DOM.
import { describe, expect, it } from 'vitest';
import { unseen, refreshStored } from '../../src/app/ended';
import { viewOf } from '../../src/core/commands';
import { initialState, step, type AppState, type Event } from '../../src/core/session';
import { BASE, finalState, toConnected, toEnded, toTimeUp } from '../property/session-arb';

const FINAL_FRAME_MS = 500;
const END = BASE + 60_000;

const seenAt = (state: AppState, now: number): AppState => step(state, { type: 'SEEN', now } as Event).state;

describe('unseen', () => {
  it('is true for a fresh ended Session, false before the end, after SEEN, and in other views', () => {
    expect(unseen(initialState())).toBe(false);
    expect(unseen(finalState(toConnected))).toBe(false);
    const ended = finalState(toTimeUp);
    expect(unseen(ended)).toBe(true);
    const seen = seenAt(ended, END + FINAL_FRAME_MS);
    expect(unseen(seen)).toBe(false);
    // Haunted is already past the first SEEN.
    expect(viewOf(seenAt(ended, END + 20_000))).toBe('haunted');
    expect(unseen(seenAt(ended, END + 20_000))).toBe(false);
  });
});

describe('SEEN timing', () => {
  const ended = finalState(toTimeUp);
  it('a visible Time_Up is seen after the final frame, inside the Grace_Period: NO CARRIER, not haunted', () => {
    expect(viewOf(seenAt(ended, END + FINAL_FRAME_MS))).toBe('nocarrierCheck');
  });
  it('a hidden Time_Up seen after the Grace_Period (resume): haunted', () => {
    expect(viewOf(seenAt(ended, END + 10_000))).toBe('haunted');
    expect(viewOf(seenAt(ended, END + 9_999))).toBe('nocarrierCheck');
  });
  it('a Hang_Up is never haunted, however late it is seen', () => {
    expect(viewOf(seenAt(finalState(toEnded), BASE + 3_600_000))).toBe('nocarrierCheck');
  });
  it('the first SEEN decides: a later SEEN after the Grace_Period changes nothing', () => {
    const early = seenAt(ended, END + 1_000);
    expect(seenAt(early, END + 600_000)).toEqual(early);
  });
});

describe('refreshStored', () => {
  it('keeps the current snapshot when no new phase is entered', () => {
    const current = { kind: 'ok' as const, records: [] };
    const ended = finalState(toTimeUp);
    expect(refreshStored(ended, ended, current)).toBe(current);
  });
});
