import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../../src/core/url';

describe('normalizeUrl examples', () => {
  it.each([
    ['youtube.com', 'https://youtube.com'],
    ['  youtube.com/feed  ', 'https://youtube.com/feed'],
    ['HTTPS://Example.com/a', 'HTTPS://Example.com/a'],
    ['http://example.com', 'http://example.com'],
    ['example.com:8080/x', 'https://example.com:8080/x'],
    ['sub.example.co.kr?q=1', 'https://sub.example.co.kr?q=1'],
    ['https://user@example.com:443/p', 'https://user@example.com:443/p'],
  ])('accepts %j as %j', (input, url) => {
    expect(normalizeUrl(input)).toEqual({ ok: true, url });
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp:x', 'MAILTO:a@b.com'])(
    'rejects %j as a non-http scheme',
    (input) => {
      expect(normalizeUrl(input)).toEqual({ ok: false, error: 'SCHEME' });
    },
  );

  it.each(['', '   ', '\t\n'])('rejects empty or whitespace-only %j as EMPTY', (input) => {
    expect(normalizeUrl(input)).toEqual({ ok: false, error: 'EMPTY' });
  });

  it.each([
    'http://',
    'https://:443/path',
    'http://user@/x',
    'http:example.com',
    'localhost',
    '-a.com',
    'a-.com',
    'example.com:0',
    'example.com:65536',
    'not a url',
  ])('rejects %j as INVALID', (input) => {
    expect(normalizeUrl(input)).toEqual({ ok: false, error: 'INVALID' });
  });

  it('rejects input longer than 2048 characters', () => {
    expect(normalizeUrl('https://example.com/' + 'a'.repeat(2049 - 20))).toEqual({ ok: false, error: 'INVALID' });
  });

  it('accepts exactly 2048 characters with a scheme', () => {
    const url = 'https://example.com/' + 'a'.repeat(2048 - 20);
    expect(url.length).toBe(2048);
    expect(normalizeUrl(url)).toEqual({ ok: true, url });
  });

  it('rejects a scheme-less host that the https:// prefix would push past 2048', () => {
    const text = 'example.com/' + 'a'.repeat(2048 - 12);
    expect(text.length).toBe(2048);
    expect(normalizeUrl(text)).toEqual({ ok: false, error: 'INVALID' });
  });
});
