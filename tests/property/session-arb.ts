// Generators and a replay helper for state machine property tests.
import fc from 'fast-check';
import { initialState, step, type AppState, type Effect, type Event } from '../../src/core/session';

/** A fixed clock origin; event times are offsets around it. */
export const BASE = 1_794_200_000_000;
export const time = fc.integer({ min: BASE - 120_000, max: BASE + 2_000_000 });

const simple = <T extends Event['type']>(type: T) => fc.constant({ type } as Event);

/** Any event, with parameters that hit the interesting branches. */
export const anyEvent: fc.Arbitrary<Event> = fc.oneof(
  simple('DIAL'), simple('DIAL_SKIP'), simple('HANDSHAKE_DONE'), simple('SHOW_MENU'),
  fc.integer({ min: 0, max: 9 }).map((n): Event => ({ type: 'MENU_KEY', n })),
  fc.constantFrom('yt', 'ig').map((alias): Event => ({ type: 'GO', alias: alias as 'yt' | 'ig' })),
  fc.constantFrom('youtube.com', 'back', 'BACK', 'javascript:x', '', 'zz.example/feed')
    .map((text): Event => ({ type: 'URL_SUBMIT', text })),
  simple('BACK'), simple('CONFIRM'),
  fc.constantFrom('강의 하나만', 'back', '', '   ', 'x'.repeat(61), ' 0 ')
    .map((text): Event => ({ type: 'PURPOSE_SUBMIT', text })),
  fc.constantFrom('', '다 봤으면 끄자', 'y'.repeat(121), ' bye ')
    .map((text): Event => ({ type: 'MEMO_SUBMIT', text })),
  simple('TYPING'),
  time.map((now): Event => ({ type: 'OPENED', now })),
  simple('POPUP_BLOCKED'),
  time.map((now): Event => ({ type: 'LINK_OPENED', now })),
  time.map((now): Event => ({ type: 'TICK', now })),
  time.map((now): Event => ({ type: 'HANG_UP', now })),
  simple('NOCARRIER_DONE'), simple('DIAL_AGAIN'),
  fc.boolean().map((yes): Event => ({ type: 'ANSWER', yes })),
  fc.constantFrom('X', null).map((text): Event => ({ type: 'MESSAGE', text })),
);

/** Scripted paths to each phase, so random tails start from every reachable state. */
const toDest: Event[] = [{ type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }];
export const PURPOSE = '강의 영상 하나만';
export const MEMO = '다 봤으면 바로 끄자';
const toPurpose: Event[] = [...toDest, { type: 'MENU_KEY', n: 1 }];
const toMemo: Event[] = [...toPurpose, { type: 'PURPOSE_SUBMIT', text: PURPOSE }];
const toDuration: Event[] = [...toMemo, { type: 'MEMO_SUBMIT', text: MEMO }];
const toConfirm: Event[] = [...toDuration, { type: 'MENU_KEY', n: 1 }];
const toPending: Event[] = [...toConfirm, { type: 'CONFIRM' }];
export const toConnected: Event[] = [...toPending, { type: 'OPENED', now: BASE }];
export const toEnded: Event[] = [...toConnected, { type: 'HANG_UP', now: BASE + 5_000 }];
const toReceipt: Event[] = [...toEnded, { type: 'ANSWER', yes: true }];

export const prefix = fc.constantFrom<Event[]>(
  [], [{ type: 'DIAL' }], toDest, [...toDest, { type: 'MENU_KEY', n: 3 }], toPurpose, toMemo,
  [...toDest, { type: 'MENU_KEY', n: 2 }, { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: '' }],
  toDuration, toConfirm, toPending, [...toPending, { type: 'POPUP_BLOCKED' }], toConnected, toEnded, toReceipt,
);

export const tail = (max = 40) => fc.array(anyEvent, { maxLength: max });

/** A full event script: a path to some phase, then random events. */
export const script = fc.tuple(prefix, tail()).map(([p, t]) => [...p, ...t]);

export interface Step { before: AppState; event: Event; after: AppState; effects: Effect[] }

/** Apply events in order and record every step. */
export function replay(events: Event[], start: AppState = initialState()): Step[] {
  const steps: Step[] = [];
  let state = start;
  for (const event of events) {
    const { state: after, effects } = step(state, event);
    steps.push({ before: state, event, after, effects });
    state = after;
  }
  return steps;
}

export const finalState = (events: Event[]): AppState => {
  const steps = replay(events);
  return steps.length ? (steps[steps.length - 1] as Step).after : initialState();
};

export const effectsOf = (steps: Step[]): Effect[] => steps.flatMap((s) => s.effects);
