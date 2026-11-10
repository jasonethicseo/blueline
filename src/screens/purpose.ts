// Purpose_Screen and Message_Screen (Requirements 1, 2, 3). The text field takes the place of
// the Command_Prompt here: every key, digits and Y/N/P included, is text, and words such as
// `back` are never run as Commands (Req 3.1, 3.2). Escape is handled once, in app/input.ts.
import type { AppState } from '../core/session';
import { el, item, line, mount, type ViewModel } from './view';

interface FieldSpec {
  title: string;
  label: string;
  id: string;
  value: string;
  hints: string[];
  submit(text: string): void;
}

function build(spec: FieldSpec, view: ViewModel, destination: string): Node[] {
  const form = el('form', 'screen');
  form.noValidate = true;
  const label = el('label', 'line', spec.label);
  label.htmlFor = spec.id;
  const input = el('input', 'text-field');
  input.id = spec.id;
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('enterkeyhint', 'next');
  // No maxLength: over-long text is rejected on Enter, so a Hangul composition is never cut (Req 1.5, 2.5).
  input.value = spec.value;
  const hintId = `${spec.id}-hint`;
  input.setAttribute('aria-describedby', hintId);

  // A Hangul input method can end a composition with an Enter key press. Chrome marks it
  // isComposing; Safari may send keyCode 229 instead. That press only commits the syllable;
  // the next Enter submits the whole text, once (Req 3.6, 3.7).
  let imeEnter = false;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') imeEnter = e.isComposing || e.keyCode === 229;
  });
  input.addEventListener('input', () => view.on.typing());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (imeEnter) {
      imeEnter = false;
      return;
    }
    spec.submit(input.value);
  });

  const hints = el('div', 'screen');
  hints.id = hintId;
  hints.append(...spec.hints.map((h) => line(h, 'dim')));
  form.append(line(spec.title, 'title'), line(`DESTINATION: ${destination}`, 'dim'), label, input, hints);
  // Focus after the form is in the document, as the URL entry does.
  queueMicrotask(() => input.focus());
  return [form, item('BACK', () => view.on.back(), 'action')];
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  const destination = state.destination?.label ?? '';
  if (state.textStep === 'purpose') {
    mount(root, 'purpose', () =>
      build(
        {
          title: 'STATE YOUR PURPOSE',
          label: 'PURPOSE:',
          id: 'purpose-input',
          // The Purpose accepted earlier, when coming back from the Message_Screen (Req 3.4).
          value: state.intent?.purpose ?? '',
          hints: ['ONE LINE, 1-60 CHARACTERS.', 'ENTER TO CONTINUE. ESC OR BACK TO RETURN.'],
          submit: (text) => view.on.purposeSubmit(text),
        },
        view,
        destination,
      ),
    );
    return;
  }
  mount(root, 'memo', () =>
    build(
      {
        title: 'MESSAGE TO FUTURE YOU',
        label: 'MESSAGE:',
        id: 'memo-input',
        // The Message written earlier, when coming back from the Duration_Menu (Req 3.5).
        value: state.intent?.memo ?? '',
        hints: [
          'SHOWN ONCE, WHEN THE LINE DROPS. UP TO 120 CHARACTERS.',
          'LEAVE EMPTY AND PRESS ENTER TO SKIP',
          'ESC OR BACK TO RETURN.',
        ],
        submit: (text) => view.on.memoSubmit(text),
      },
      view,
      destination,
    ),
  );
}
