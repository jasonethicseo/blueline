---
inclusion: always
---

# Tech

## Stack
- **Language / build**: TypeScript + Vite. No UI framework (vanilla DOM) — the app is small and should load instantly.
- **Tests**: Vitest for unit tests, fast-check for property-based tests.
- **Hosting**: static site (GitHub Pages or AWS Amplify Hosting). No backend.
- **Font**: an open-licensed monospace / pixel font with Korean glyphs (e.g., D2Coding or Galmuri). Verify the license (OFL) and include its license file in the repo.

## Hard constraints
- **Time**: never count timer ticks. Store the session start timestamp and compute `elapsed = now - start` on every render. Background tabs throttle timers, so tick counting drifts.
- **Pure core**: fee, session state, command parsing, and history aggregation are pure functions in `src/core`. They never touch the DOM and never call `Date.now()` themselves — `now` is passed in as an argument. This keeps them property-testable.
- **Audio**: synthesize every sound with the Web Audio API (oscillators, noise). Do not ship recorded modem sound files (copyright). Create or resume the `AudioContext` only inside a user gesture.
- **Opening destinations**: call `window.open` directly inside the user's click / keypress handler so popup blockers allow it. Use plain `https` URLs so mobile browsers can hand off to the native app.
- **Notifications**: request permission when the user picks the session duration, inside that key press / tap, not after the session starts. Connecting is a second user action: a `CONNECT? PRESS ENTER` confirmation screen (with a tappable CONNECT button) calls `window.open` on Enter or tap. Keeping the permission request and `window.open` in separate gestures stops one from using up the user activation the other needs. If permission is denied or unsupported, fall back to tab-title flashing + sound + the on-screen `NO CARRIER` when the user returns.
- **Background tabs**: the "alert within 60 seconds of time-up while hidden" guarantee is for desktop browsers only. Safari on iPhone pauses background tabs, so there the user sees `NO CARRIER` and the receipt when they come back to the BLUELINE tab. The fee still uses the scheduled end time.
- **Storage**: `localStorage` only. Wrap every read and write in try/catch. The app must still work when storage is unavailable (history simply won't persist).
- **Accessibility**: screen text is real DOM text, not canvas. Respect `prefers-reduced-motion` for CRT flicker / scanline effects.
- **Network**: no runtime network calls besides loading the page and its static assets.

## Fee model (defaults, configurable in one place)
- Rate: ₩40 per started minute (fictional currency).
- `fee(elapsedSeconds) = ceil(elapsedSeconds / 60) * rate`, and `fee(0) = 0`.

## Testing expectations
- **Property tests**
  - fee: never negative; non-decreasing as elapsed time grows; always a multiple of the rate; zero at zero.
  - elapsed formatting (`mm:ss`): never negative; parsing the formatted string returns the same whole seconds.
  - session state machine: once `ENDED`, no transition goes back to `CONNECTED`.
  - history: today's total equals the sum of today's receipts; the week total is ≥ today's total.
- **Unit tests**
  - command parser: `1`, `2`, `go yt`, `bye`, empty input, unknown input.

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm test` — run all tests once
