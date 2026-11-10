// Command_Prompt submit, Enter with an empty prompt, and Escape, mapped to handlers
// (core Requirement 12; purpose-board Requirement 3). Split out of controller.ts to keep
// both files under about 200 lines. Runs inside the user's key press, so window.open
// for the popup-blocked link keeps the user activation.
import { resolveInput, viewOf } from '../core/commands';
import type { AppState, Event } from '../core/session';
import * as open from '../platform/open';
import type { Handlers } from '../screens/view';

export interface KeyContext {
  state(): AppState;
  dispatch(e: Event): void;
  handlers: Handlers;
}

export interface Keys {
  /** Command_Prompt submit. Empty text runs the screen's Enter action. */
  submit(text: string): void;
  escape(): void;
}

export function createKeys(c: KeyContext): Keys {
  const h = c.handlers;

  function enter(): void {
    const state = c.state();
    switch (viewOf(state)) {
      case 'dial': h.dial(); return;
      case 'confirm':
        if (!state.pending) h.confirm();
        else if (state.pending.blocked && state.destination && open.openInNewTab(state.destination.url)) h.linkOpened();
        return;
      case 'nocarrier': h.noCarrierDone(); return;
      default: return;
    }
  }

  function submit(text: string): void {
    const action = resolveInput(viewOf(c.state()), text);
    if (action.kind === 'none') return enter();
    if (action.kind === 'message') return c.dispatch({ type: 'MESSAGE', text: action.text });
    if (action.kind === 'help') return c.dispatch({ type: 'MESSAGE', text: action.lines.join('\n') });
    const cmd = action.command;
    if (cmd.kind === 'number') return h.menu(cmd.n);
    if (cmd.kind === 'bye') return h.hangUp();
    if (cmd.kind === 'back') return h.back();
    if (cmd.kind === 'go') return c.dispatch({ type: 'GO', alias: cmd.alias });
  }

  // Escape works wherever focus is (core Req 8.2, 4.8; Req 3.3, 3.4). input.ts has already
  // skipped key presses that belong to an input method composition (Req 3.6).
  function escape(): void {
    const state = c.state();
    const v = viewOf(state);
    if (v === 'session') h.hangUp();
    else if (v === 'confirm' && !state.pending) h.back();
    else if (v === 'purpose' || v === 'memo') h.back();
  }

  return { submit, escape };
}
