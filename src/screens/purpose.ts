// Purpose_Screen and Message_Screen (design Requirements 5, 6; core Requirements 1, 2, 3). The text field
// takes the place of the Command_Prompt here: every key, digits and Y/N/P included, is text, and words
// such as `back` are never run as Commands. Escape is handled once, in app/input.ts.
import { MAX_MEMO, MAX_PURPOSE } from '../core/config';
import { charCounter } from '../core/display';
import type { AppState } from '../core/session';
import { sysopNotice } from '../core/summary';
import { box } from './box';
import { el, item, line, mount, type ViewModel } from './view';

interface FieldSpec {
  id: string;
  title: string;
  /** Korean hint with its English meaning (Req 1.5). */
  hints: string[];
  label: string;
  max: number;
  value: string;
  yellow: boolean;
  /** Shown read-only above the field (the Message_Screen). */
  purpose?: string;
  sysop: boolean;
  submit(text: string): void;
}

function build(spec: FieldSpec, view: ViewModel): Node[] {
  const form = el('form', 'screen purpose-form');
  form.noValidate = true;
  const label = el('label', 'line cyan', spec.label);
  label.htmlFor = spec.id;
  const input = el('input', spec.yellow ? 'text-field field-yellow' : 'text-field');
  input.id = spec.id;
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('enterkeyhint', 'next');
  // No maxLength: over-long text is rejected on submit, so a Hangul composition is never cut.
  input.value = spec.value;

  const counter = el('span', 'counter');
  counter.id = `${spec.id}-count`;
  const update = () => {
    const c = charCounter(input.value, spec.max);
    if (counter.textContent !== c.text) counter.textContent = c.text;
    counter.classList.toggle('over', c.over);
  };
  update();
  input.setAttribute('aria-describedby', counter.id);

  // A Hangul input method can end a composition with an Enter key press. Chrome marks it isComposing;
  // Safari may send keyCode 229 instead. That press only commits the syllable; the next Enter submits
  // the whole text, once.
  let imeEnter = false;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') imeEnter = e.isComposing || e.keyCode === 229;
  });
  // On every input event, also during a composition (Req 5.2).
  input.addEventListener('input', () => {
    update();
    view.on.typing();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (imeEnter) {
      imeEnter = false;
      return;
    }
    spec.submit(input.value);
  });

  const row = el('div', 'field-row');
  row.append(input, counter);
  form.append(line(spec.title, 'display-s title'), ...spec.hints.map((h) => line(h, 'dim')));
  if (spec.purpose !== undefined) {
    const shown = el('div', 'readonly-purpose');
    shown.append(line('YOUR PURPOSE', 'dim'), line(spec.purpose));
    form.append(shown);
  }
  form.append(label, row);
  if (spec.sysop) {
    const n = sysopNotice(view.stored, view.now);
    form.append(box([line('SYSOP NOTICE'), line(n.ko, 'dim'), line(n.en, 'dim')], 'dashed'));
  }

  // ENTER · NEXT submits exactly as Enter does; a click is never an IME Enter (Req 5.5).
  const next = item('ENTER · NEXT', () => {
    imeEnter = false;
    form.requestSubmit();
  }, 'action fill');
  const buttons = el('div', 'choices');
  buttons.append(item('ESC · BACK', () => view.on.back(), 'action'), next);
  form.append(buttons);
  // Focus after the form is in the document, as the URL entry does.
  queueMicrotask(() => input.focus());
  return [form];
}

export function render(root: HTMLElement, state: AppState, view: ViewModel): void {
  if (state.textStep === 'purpose') {
    mount(root, 'purpose', () =>
      build({
        id: 'purpose-input',
        title: '[ STATE YOUR PURPOSE ]',
        hints: ['무엇을 하러 들어가십니까? (WHAT ARE YOU HERE TO DO?)'],
        label: `PURPOSE (REQUIRED · 1–${MAX_PURPOSE} CHARS)`,
        max: MAX_PURPOSE,
        // The Purpose accepted earlier, when coming back from the Message_Screen (Req 3.4).
        value: state.intent?.purpose ?? '',
        yellow: false,
        sysop: true,
        submit: (text) => view.on.purposeSubmit(text),
      }, view),
    );
    return;
  }
  mount(root, 'memo', () =>
    build({
      id: 'memo-input',
      title: '[ MESSAGE TO FUTURE YOU ]',
      hints: [
        '회선이 끊길 때 도착합니다 (ARRIVES WHEN THE LINE DROPS, SHOWN ONCE)',
        'EMPTY + ENTER SKIPS IT.',
      ],
      label: `MESSAGE (OPTIONAL · ARRIVES AT NO CARRIER · UP TO ${MAX_MEMO} CHARS)`,
      max: MAX_MEMO,
      // The Message written earlier, when coming back from the Duration_Menu (Req 3.5).
      value: state.intent?.memo ?? '',
      yellow: true,
      purpose: state.intent?.purpose ?? '',
      sysop: false,
      submit: (text) => view.on.memoSubmit(text),
    }, view),
  );
}
