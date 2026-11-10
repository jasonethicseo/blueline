// App entry: boot, page layout, screen router.
import './styles/crt.css';
import './styles/screens.css';
import { viewOf } from './core/commands';
import { createController, type Controller } from './app/controller';
import { attachInput, usedPointer } from './app/input';
import * as dial from './screens/dial';
import * as menu from './screens/menu';
import * as purpose from './screens/purpose';
import * as board from './screens/board';
import * as confirm from './screens/confirm';
import * as session from './screens/session';
import * as haunted from './screens/haunted';
import * as nocarrier from './screens/nocarrier';
import * as receipt from './screens/receipt';

const screen = document.getElementById('screen') as HTMLElement;
const message = document.getElementById('message') as HTMLElement;
const prompt = document.getElementById('prompt') as HTMLInputElement;
const form = document.getElementById('prompt-form') as HTMLFormElement;

function route(c: Controller): void {
  const state = c.state();
  const view = c.view();
  // Hold the last Session_Screen frame (00:00) briefly before NO CARRIER (Req 7.1).
  if (c.finalFrame()) return session.render(screen, state, view);
  switch (viewOf(state)) {
    case 'dial': return dial.render(screen, state, view);
    case 'destination':
    case 'urlEntry':
    case 'duration': return menu.render(screen, state, view);
    case 'board': return board.render(screen, state, view);
    case 'purpose':
    case 'memo': return purpose.render(screen, state, view);
    case 'confirm': return confirm.render(screen, state, view);
    case 'session': return session.render(screen, state, view);
    case 'haunted': return haunted.render(screen, state, view);
    case 'nocarrier':
    case 'nocarrierCheck': return nocarrier.render(screen, state, view);
    case 'receipt': return receipt.render(screen, state, view);
  }
}

function render(c: Controller): void {
  route(c);
  const text = c.state().message ?? '';
  if (message.textContent !== text) message.textContent = text;

  // The Purpose_Field and Message_Field replace the Command_Prompt (Req 11.1).
  const v = viewOf(c.state());
  const textScreen = v === 'purpose' || v === 'memo';
  if (form.hidden !== textScreen) form.hidden = textScreen;

  // Keep keyboard focus in the Command_Prompt when a re-render removed the focused element
  // (Req 4.7, 12.12). Skip after taps so phones do not pop up the keyboard, and skip screens
  // that focus their own field (URL entry, Purpose, Message, popup link).
  const state = c.state();
  const ownFocus = state.urlEntry || state.pending?.blocked || textScreen;
  const lost = !document.activeElement || document.activeElement === document.body;
  if (lost && !ownFocus && !usedPointer()) prompt.focus({ preventScroll: true });
}

const controller = createController(render);
attachInput(controller, prompt, form);
controller.refresh();
prompt.focus({ preventScroll: true });
