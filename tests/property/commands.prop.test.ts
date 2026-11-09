// Feature: blueline-core-flow, Property 6: Command parsing ignores case and surrounding whitespace
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseCommand } from '../../src/core/commands';

const canonical = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'bye', 'back', 'help', 'go yt', 'go ig'];
const ws = fc.array(fc.constantFrom(' ', '\t', '\n', '\u00a0'), { maxLength: 4 }).map((a) => a.join(''));
const innerSpace = fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 3 }).map((a) => a.join(''));
const flips = fc.array(fc.boolean(), { minLength: 1, maxLength: 6 });

const randomCase = (s: string, f: boolean[]) =>
  s.split('').map((ch, i) => (f[i % f.length] ? ch.toUpperCase() : ch)).join('');

describe('Property 6: Command parsing ignores case and surrounding whitespace', () => {
  it('returns the canonical Command for any casing and padding', () => {
    fc.assert(
      fc.property(fc.constantFrom(...canonical), ws, ws, innerSpace, flips, (cmd, left, right, inner, f) => {
        const body = randomCase(cmd.replace(' ', inner), f);
        expect(parseCommand(left + body + right)).toEqual(parseCommand(cmd));
        expect(parseCommand(cmd).type).toBe('command');
      }),
      { numRuns: 500 },
    );
  });

  it('returns empty for whitespace-only text', () => {
    fc.assert(
      fc.property(ws, (s) => {
        expect(parseCommand(s)).toEqual({ type: 'empty' });
      }),
    );
  });
});
