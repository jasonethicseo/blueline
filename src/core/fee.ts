import { FEE_RATE } from './config';

/**
 * Fee in Fee_Units for a whole number of elapsed seconds:
 * ceil(elapsedSeconds / 60) × rate, and 0 for 0 seconds.
 * Callers pass a value already clamped by `elapsedSeconds` in time.ts.
 */
export function fee(elapsedSeconds: number, rate: number = FEE_RATE): number {
  if (!(elapsedSeconds > 0)) return 0;
  return Math.ceil(elapsedSeconds / 60) * rate;
}
