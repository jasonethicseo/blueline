import { defineConfig, type Plugin } from 'vite';

// Production-only Content-Security-Policy (Req 10.2): nothing but this origin, and no
// fetch/XHR at all. The dev server injects inline scripts, so it is left out there.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspMeta(): Plugin {
  return {
    name: 'blueline-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  // Relative asset paths, so the build works from any sub-path (e.g. GitHub Pages /blueline/).
  base: './',
  plugins: [cspMeta()],
});
