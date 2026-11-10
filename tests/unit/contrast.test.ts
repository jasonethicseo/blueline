// Contrast of every Palette pair BLUELINE uses, with the Scanline_Layer over both text and
// background (design Req 1.7). The colors and the scan strengths are read from crt.css, so a
// palette change cannot slip below 4.5:1 unnoticed.
import { describe, expect, it } from 'vitest';
import css from '../../src/styles/crt.css?raw';

const palette = Object.fromEntries(
  [...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map(([, name, hex]) => [name as string, hex as string]),
);
const FAINT = Number(/--scan:\s*([\d.]+);/.exec(css)?.[1]);
const STRONG = Number(/--scan-strong:\s*([\d.]+);/.exec(css)?.[1]);

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** The Scanline_Layer is black at `alpha` over the pixel: each channel keeps (1 - alpha). */
const under = (hex: string, alpha: number): number[] => channels(hex).map((c) => c * (1 - alpha));
const lin = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: number[]): number => 0.2126 * lin(r as number) + 0.7152 * lin(g as number) + 0.0722 * lin(b as number);
/** Text sits under the faint layer only; the background may also have the strong layer behind the text. */
const ratio = (fg: string, bg: string, fgAlpha: number, bgAlpha = fgAlpha): number => {
  const [a, b] = [lum(under(fg, fgAlpha)), lum(under(bg, bgAlpha))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const blueText = ['text', 'text-dim', 'yellow', 'cyan', 'green'];
const blackText = [...blueText, 'red'];
// Pairs actually used. Red on bg-blue is 4.2:1, so red never appears on a blue screen.
const PAIRS: [fg: string, bg: string, alpha: number][] = [
  ...blueText.map((fg): [string, string, number] => [fg, 'bg-blue', FAINT]),
  ...blackText.map((fg): [string, string, number] => [fg, 'bg-black', FAINT]),
  ['bar-fg-black', 'bar-cyan', FAINT],
  ['bar-fg-black', 'yellow', FAINT], // the Purpose_Band
  ['text', 'hangup-red', FAINT],
  ['bg-black', 'text-dim', FAINT],
  ['bg-black', 'text', FAINT],
];

// Haunted_Screen: its text is under the faint layer; the background also has the strong lines behind the text.
const HAUNTED = ['text', 'text-dim', 'yellow', 'cyan', 'red'];

describe('contrast with the Scanline_Layer', () => {
  it('reads the palette and both scan strengths from crt.css', () => {
    expect(palette['bg-blue']).toBe('#0000aa');
    expect(palette['bg-haunted']).toBe('#00004a');
    expect(FAINT).toBeLessThanOrEqual(0.1);
    expect(STRONG).toBeGreaterThan(FAINT);
  });

  it.each(HAUNTED)('%s on bg-haunted, with the strong lines behind the text, is at least 4.5:1', (fg) => {
    const both = 1 - (1 - FAINT) * (1 - STRONG);
    expect(ratio(palette[fg] as string, palette['bg-haunted'] as string, FAINT, both)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PAIRS)('%s on %s under scan %s is at least 4.5:1', (fg, bg, alpha) => {
    const fgHex = fg === 'bar-fg-black' ? '#000000' : (palette[fg] as string);
    expect(fgHex, `${fg} is not in the palette`).toBeTruthy();
    expect(ratio(fgHex, palette[bg] as string, alpha)).toBeGreaterThanOrEqual(4.5);
  });
});
