// Page visibility and tab-title flashing (Requirement 6.9, 7.5, 7.12, 7.13).

export const NORMAL_TITLE = 'BLUELINE';
export const ALERT_TITLE = 'NO CARRIER';
const FLASH_MS = 1000;

export function isVisible(): boolean {
  return document.visibilityState === 'visible';
}

/**
 * Call `cb` whenever the user may have come back to the tab: visibilitychange to visible,
 * pageshow (back/forward cache, iPhone Safari resume), and window focus.
 * Returns a function that removes the listeners.
 */
export function onResume(cb: () => void): () => void {
  const onVisibility = () => {
    if (isVisible()) cb();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', cb);
  window.addEventListener('focus', cb);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', cb);
    window.removeEventListener('focus', cb);
  };
}

let flashTimer: ReturnType<typeof setInterval> | undefined;

/** Alternate the tab title between NO CARRIER and BLUELINE every second. */
export function startTitleFlash(): void {
  if (flashTimer !== undefined) return;
  let alert = true;
  document.title = ALERT_TITLE;
  flashTimer = setInterval(() => {
    alert = !alert;
    document.title = alert ? ALERT_TITLE : NORMAL_TITLE;
  }, FLASH_MS);
}

export function stopTitleFlash(): void {
  if (flashTimer !== undefined) clearInterval(flashTimer);
  flashTimer = undefined;
  document.title = NORMAL_TITLE;
}

export function isTitleFlashing(): boolean {
  return flashTimer !== undefined;
}
