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

/** Longest Purpose and Message, in Characters (Unicode code points) after trimming (Req 1.3, 2.4). */
export const MAX_PURPOSE = 60;
export const MAX_MEMO = 120;

/** Posts per Board_Page (Req 7.4). */
export const BOARD_PAGE_SIZE = 20;

/** Shown wherever a Purpose would be, for a Session_Record that has none (Req 1.9, 6.1, 7.3). */
export const NO_PURPOSE = '(NO PURPOSE)';

/** Outcome_Labels: the receipt and the Board at 600 px and wider (Req 6.1, 6.2, 7.3). */
export const OUTCOME_LABEL = { DONE: 'DONE', DRIFTED: 'DRIFTED', 'NO ANSWER': 'NO ANSWER' } as const;

/** Outcome_Short_Forms: the Board on a Narrow viewport only (Req 7.3). */
export const OUTCOME_SHORT = { DONE: 'Y', DRIFTED: 'N', 'NO ANSWER': '?' } as const;

/** Widest Narrow viewport in CSS px; crt.css uses the same number in its media query. */
export const NARROW_MAX_PX = 599;

export function durationBySeconds(seconds: number): DurationOption | undefined {
  return DURATIONS.find((d) => d.seconds === seconds);
}

export function durationByKey(key: number): DurationOption | undefined {
  return DURATIONS.find((d) => d.key === key);
}
