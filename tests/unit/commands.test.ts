import { describe, expect, it } from 'vitest';
import {
  MSG_NOT_AVAILABLE, MSG_UNKNOWN, MSG_UNKNOWN_DESTINATION,
  acceptedCommands, parseCommand, resolveInput, type ViewName,
} from '../../src/core/commands';
import { DURATIONS } from '../../src/core/config';

describe('parseCommand (Req 12.15)', () => {
  it('parses the required examples', () => {
    expect(parseCommand('1')).toEqual({ type: 'command', command: { kind: 'number', n: 1 } });
    expect(parseCommand('2')).toEqual({ type: 'command', command: { kind: 'number', n: 2 } });
    expect(parseCommand('go yt')).toEqual({ type: 'command', command: { kind: 'go', alias: 'yt' } });
    expect(parseCommand('bye')).toEqual({ type: 'command', command: { kind: 'bye' } });
    expect(parseCommand('')).toEqual({ type: 'empty' });
    expect(parseCommand('xyz')).toEqual({ type: 'unknown' });
  });

  it('ignores case and surrounding whitespace', () => {
    expect(parseCommand(' BYE ')).toEqual({ type: 'command', command: { kind: 'bye' } });
    expect(parseCommand('Help')).toEqual({ type: 'command', command: { kind: 'help' } });
    expect(parseCommand(' GO  YT ')).toEqual({ type: 'command', command: { kind: 'go', alias: 'yt' } });
  });

  it('treats go with a missing or unknown alias as an unknown destination', () => {
    expect(parseCommand('go')).toEqual({ type: 'unknownDestination' });
    expect(parseCommand('go xx')).toEqual({ type: 'unknownDestination' });
    expect(parseCommand('go yt now')).toEqual({ type: 'unknownDestination' });
  });

  it('does not read other words or numbers as commands', () => {
    expect(parseCommand('gopher')).toEqual({ type: 'unknown' });
    expect(parseCommand('10')).toEqual({ type: 'unknown' });
    expect(parseCommand('byebye')).toEqual({ type: 'unknown' });
  });
});

describe('resolveInput', () => {
  it('shows UNKNOWN COMMAND for text that matches no Command (Req 12.3)', () => {
    expect(resolveInput('session', 'xyz')).toEqual({ kind: 'message', text: MSG_UNKNOWN });
  });

  it('shows UNKNOWN DESTINATION only on the Destination_Menu (Req 12.14)', () => {
    expect(resolveInput('destination', 'go xx')).toEqual({ kind: 'message', text: MSG_UNKNOWN_DESTINATION });
    expect(resolveInput('session', 'go xx')).toEqual({ kind: 'message', text: MSG_NOT_AVAILABLE });
  });

  it('rejects Commands the screen does not accept (Req 12.11)', () => {
    expect(resolveInput('dial', 'bye')).toEqual({ kind: 'message', text: MSG_NOT_AVAILABLE });
    expect(resolveInput('destination', 'back')).toEqual({ kind: 'message', text: MSG_NOT_AVAILABLE });
    expect(resolveInput('session', '1')).toEqual({ kind: 'message', text: MSG_NOT_AVAILABLE });
    expect(resolveInput('confirm', '3')).toEqual({ kind: 'message', text: MSG_NOT_AVAILABLE });
  });

  it('passes accepted Commands through', () => {
    expect(resolveInput('session', 'BYE')).toEqual({ kind: 'command', command: { kind: 'bye' } });
    expect(resolveInput('destination', 'go ig')).toEqual({ kind: 'command', command: { kind: 'go', alias: 'ig' } });
    expect(resolveInput('confirm', '0')).toEqual({ kind: 'command', command: { kind: 'number', n: 0 } });
    expect(resolveInput('confirm', 'back')).toEqual({ kind: 'command', command: { kind: 'back' } });
    // Numbers that match no menu item are still accepted; the menu shows INVALID SELECTION (Req 12.5).
    expect(resolveInput('duration', '9')).toEqual({ kind: 'command', command: { kind: 'number', n: 9 } });
  });

  it('returns none for empty text so Enter can do the screen default', () => {
    expect(resolveInput('confirm', '   ')).toEqual({ kind: 'none' });
  });
});

describe('help lines (Req 12.4, 12.9)', () => {
  const views: ViewName[] = ['dial', 'destination', 'urlEntry', 'duration', 'confirm', 'session', 'nocarrier', 'receipt'];

  it.each(views)('%s help is ALL-CAPS, one Command per line, and includes HELP', (view) => {
    const lines = acceptedCommands(view);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line).toBe(line.toUpperCase());
    expect(lines).toContain('HELP - SHOW COMMANDS');
    expect(resolveInput(view, 'help')).toEqual({ kind: 'help', lines });
  });

  it('numbers match the menu items on each menu screen', () => {
    expect(acceptedCommands('destination').slice(0, 3)).toEqual(['1 - YOUTUBE', '2 - INSTAGRAM', '3 - CUSTOM URL']);
    expect(acceptedCommands('duration').slice(0, DURATIONS.length)).toEqual(DURATIONS.map((d) => `${d.key} - ${d.label}`));
    expect(acceptedCommands('receipt')[0]).toBe('1 - DIAL AGAIN');
    expect(acceptedCommands('confirm')).toEqual(expect.arrayContaining(['ENTER - CONNECT', '0 - BACK', 'ESC - BACK']));
  });
});

describe('the Haunted_Screen (design Req 9.9)', () => {
  it('help lists FACE IT, other input says PRESS ENTER TO FACE IT, and empty Enter is left to the shell', () => {
    expect(resolveInput('haunted', '')).toEqual({ kind: 'none' });
    expect(resolveInput('haunted', 'help')).toEqual({ kind: 'help', lines: ['ENTER - FACE IT', 'HELP - SHOW COMMANDS'] });
    for (const text of ['y', '1', 'bye', 'zz', 'go yt']) {
      expect(resolveInput('haunted', text)).toEqual({ kind: 'message', text: 'PRESS ENTER TO FACE IT' });
    }
  });
});
