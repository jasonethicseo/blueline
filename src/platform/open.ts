// Opening the Destination (Requirement 5). Must be called synchronously inside the
// user's key press or tap handler so popup blockers allow it.

/**
 * Open `url` unchanged in a new tab. Returns false if the browser blocked it.
 * The `noopener` window feature would make window.open always return null and hide
 * blocking, so the opener is cleared right after opening instead (Req 5.3).
 */
export function openInNewTab(url: string): boolean {
  let w: Window | null;
  try {
    w = window.open(url, '_blank');
  } catch {
    return false;
  }
  if (!w || w.closed) return false;
  try {
    w.opener = null;
  } catch {
    // Some browsers do not allow the assignment; the tab is still open.
  }
  return true;
}
