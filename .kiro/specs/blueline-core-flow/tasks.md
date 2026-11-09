# Implementation Plan: BLUELINE Core Flow

## Overview

Build the pure core first and cover it with property and unit tests, then the browser edges (platform, audio), then the screens, and finally the shell (`src/app`) that connects them. Each step builds on the previous one, and the last code step wires everything into `main.ts`. Manual browser checks and the README come last.

Conventions for every task:

- `src/core` files import nothing from `app`, `screens`, `audio`, or `platform`, and never call `Date.now()`, timers, or DOM APIs.
- Keep each file under about 200 lines.
- Property tests use fast-check with at least 100 runs and start with `// Feature: blueline-core-flow, Property N: <title>`.

## Tasks

- [x] 1. Set up the project
  - Run `git init`. Add a `.gitignore` for `node_modules/`, `dist/`, and `coverage/`. It must not ignore `/.kiro` or any of its subfolders.
  - Create a Vite + TypeScript project with no UI framework: `package.json` with scripts `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `test` (`vitest --run`); `tsconfig.json` with `strict: true`; dev dependencies `vite`, `typescript`, `vitest`, `fast-check`.
  - Add `vitest.config.ts` that sets `process.env.TZ = 'Asia/Seoul'` and a second test project that runs `tests/property/history.prop.test.ts` with `TZ = 'America/New_York'`.
  - Create the folder layout from `structure.md` with empty entry files: `index.html`, `src/main.ts`, `src/styles/crt.css`, `tests/unit/`, `tests/property/`, `public/fonts/`.
  - Add the MIT `LICENSE`.
  - _Requirements: 13.5_

- [x] 2. Core constants, fee, and time
  - [x] 2.1 Create `src/core/config.ts`
    - `FEE_RATE`, `DURATIONS`, `PRESETS`, `ALIASES`, `DIAL_TEXT`, `TIMING`, `MAX_URL_LENGTH`, `MAX_PROMPT_LENGTH`, `MAX_HISTORY` as in the design.
    - _Requirements: 4.1, 4.3, 6.3, 10.10_
  - [x] 2.2 Implement `src/core/fee.ts`
    - `fee(elapsedSeconds, rate = FEE_RATE)` = `ceil(s / 60) × rate`, `fee(0) = 0`.
    - _Requirements: 6.3, 6.7_
  - [x] 2.3 Write property test for fee
    - **Property 1: Fee formula and laws**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7**
  - [x] 2.4 Implement `src/core/time.ts`
    - `elapsedSeconds`, `remainingSeconds` with clamping to `0..plannedSec` and `now < start → 0`; `formatMMSS`; `parseMMSS` returning `null` for malformed text.
    - _Requirements: 6.3, 6.11, 6.12, 6.13, 6.14_
  - [x] 2.5 Write property tests for time
    - **Property 2: MM:SS format round trip**
    - **Property 3: Elapsed and remaining are clamped**
    - **Validates: Requirements 6.3, 6.11, 6.12, 6.13, 6.14, 6.15**

- [x] 3. URL normalizer
  - [x] 3.1 Implement `src/core/url.ts`
    - `normalizeUrl(raw)` following the four-step algorithm in the design, including the `host:port` exception to scheme detection and the `8 + length > 2048` rejection that keeps idempotence.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_
  - [x] 3.2 Write property tests for the URL normalizer
    - **Property 4: URL normalizer accepts only http(s) and is idempotent**
    - **Property 5: Non-http schemes are rejected**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8**
  - [x] 3.3 Write unit tests for URL examples
    - `youtube.com` → `https://youtube.com`, `HTTPS://Example.com/a` unchanged, `example.com:8080/x`, `javascript:alert(1)` → `SCHEME`, `http://` → `INVALID`, `localhost`, `-a.com`, whitespace-only → `EMPTY`, a 2049-character input → `INVALID`.
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Command parser
  - [x] 4.1 Implement `src/core/commands.ts`
    - `parseCommand(text)` returning `empty`, `command`, `unknownDestination`, or `unknown`.
    - `acceptedCommands(view)` returning the `help` lines for each view in the design's accepted-commands table, including the Connect confirm view (`0`, `back`, Escape, `help`, Enter).
    - _Requirements: 8.1, 12.2, 12.3, 12.4, 12.14, 12.15, 12.16_
  - [x] 4.2 Write property test for command parsing
    - **Property 6: Command parsing ignores case and surrounding whitespace**
    - **Validates: Requirements 8.1, 12.2**
  - [x] 4.3 Write unit tests for the command parser
    - `1`, `2`, `go yt`, `bye`, empty, `xyz` (Req 12.15); plus `go`, `go xx`, ` BYE `, `Help`, ` GO  YT `.
    - Help lines for every view match the accepted-commands table.
    - _Requirements: 12.2, 12.4, 12.14, 12.15_

- [x] 5. Records and history
  - [x] 5.1 Implement `src/core/record.ts`
    - `SessionRecord` and `ActiveSession` types; `serializeHistory`, `parseHistory` (whole-text rejection rules), `serializeActive`, `parseActive`. No URL field anywhere.
    - _Requirements: 10.1, 10.3, 10.4, 11.5_
  - [x] 5.2 Write property tests for records
    - **Property 12: History serialization round trip**
    - **Property 13: Unreadable history is rejected as a whole**
    - **Validates: Requirements 10.3, 10.4, 10.5**
  - [x] 5.3 Implement `src/core/history.ts`
    - `periodStarts(now)` with local midnight and the most recent Monday; `totals(records, now)`; `appendRecord` keeping the newest 1000; `buildReceipt` with the `reset` and `unavailable` notices.
    - _Requirements: 9.3, 9.4, 10.6, 10.7, 10.10_
  - [x] 5.4 Write property tests for history
    - **Property 11: Today and week totals**
    - **Property 18: History keeps the newest 1000 records**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.6, 10.3, 10.10**
  - [x] 5.5 Write unit tests for period boundaries and receipt notices
    - `periodStarts` on a Monday, on a Sunday, and one second after midnight.
    - `buildReceipt` for `ok`, `reset`, and `unavailable` history status (totals from the current record only for `unavailable`).
    - _Requirements: 9.3, 9.4, 10.6, 10.7_

- [x] 6. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Session state machine
  - [x] 7.1 Implement `src/core/session.ts`: types, `initialState`, and the dial and menu transitions
    - `AppState` with `confirm`, `pending`, and `notifyAsked`; `Event` and `Effect` unions.
    - IDLE → DIALING (`playHandshake`), `DIAL_SKIP` (`stopSound`), `HANDSHAKE_DONE`, `SHOW_MENU` exactly once.
    - Destination menu keys, `GO`, URL entry with `URL_SUBMIT` and `back`, `INVALID SELECTION` and URL error messages, message clearing on new input.
    - _Requirements: 1.2, 1.3, 1.6, 1.7, 1.8, 2.3, 2.4, 2.5, 2.6, 2.7, 3.4, 3.5, 3.6, 3.7, 3.10, 12.6, 12.10, 12.13, 12.14, 14.1, 14.2, 14.4_
  - [x] 7.2 Add the duration, confirm, and connect transitions
    - Duration pick → `confirm` set and `requestNotifyPermission` once per dial-in; no `openDestination`.
    - On the confirm screen: `BACK` (from `back`, Escape, or `0`) → Duration menu with destination kept; digits 1–9 ignored; `CONFIRM` → `pending` and `openDestination`.
    - `OPENED` / `LINK_OPENED` → CONNECTED with a new session id and `saveActive`; `POPUP_BLOCKED` → `pending.blocked`; everything ignored once `pending` is set.
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.4, 5.5, 5.6, 5.8, 7.4, 12.16, 14.2_
  - [x] 7.3 Add the end transitions and `endRecord`
    - `TICK` past the end → TIME UP; `HANG_UP` → HANG UP, or TIME UP when at or after the scheduled end.
    - ENDED effects in order: `endSession`, `playNoCarrier`, and `notifyTimeUp` for TIME UP only. All end events in ENDED are no-ops. `NOCARRIER_DONE` once; `DIAL_AGAIN` resets with `seq` kept.
    - Receipt view: `MENU_KEY` 1 → `DIAL_AGAIN`; any other digit → `INVALID SELECTION`.
    - _Requirements: 7.6, 7.10, 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 9.1, 9.9, 9.10, 9.11, 14.5_
  - [x] 7.4 Add `recover(active, seq, now)`
    - Invalid or future start → IDLE and clear the active state; not expired → CONNECTED with no `openDestination`; expired → ENDED with a TIME UP record at the scheduled end.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.3_
  - [x] 7.5 Write property tests for the state machine
    - Build generators for reachable states (by replaying random event sequences from `initialState`) and for event sequences.
    - **Property 7: Only listed transitions happen**
    - **Property 8: Ended is final**
    - **Property 9: A session ends exactly once**
    - **Property 10: End record values**
    - **Property 16: Connect step starts once**
    - **Property 17: Permission request and opening use separate user actions**
    - **Validates: Requirements 4.3, 4.6, 4.8, 5.1, 5.8, 7.4, 7.6, 7.10, 8.3, 8.7, 9.1, 9.10, 14.1, 14.2, 14.4, 14.5**
  - [x] 7.6 Write property tests for recovery and stored data
    - **Property 15: Recovery decision**
    - **Property 14: No URL reaches storage**
    - **Validates: Requirements 10.1, 11.1, 11.2, 11.3, 11.4, 11.5, 14.3**

- [x] 8. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Platform wrappers
  - [x] 9.1 Implement `src/platform/storage.ts`
    - `loadHistory(): HistoryStatus`, `saveHistory`, `loadActive`, `saveActive`, `clearActive`; every `localStorage` access in try/catch; keys `blueline.history.v1` and `blueline.active.v1`.
    - _Requirements: 10.1, 10.6, 10.7, 10.8, 10.9_
  - [x] 9.2 Implement `src/platform/open.ts`
    - `openInNewTab(url)`: `window.open(url, '_blank')`, `false` for `null` or a closed window, `w.opener = null` in try/catch.
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [x] 9.3 Implement `src/platform/notify.ts`
    - `isSupported`, `permission`, `requestIfDefault` (promise and callback forms, not awaited), `show` returning `false` when the constructor throws.
    - _Requirements: 7.3, 7.4, 7.5_
  - [x] 9.4 Implement `src/platform/page.ts`
    - `isVisible`, `onResume(cb)` for `visibilitychange` to visible, `pageshow`, and `focus`; `startTitleFlash` / `stopTitleFlash` alternating `NO CARRIER` and `BLUELINE` every second.
    - _Requirements: 6.9, 7.5, 7.12, 7.13_

- [x] 10. Modem sound
  - Implement `src/audio/modem.ts`: `unlock`, `handshake` (about 4 s: DTMF digits, 2100 Hz answer tone, 1200/2400 Hz tones, band-passed noise bursts), `noCarrier` (480 + 620 Hz busy pulses, ≤ 1.5 s), `stop` (20 ms gain ramp). All oscillators and generated noise; no audio files; every call in try/catch returning `false` on failure.
  - _Requirements: 1.5, 1.7, 1.9, 7.2, 7.11, 8.4_

- [x] 11. Font, styles, and page shell
  - [x] 11.1 Add the bundled font
    - Download the unmodified `GalmuriMono11.woff2` and `OFL.txt` from the upstream quiple/galmuri release into `public/fonts/`. Record the release version in `public/fonts/README.md`.
    - _Requirements: 15.3, 15.4_
  - [x] 11.2 Write `src/styles/crt.css`
    - `@font-face` for GalmuriMono11 from `/fonts/`; blue `#0000aa` background; `font-size: clamp(14px, 4vw, 22px)`; boxes at most 32 columns; buttons at least 44 × 44 px; scanlines and flicker only inside `@media (prefers-reduced-motion: no-preference)`.
    - _Requirements: 1.1, 12.8, 15.2, 15.3_
  - [x] 11.3 Write `index.html`
    - Viewport meta, `<meta name="referrer" content="no-referrer">`, a screen root, the message line (`role="status" aria-live="polite"`), and the persistent Command_Prompt (`maxlength="32"`). Add a small Vite `transformIndexHtml` plugin in `vite.config.ts` that injects the CSP meta into the production build only.
    - _Requirements: 10.2, 12.1, 15.1_

- [x] 12. Screens
  - All screens: every BLUELINE-generated string is ALL-CAPS English (the Korean greeting excepted); user-entered text and Custom URLs are shown exactly as entered (Req 12.9).
  - [x] 12.1 Implement `src/screens/box.ts`
    - Builds ASCII boxes (`+`, `-`, `|`) as DOM rows; border characters in `aria-hidden` spans; content as text or `<button>`.
    - _Requirements: 2.1, 4.1, 9.2, 12.9, 15.1_
  - [x] 12.2 Implement `src/screens/dial.ts`
    - `BLUELINE`, `어서 오세요 (WELCOME)`, `PRESS ENTER OR TAP TO DIAL`; during DIALING the typed `ATDT` text computed from the dial start timestamp (no tick counting) and `CONNECT`.
    - _Requirements: 1.1, 1.4, 1.6, 1.7, 1.10_
  - [x] 12.3 Implement `src/screens/menu.ts`
    - Destination menu, URL entry (`ENTER URL:`, `maxlength="2048"`, focused), Duration menu with `₩40 PER STARTED MINUTE` and the fictional-currency label.
    - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.2_
  - [x] 12.4 Implement `src/screens/confirm.ts`
    - Destination label, planned duration, `CONNECT? PRESS ENTER`, CONNECT button, `0 OR ESC: BACK`; after a blocked popup, `POPUP BLOCKED` with a focused `<a target="_blank" rel="noopener noreferrer">` link.
    - _Requirements: 4.7, 4.8, 5.5, 5.6, 13.4_
  - [x] 12.5 Implement `src/screens/session.ts`
    - Label, `ELAPSED`, `REMAINING`, `FEE ₩n (FICTIONAL)`, `TYPE BYE OR PRESS ESC TO HANG UP`, HANG UP button; meter with `role="timer"` and `aria-live="off"`.
    - _Requirements: 6.1, 6.8, 6.10_
  - [x] 12.6 Implement `src/screens/nocarrier.ts` and `src/screens/receipt.ts`
    - NO CARRIER with `SESSION TIME IS UP.` or `LINE DISCONNECTED.` and no claim about closing or blocking the destination.
    - Receipt box with destination, planned, actual, end reason, fee, today, this week, the fictional-currency statement, the optional storage notice, and `1. DIAL AGAIN`.
    - _Requirements: 7.8, 9.2, 9.7, 9.8, 10.6, 10.7_

- [x] 13. Shell
  - [x] 13.1 Implement `src/app/controller.ts`
    - Dispatch loop with each effect in its own try/catch; effect runner for every effect in the design table.
    - Dial timers (`HANDSHAKE_DONE` after 4 s, `SHOW_MENU` 800 ms later) that run whether or not audio started.
    - While CONNECTED: 250 ms `TICK` interval, a one-shot timeout at the scheduled end, and `TICK` on resume; title-flash stop on resume.
    - NO CARRIER: final `00:00` session frame for 500 ms, then NO CARRIER; 3 s `NOCARRIER_DONE` timer that starts only when NO CARRIER is visible.
    - `ViewModel` for screens (elapsed, remaining, fee, receipt model, help lines).
    - Session_Screen shown within 1 s of the session start; total controlled waits in the 1 MIN demo stay within 75 s (timing from `TIMING`).
    - _Requirements: 1.6, 1.9, 5.7, 6.2, 6.9, 6.12, 7.1, 13.3, 7.3, 7.5, 7.7, 7.9, 7.12, 7.13, 9.1, 10.8, 10.9_
  - [x] 13.2 Implement `src/app/input.ts`
    - Digit keys on menu views and the confirm view handled as `MENU_KEY` when the prompt is empty; typed commands through `parseCommand` and the per-view table; prompt cleared and refocused after submit.
    - Enter with an empty prompt: `DIAL`, `DIAL_SKIP`, `CONFIRM`, or `NOCARRIER_DONE` by view.
    - Escape: `HANG_UP` in CONNECTED, `BACK` on the confirm view before the Connect step, ignored elsewhere.
    - `modem.unlock()` inside the dial gesture; the permission request inside the duration-pick gesture; `window.open` inside the confirm gesture; the popup link dispatches `LINK_OPENED`.
    - _Requirements: 1.3, 1.7, 3.9, 4.8, 5.1, 7.4, 8.1, 8.2, 8.8, 12.2, 12.3, 12.5, 12.7, 12.11, 12.12, 12.16, 13.4_
  - [x] 13.3 Wire `src/main.ts`
    - Load the active session, run `recover`, run its effects, attach input, pick the screen by state, and render.
    - _Requirements: 1.1, 11.1, 11.3, 11.5, 14.3_

- [ ] 14. Checkpoint
  - Ensure all tests pass and `npm run build` succeeds, ask the user if questions arise.

- [ ] 15. Manual browser checks
  - Run `npm run build` and serve `dist/` with `npx vite preview`. Record the results in `docs/manual-checks.md`:
    - Full 1 MIN demo by keyboard only, under 2 minutes, with no console errors (Chrome, Safari, Firefox, Edge on desktop).
    - Permission prompt appears on the duration pick; the destination opens on Enter or the CONNECT button; Escape, `0`, and `back` return from the confirm screen.
    - Popup blocked path with the keyboard-focused link; the destination tab has no `opener`.
    - Hidden-tab time-up alert within 60 s on desktop browsers (notification granted, and denied with title flashing).
    - iPhone Safari: on return after time-up, NO CARRIER and then the receipt, with the fee for the full planned duration.
    - Android Chrome: notification constructor fallback.
    - 360 px wide layout with no horizontal scroll; 44 px touch targets; reduced-motion turns off scanlines and flicker.
    - DevTools Network tab shows no third-party requests from the BLUELINE tab.
  - _Requirements: 7.9, 7.13, 10.2, 12.8, 13.1, 13.2, 13.4, 15.2_

- [ ] 16. Write `README.md`
  - **Moved to the README task of the last spec (마지막 스펙의 README 태스크로 옮김). Not done in this spec.**
  - Follow the README plan in the design: what it is, how to try it (the 1 MIN demo path), how it works, privacy, known limitations (including that on iPhone Safari the user sees NO CARRIER and the receipt on return), development commands and layout, how Kiro specs, steering, and hooks were used, and credits and licenses.
  - _Requirements: 13.5, 15.4_

## Notes

- Tasks 2–7 are pure core and can be checked with `npm test` alone; no browser is needed until task 9.
- Each property test task names the design property it implements, so a failing test points back to a requirement.
- Task 15 covers what Vitest cannot check: user activation, popups, notifications, background-tab behavior, and layout.
