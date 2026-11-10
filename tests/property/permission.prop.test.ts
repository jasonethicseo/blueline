// Feature: blueline-core-flow, Property 17: Permission request and opening use separate user actions
// Feature: blueline-purpose-board, Property 15: Permission and opening stay in their places
// Moved out of session.prop.test.ts to keep that file under about 200 lines.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Event } from '../../src/core/session';
import { MEMO, PURPOSE, effectsOf, replay, script } from './session-arb';

describe('Property 17 and Property 15: permission and opening stay in their places', () => {
  it('never in one step; open only on CONFIRM; permission only on a duration pick, once per dial-in', () => {
    fc.assert(
      fc.property(script, (events) => {
        let asked = 0;
        for (const s of replay(events)) {
          const types = s.effects.map((e) => e.type);
          const opens = types.includes('openDestination');
          const asks = types.includes('requestNotifyPermission');
          expect(opens && asks).toBe(false);
          if (opens) expect(s.event.type).toBe('CONFIRM');
          if (asks) {
            expect(s.event.type).toBe('MENU_KEY');
            expect(s.before.phase).toBe('SELECT_DURATION');
            expect(s.before.confirm).toBeNull();
            asked += 1;
            expect(asked).toBeLessThanOrEqual(1);
          }
          // Nothing on the Purpose_Screen, the Message_Screen, the Board, or NO CARRIER asks or opens
          // (Req 7.11, 10.4, 10.5).
          if (s.before.phase === 'SET_PURPOSE' || s.before.board || s.before.phase === 'ENDED') {
            expect(opens || asks).toBe(false);
          }
          if (s.before.phase === 'ENDED' && s.after.phase === 'IDLE') asked = 0;
        }
      }),
      { numRuns: 500 },
    );
  });

  it('still asks only once when the user goes back to the Message_Screen and picks again', () => {
    const events: Event[] = [
      { type: 'DIAL' }, { type: 'HANDSHAKE_DONE' }, { type: 'SHOW_MENU' }, { type: 'MENU_KEY', n: 1 },
      { type: 'PURPOSE_SUBMIT', text: PURPOSE }, { type: 'MEMO_SUBMIT', text: '' },
      { type: 'MENU_KEY', n: 2 }, { type: 'BACK' }, { type: 'BACK' }, { type: 'BACK' },
      { type: 'MEMO_SUBMIT', text: MEMO }, { type: 'MENU_KEY', n: 0 }, { type: 'BACK' }, { type: 'BACK' },
      { type: 'MENU_KEY', n: 2 }, { type: 'PURPOSE_SUBMIT', text: '다른 목적' }, { type: 'MEMO_SUBMIT', text: '' },
      { type: 'MENU_KEY', n: 5 },
    ];
    const steps = replay(events);
    const asks = effectsOf(steps).filter((e) => e.type === 'requestNotifyPermission');
    expect(asks).toHaveLength(1);
    expect(steps[steps.length - 1]?.after.confirm).toEqual({ plannedSec: 1800 });
  });
});
