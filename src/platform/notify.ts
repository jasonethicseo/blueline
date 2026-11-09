// Browser notifications (Requirement 7.3–7.5). Failures are silent; the caller falls back
// to tab-title flashing.

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission(): Permission {
  if (!isSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Ask for permission if the user has not answered yet. Not awaited, so the caller's
 * screen renders at once. Supports both the promise and the old callback form.
 */
export function requestIfDefault(): void {
  if (permission() !== 'default') return;
  try {
    const result = Notification.requestPermission(() => {}) as Promise<NotificationPermission> | undefined;
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Unsupported in this context (e.g. no user gesture); the fallback covers it.
  }
}

/** Show one notification. False if not permitted or the constructor throws (e.g. Android Chrome). */
export function show(title: string, body: string): boolean {
  if (permission() !== 'granted') return false;
  try {
    new Notification(title, { body, tag: 'blueline-no-carrier' });
    return true;
  } catch {
    return false;
  }
}
