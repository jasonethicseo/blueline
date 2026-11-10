// Haunted line: when it shows, how strong it is, and where the ghosts sit. Pure: `now` is passed in,
// and there is no randomness, so the same Purpose and level always give the same layout.
import { DEMO_PLANNED_SEC, HAUNT } from './config';
import type { NewRecord } from './record';

export interface HauntTiming {
  readonly graceSec: number;
  readonly fullSec: number;
}

/** The demo timing for the 1 MIN (DEMO) Planned_Duration, the normal timing otherwise. */
export function hauntTiming(plannedSec: number): HauntTiming {
  return plannedSec === DEMO_PLANNED_SEC ? HAUNT.demo : HAUNT.normal;
}

/** True for a Time_Up with a Purpose, seen at least the Grace_Period after the drop (Req 9.1, 9.2). */
export function shouldHaunt(record: NewRecord, now: number): boolean {
  if (record.reason !== 'TIME UP' || record.purpose === null) return false;
  return now - record.end >= hauntTiming(record.plannedSec).graceSec * 1000;
}

/** 0 at the drop, 1 at the Haunt_Full_Time or later; never decreases with the drift (Req 9.6). */
export function hauntLevel(driftMs: number, plannedSec: number): number {
  if (!Number.isFinite(driftMs) || driftMs <= 0) return 0;
  return Math.min(1, driftMs / (hauntTiming(plannedSec).fullSec * 1000));
}

export interface Ghost {
  text: string;
  /** Position in % of the screen (left, top). */
  x: number;
  y: number;
  /** Degrees. */
  rotate: number;
  /** CSS px, a multiple of 11. */
  size: number;
  /** Letter spacing in px. */
  spacing: number;
  opacity: number;
}

type Variant = 'plain' | 'corrupt1' | 'last' | 'twice' | 'echo' | 'corrupt2';

interface Slot {
  variant: Variant;
  x: number;
  y: number;
  rotate: number;
  size: number;
  spacing: number;
  /** Opacity at level 1. */
  base: number;
}

// Taken from the Haunted mockup (960 x 600), sizes moved to multiples of 11.
const SLOTS: readonly Slot[] = [
  { variant: 'plain', x: 54, y: 12, rotate: -6, size: 44, spacing: 6, base: 0.55 },
  { variant: 'corrupt1', x: 62, y: 42, rotate: 4, size: 22, spacing: 0, base: 0.4 },
  { variant: 'last', x: 49, y: 67, rotate: -2, size: 55, spacing: 10, base: 0.3 },
  { variant: 'twice', x: 6, y: 78, rotate: 8, size: 22, spacing: 0, base: 0.35 },
  { variant: 'echo', x: 73, y: 87, rotate: 0, size: 22, spacing: 0, base: 0.5 },
  { variant: 'corrupt2', x: 8, y: 20, rotate: -4, size: 33, spacing: 3, base: 0.25 },
];

/** The most ghosts the layout can show. */
export const MAX_GHOSTS = SLOTS.length;

export const GHOST_ASCII = '   .-.\n  (o o)\n  | O \\\n   \\   \\\n    `~~~\'';

/** FNV-1a over UTF-16 units; a small, stable hash. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

/** Replace one or two Characters, picked by a hash of the Purpose, with `▒` or `█`. */
function corrupt(purpose: string, salt: string): string {
  const chars = [...purpose];
  if (chars.length === 0) return purpose;
  const h = hash(salt + purpose);
  const picks = chars.length > 3 ? 2 : 1;
  for (let k = 0; k < picks; k++) {
    const at = (h >>> (k * 8)) % chars.length;
    chars[at] = (h >>> (k * 8 + 4)) % 2 === 0 ? '▒' : '█';
  }
  return chars.join('');
}

function lastWord(purpose: string): string {
  return purpose.split(/\s+/).filter(Boolean).at(-1) ?? purpose;
}

function textFor(variant: Variant, purpose: string): string {
  switch (variant) {
    case 'plain': return purpose;
    case 'corrupt1': return corrupt(purpose, 'a');
    case 'last': return lastWord(purpose);
    case 'twice': return `${purpose} ${purpose}`;
    case 'echo': return `…${lastWord(purpose)}…${lastWord(purpose)}`;
    case 'corrupt2': return corrupt(purpose, 'b');
  }
}

/**
 * `ceil(6 × level)` ghosts, opacity `base × level`. Level 0 gives none; level 1 gives all six.
 * A level outside 0..1 (or NaN) is clamped.
 */
export function ghostLayout(purpose: string, level: number): Ghost[] {
  const lv = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
  const shown = Math.ceil(MAX_GHOSTS * lv);
  return SLOTS.slice(0, shown).map((s) => ({
    text: textFor(s.variant, purpose),
    x: s.x,
    y: s.y,
    rotate: s.rotate,
    size: s.size,
    spacing: s.spacing,
    opacity: Math.min(1, s.base * lv),
  }));
}
