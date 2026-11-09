// Feature: blueline-core-flow, Property 4: URL normalizer accepts only http(s) and is idempotent
// Feature: blueline-core-flow, Property 5: Non-http schemes are rejected
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalizeUrl } from '../../src/core/url';
import { MAX_URL_LENGTH } from '../../src/core/config';

const alnum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
const labelChars = [...alnum, '-'];

// A valid DNS-style label: 1–63 chars, no leading or trailing hyphen.
const label = fc
  .tuple(
    fc.constantFrom(...alnum),
    fc.array(fc.constantFrom(...labelChars), { maxLength: 20 }),
    fc.constantFrom(...alnum),
    fc.boolean(),
  )
  .map(([first, mid, last, single]) => (single ? first : first + mid.join('') + last));

const host = fc.array(label, { minLength: 2, maxLength: 4 }).map((ls) => ls.join('.'));
const port = fc.option(fc.integer({ min: 1, max: 65535 }).map((n) => `:${n}`), { nil: '' });
const path = fc.option(
  fc.tuple(fc.constantFrom('/', '?', '#'), fc.string({ maxLength: 40 })).map(([c, s]) => c + s),
  { nil: '' },
);
const hostForm = fc.tuple(host, port, path).map(([h, p, q]) => h + p + q);

// Strings that are likely to hit every branch of the normalizer.
const anyInput = fc.oneof(
  fc.string({ maxLength: 60 }),
  hostForm,
  fc.tuple(fc.constantFrom('http://', 'HTTPS://', 'https://', 'Http://'), fc.string({ maxLength: 60 }))
    .map(([s, r]) => s + r),
  fc.tuple(fc.constantFrom(' ', '\t', '\n', ''), hostForm, fc.constantFrom(' ', '\n', ''))
    .map(([a, b, c]) => a + b + c),
);

describe('Property 4: URL normalizer accepts only http(s) and is idempotent', () => {
  it('accepted output starts with http(s)://, fits 2048, and is a fixed point', () => {
    fc.assert(
      fc.property(anyInput, (input) => {
        const r = normalizeUrl(input);
        if (!r.ok) return;
        expect(r.url).toMatch(/^https?:\/\//i);
        expect(r.url.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
        expect(normalizeUrl(r.url)).toEqual({ ok: true, url: r.url });
      }),
      { numRuns: 500 },
    );
  });

  it('prefixes a scheme-less host with https:// after trimming', () => {
    fc.assert(
      fc.property(hostForm, fc.constantFrom('', ' ', '  \t'), (h, pad) => {
        const input = pad + h + pad;
        expect(normalizeUrl(input)).toEqual({ ok: true, url: 'https://' + input.trim() });
      }),
      { numRuns: 300 },
    );
  });
});

describe('Property 5: Non-http schemes are rejected', () => {
  const lower = 'abcdefghijklmnopqrstuvwxyz'.split('');
  // No dots, so "<scheme>:<rest>" can never be read as host:port.
  const generated = fc
    .tuple(fc.constantFrom(...lower), fc.array(fc.constantFrom(...lower, '0', '9', '+', '-'), { maxLength: 10 }))
    .map(([a, b]) => a + b.join(''));
  const scheme = fc
    .oneof(fc.constantFrom('javascript', 'data', 'file', 'ftp', 'mailto'), generated)
    .filter((s) => s !== 'http' && s !== 'https');
  const randomCase = (s: string, flips: boolean[]) =>
    s.split('').map((ch, i) => (flips[i % flips.length] ? ch.toUpperCase() : ch)).join('');

  it('returns SCHEME for any other scheme in any letter case', () => {
    fc.assert(
      fc.property(scheme, fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }), fc.string({ maxLength: 80 }),
        (s, flips, rest) => {
          expect(normalizeUrl(`${randomCase(s, flips)}:${rest}`)).toEqual({ ok: false, error: 'SCHEME' });
        }),
      { numRuns: 500 },
    );
  });
});
