// Reload cases of the design spec (Req 9.12, 9.13), at the reducer level with a fake storage slot.
import { describe, expect, it } from 'vitest';
import { fee } from '../../src/core/fee';
import { appendRecord, setOutcome } from '../../src/core/history';
import { parseActive, serializeActive, type SessionRecord } from '../../src/core/record';
import { recover } from '../../src/core/recover';
import { initialState, step, type AppState, type Effect, type Event } from '../../src/core/session';
import { viewOf } from '../../src/core/commands';

const T0 = 1_794_200_000_000;
const PURPOSE = '버그 해결 영상 하나만';
const MEMO = '다 봤으면 바로 끄자';
const END = T0 + 60_000;

/** A stored v2 active state of the 1 MIN (DEMO) Session. */
const active = (): string =>
  serializeActive({ start: T0, plannedSec: 60, label: 'YOUTUBE', purpose: PURPOSE, memo: MEMO });

const run = (state: AppState, events: Event[]) => {
  const effects: Effect[] = [];
  let s = state;
  for (const e of events) {
    const r = step(s, e);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
};

describe('reload (가): the active state is stored and its scheduled end has passed', () => {
  it('loaded 15 s after the end: haunted, then NO CARRIER with the Message, then the answer is stored', () => {
    expect(parseActive(active())).not.toBeNull();
    const loaded = recover(active(), END + 15_000);
    const written = loaded.effects.find((e) => e.type === 'endSession');
    expect(written).toMatchObject({ record: { end: END, fee: fee(60), reason: 'TIME UP', outcome: 'NO ANSWER', purpose: PURPOSE } });
    expect(fee(60)).toBe(40);
    expect(loaded.state.ended).toMatchObject({ view: 'nocarrier', seenAt: null, memo: MEMO });

    const seen = run(loaded.state, [{ type: 'SEEN', now: END + 15_000 }]);
    expect(viewOf(seen.state)).toBe('haunted');
    expect(seen.state.ended?.memo).toBe(MEMO);
    expect(seen.effects).toEqual([]);

    const faced = run(seen.state, [{ type: 'FACE_IT', now: END + 20_000 }]);
    expect(viewOf(faced.state)).toBe('nocarrierCheck');
    expect(faced.state.ended).toMatchObject({ view: 'nocarrier', memo: MEMO, shownAt: END + 20_000 });

    const answered = run(faced.state, [{ type: 'ANSWER', yes: true }]);
    expect(answered.effects).toEqual([{ type: 'saveOutcome', start: T0, outcome: 'DONE' }]);
  });

  it('loaded 5 s after the end (inside the Grace_Period): NO CARRIER with the Message at once', () => {
    const loaded = recover(active(), END + 5_000);
    const seen = run(loaded.state, [{ type: 'SEEN', now: END + 5_000 }]);
    expect(viewOf(seen.state)).toBe('nocarrierCheck');
    expect(seen.state.ended).toMatchObject({ view: 'nocarrier', memo: MEMO, seenAt: END + 5_000, shownAt: END + 5_000 });
  });

  it('loaded exactly at the Grace_Period (10 s) is haunted; 1 ms earlier is not', () => {
    const at = (ms: number) => run(recover(active(), END + ms).state, [{ type: 'SEEN', now: END + ms }]).state;
    expect(viewOf(at(10_000))).toBe('haunted');
    expect(viewOf(at(9_999))).toBe('nocarrierCheck');
  });
});

describe('reload (나): NO CARRIER was already reached', () => {
  /** Play the Session to NO CARRIER, applying the storage effects to a fake slot. */
  function reachNoCarrier(answer: boolean | null) {
    const slot: { active: string | null; records: SessionRecord[] } = { active: null, records: [] };
    const apply = (effects: Effect[]) => {
      for (const e of effects) {
        if (e.type === 'saveActive') slot.active = serializeActive(e.active);
        if (e.type === 'clearActive') slot.active = null;
        if (e.type === 'endSession') {
          slot.active = null;
          slot.records = appendRecord(slot.records, e.record);
        }
        if (e.type === 'saveOutcome') slot.records = setOutcome(slot.records, e.start, e.outcome);
      }
    };
    let state = initialState();
    const events: Event[] = [
      { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 1 },
      { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: MEMO }, { type: 'MENU_KEY', n: 1 },
      { type: 'CONFIRM' }, { type: 'OPENED', now: T0 }, { type: 'TICK', now: END },
      { type: 'SEEN', now: END + 30_000 }, { type: 'FACE_IT', now: END + 31_000 },
      ...(answer === null ? [] : [{ type: 'ANSWER', yes: answer } as Event]),
    ];
    for (const e of events) {
      const r = step(state, e);
      state = r.state;
      apply(r.effects);
    }
    return { state, slot };
  }

  it.each([[null, 'NO ANSWER'], [true, 'DONE'], [false, 'DRIFTED']] as const)(
    'answer %s: the reload shows the Dial_Screen and keeps %s',
    (answer, outcome) => {
      const { state, slot } = reachNoCarrier(answer);
      expect(state.phase).toBe('ENDED');
      expect(slot.active).toBeNull();
      const before = JSON.stringify(slot.records);

      const loaded = recover(slot.active, END + 90_000);
      expect(loaded.state.phase).toBe('IDLE');
      expect(loaded.state.ended).toBeNull();
      expect(loaded.effects).toEqual([]);
      expect(JSON.stringify(slot.records)).toBe(before);
      expect(slot.records).toHaveLength(1);
      expect(slot.records[0]?.outcome).toBe(outcome);

      // A stray SEEN after the reload changes nothing: there is no ended Session to see.
      const after = run(loaded.state, [{ type: 'SEEN', now: END + 91_000 }, { type: 'FACE_IT', now: END + 92_000 }]);
      expect(after.state).toEqual(loaded.state);
      expect(after.effects).toEqual([]);
    },
  );
});
