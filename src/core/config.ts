// The one place for tunable constants. Pure data: no DOM, no clock.

/** Fee_Units (fictional ₩) charged per started minute. */
export const FEE_RATE = 40;

export interface DurationOption {
  /** Menu number on the Duration_Menu. */
  readonly key: number;
  readonly seconds: number;
  /** Label on the Duration_Menu. */
  readonly label: string;
  /** Label on the confirm screen and receipt. */
  readonly short: string;
}

export const DURATIONS: readonly DurationOption[] = [
  { key: 1, seconds: 60, label: '1 MIN (DEMO)', short: '1 MIN' },
  { key: 2, seconds: 300, label: '5 MIN', short: '5 MIN' },
  { key: 3, seconds: 600, label: '10 MIN', short: '10 MIN' },
  { key: 4, seconds: 900, label: '15 MIN', short: '15 MIN' },
  { key: 5, seconds: 1800, label: '30 MIN', short: '30 MIN' },
];

/** Longest Planned_Duration in seconds. */
export const MAX_PLANNED_SECONDS = 1800;

export type PresetLabel = 'YOUTUBE' | 'INSTAGRAM';

export const PRESETS: Readonly<Record<PresetLabel, string>> = {
  YOUTUBE: 'https://www.youtube.com/',
  INSTAGRAM: 'https://www.instagram.com/',
};

export type Alias = 'yt' | 'ig';

export const ALIASES: Readonly<Record<Alias, PresetLabel>> = {
  yt: 'YOUTUBE',
  ig: 'INSTAGRAM',
};

/** Fictional dial number (10 digits). */
export const DIAL_TEXT = 'ATDT 0145550199';

export const TIMING = {
  /** Delay between typed characters of DIAL_TEXT. */
  charMs: 60,
  /** Length of the synthesized handshake. */
  handshakeMs: 4000,
  /** Delay from CONNECT to the Destination_Menu. */
  connectToMenuMs: 800,
  /** Final 00:00 session frame before NO CARRIER. */
  finalFrameMs: 500,
  /** NO CARRIER display before the receipt. */
  noCarrierMs: 3000,
  /** Render / tick interval while connected. */
  tickMs: 250,
} as const;

export const MAX_URL_LENGTH = 2048;
export const MAX_PROMPT_LENGTH = 32;
export const MAX_HISTORY = 1000;

export function durationBySeconds(seconds: number): DurationOption | undefined {
  return DURATIONS.find((d) => d.seconds === seconds);
}

export function durationByKey(key: number): DurationOption | undefined {
  return DURATIONS.find((d) => d.key === key);
}
