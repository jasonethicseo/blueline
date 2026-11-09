// Custom URL validation and normalization (Requirement 3). Pure.
import { MAX_URL_LENGTH } from './config';

export type UrlError = 'EMPTY' | 'SCHEME' | 'INVALID';
export type UrlResult = { ok: true; url: string } | { ok: false; error: UrlError };

const HTTPS_PREFIX = 'https://';

// A label: 1–63 ASCII letters, digits, or hyphens, not starting or ending with a hyphen.
const LABEL = '(?!-)[A-Za-z0-9-]{1,63}(?<!-)';
// Two or more labels, an optional :port, then an optional path / query / fragment.
const HOST_FORM = new RegExp(`^${LABEL}(?:\\.${LABEL})+(?::(\\d{1,5}))?(?:[/?#].*)?$`, 's');
// Text that starts like a host ("example.com:" or "example.com/") is a host attempt, not a scheme.
const HOST_START = new RegExp(`^${LABEL}(?:\\.${LABEL})+(?=[:/?#]|$)`);
const SCHEME = /^([A-Za-z][A-Za-z0-9+.-]*):/;
const HTTP_PREFIX = /^https?:\/\//i;

/** True if `text` is a scheme-less host with optional port and path (Req 3.3). */
export function isHostForm(text: string): boolean {
  const m = HOST_FORM.exec(text);
  if (!m) return false;
  const port = m[1];
  if (port === undefined) return true;
  const n = Number(port);
  return n >= 1 && n <= 65535;
}

/** Host part of an http(s) URL's authority: no userinfo, no port. */
function httpHost(text: string): string {
  const rest = text.replace(HTTP_PREFIX, '');
  const end = rest.search(/[/?#]/);
  const authority = end === -1 ? rest : rest.slice(0, end);
  const hostPort = authority.slice(authority.lastIndexOf('@') + 1);
  return hostPort.replace(/:\d*$/, '');
}

/**
 * Validate and normalize a user-entered Custom URL.
 * Accepted outputs always start with http:// or https:// and are accepted
 * unchanged when submitted again (Req 3.8).
 */
export function normalizeUrl(raw: string): UrlResult {
  const text = raw.trim();
  if (text === '') return { ok: false, error: 'EMPTY' };
  if (text.length > MAX_URL_LENGTH) return { ok: false, error: 'INVALID' };

  // Checked before scheme detection: "example.com:8080/x" also looks like a scheme.
  if (isHostForm(text)) {
    if (HTTPS_PREFIX.length + text.length > MAX_URL_LENGTH) return { ok: false, error: 'INVALID' };
    return { ok: true, url: HTTPS_PREFIX + text };
  }

  // A valid host with a bad port (e.g. "example.com:0") is INVALID, not a foreign scheme.
  if (HOST_START.test(text)) return { ok: false, error: 'INVALID' };

  const scheme = SCHEME.exec(text);
  if (!scheme) return { ok: false, error: 'INVALID' };

  const name = (scheme[1] ?? '').toLowerCase();
  if (name !== 'http' && name !== 'https') return { ok: false, error: 'SCHEME' };
  if (!HTTP_PREFIX.test(text) || httpHost(text) === '') return { ok: false, error: 'INVALID' };
  return { ok: true, url: text };
}
