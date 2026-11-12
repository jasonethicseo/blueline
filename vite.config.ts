import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

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
  // Served from GitHub Pages at https://jasonethicseo.github.io/blueline/, so every asset URL starts
  // with the repository name. `npm run dev` and `vite preview` use the same path.
  base: '/blueline/',
  // The real version, shown in the Status_Bar (design Req 2.2).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [cspMeta()],
});
