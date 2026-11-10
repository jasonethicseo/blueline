# Implementation Plan: BLUELINE Design Refresh and Haunted Line

## Overview

Pure functions first, then the ENDED state with the Haunted_Screen and the reload cases, then the shell. After that, the screen frame and the styles that every screen shares, and one task per redesigned screen. A checkpoint with the browser checks, the device checks, and the README come last. Each task leaves the app building, `npm test` passing, and every flow usable.

Conventions for every task:

- `src/core` files import nothing from `app`, `screens`, `audio`, or `platform`, never call `Date.now()`, timers, or DOM APIs, and reducer files import shared state only from `session-state.ts`.
- Keep each file under about 200 lines.
- Property tests use fast-check with at least 100 runs (`size: 'max'` where the input should reach its limit) and start with `// Feature: blueline-design, Property N: <title>`.
- Do not edit `.kiro/specs/blueline-core-flow/` or `.kiro/specs/blueline-purpose-board/`.
- Colors only from the Palette; Display_Face sizes in multiples of 11 px where the layout allows.
- One task at a time: commit as `jasonseo <jasonethicseo@users.noreply.github.com>`, report, and wait for the next instruction.

## Tasks

- [x] 1. Pure helpers for the new screens
  - [x] 1.1 Add the constants to `src/core/config.ts`
    - `HAUNT` (`normal` 60 s / 600 s, `demo` 10 s / 60 s), `DEMO_PLANNED_SEC`, `PROGRESS_CELLS`, `MODEM_LOG`, `CONNECT_TEXT`. `DIAL_TEXT` and `TIMING` stay.
    - _Requirements: 4.2, 7.3, 9.6, 9.7_
  - [x] 1.2 Create `src/core/haunt.ts`
    - `hauntTiming`, `shouldHaunt`, `hauntLevel`, `ghostLayout` (six fixed slots, `ceil(6 × level)` shown, opacity `base × level`, corruption picked by a hash of the Purpose, no randomness).
    - _Requirements: 9.1, 9.2, 9.5, 9.6_
  - [x] 1.3 Create `src/core/display.ts`
    - `progressCells`, `progressBar`, `formatWon` (thousands separators), `formatClock` (capped at 99:59), `modemLines`, `charCounter`.
    - _Requirements: 4.2, 5.2, 5.3, 6.2, 7.3, 8.2_
  - [x] 1.4 Create `src/core/summary.ts`
    - `periods`, `lastDays`, `callerNumber`, `lastCall`, `todaySoFar`, `preview`, reusing `periodStarts`, `totals`, and `outcomeCounts`.
    - _Requirements: 4.4–4.7, 5.4, 7.4, 8.3, 8.4_
  - [x] 1.5 Write property tests
    - **Property 1: Haunt level stays in range and never decreases** and **Property 2: Haunted only for a late return to a Time_Up with a Purpose** in `tests/property/haunt.prop.test.ts`.
    - **Property 5: Progress_Bar** and **Property 7: Number formats** in `tests/property/display.prop.test.ts`.
    - **Property 6: Summaries match the receipt rules** in `tests/property/summary.prop.test.ts`; add it to the `new-york` project.
    - **Validates: Requirements 4.4, 4.6, 5.4, 7.3, 8.2, 8.3, 9.1, 9.2, 9.3, 9.6, 9.7**
  - [x] 1.6 Write unit tests
    - `lastCall` (TODAY / YESTERDAY / date, `null` when empty), `ghostLayout` at levels 0, 0.5, 1 and the same layout twice, `modemLines` order and `CONNECT 2400` last, `charCounter` over the limit, `formatWon(1840)` = `₩1,840`.
    - _Requirements: 4.2, 4.5, 5.3, 9.5_

- [x] 2. The Haunted view in the ENDED state, and the two reload cases
  - [x] 2.1 Extend `src/core/session-state.ts` and `src/core/session-ended.ts`
    - `ended.view` gains `'haunted'`; `ended` gains `seenAt` and `shownAt`. Events `SEEN { now }` and `FACE_IT { now }` (`FACE_IT` is a user input). `SEEN` only while `nocarrier` with `seenAt === null`: haunted if `shouldHaunt`, else `shownAt = now`. `FACE_IT` only from `haunted`. Nothing else leaves `haunted`.
    - _Requirements: 9.1, 9.2, 9.9, 9.10, 9.11_
  - [x] 2.2 Update `src/core/commands.ts`
    - `ViewName` `haunted`; `viewOf`; `help` lines `ENTER - FACE IT`; other input on `haunted` → `PRESS ENTER TO FACE IT`.
    - _Requirements: 9.9, 11.2 (purpose-board)_
  - [x] 2.3 Update the session generators and write property tests
    - `session-arb.ts` gains `SEEN` and `FACE_IT` at times around the scheduled end, and a demo-duration path.
    - **Property 3: Ended views move forward, and the Haunted_Screen appears at most once** (extend `tests/property/ended.prop.test.ts`).
    - **Property 4: The Message is still shown at most once** (extend `tests/property/memo.prop.test.ts` with `SEEN`, `FACE_IT`, and reloads while haunted).
    - Keep purpose-board Properties 13 and 16 passing with the new view.
    - **Validates: Requirements 8.7, 9.9, 9.10, 9.11**
  - [x] 2.4 Write the reload tests in `tests/unit/reload.test.ts`
    - (가) An expired v2 active state with a Purpose and a Message, demo duration, loaded 15 s after the scheduled end: `recover` + `SEEN` → `haunted`; the record's `end` is the scheduled end and its fee is the 60-second fee; `FACE_IT` → NO CARRIER with the Message; `ANSWER` → `saveOutcome`. Loaded 5 s after the end → NO CARRIER directly.
    - (나) After NO CARRIER was reached, answered and not answered: the fake storage has no active state; the reload gives IDLE; the stored Outcome is unchanged; no `SEEN`, haunted view, or Message follows.
    - _Requirements: 9.12, 9.13_

- [x] 3. Shell: SEEN, the stored-history snapshot, and the view model
  - [x] 3.1 Create `src/app/ended.ts` and update `src/app/controller.ts`
    - Dispatch `SEEN` the first time an ENDED Session is visible: after the final `00:00` frame, on resume, and at boot after `recover`. The 1 s haunt render tick while `haunted`. The NO CARRIER timer (no Purpose) only after `SEEN`.
    - Keep the `stored` history snapshot (boot, IDLE, SET_PURPOSE, connect, `historyWritten`).
    - _Requirements: 9.1, 9.4, 9.12, 4.8, 8.3_
  - [x] 3.2 Update `src/screens/view.ts`, `src/app/keys.ts`, and `src/app/input.ts`
    - `ViewModel` gains `now`, `stored`, `dialElapsedMs`; `Handlers` gains `faceIt`. Enter on `haunted` → `faceIt`; Escape on `haunted` does nothing. `won()` is replaced by `formatWon` (all screens).
    - _Requirements: 9.9, 12.1_
  - [x] 3.3 App version
    - `__APP_VERSION__` from `package.json` through Vite `define` in `vite.config.ts` and `vitest.config.ts`; `src/env.d.ts`.
    - _Requirements: 2.2_
  - [x] 3.4 Update tests whose text changed (`₩` formatting) and add unit tests for SEEN timing that do not need the DOM.
    - _Requirements: 12.2_

- [x] 4. Screen frame and shared styles
  - [x] 4.1 Add `#status-bar` and `#key-bar` to `index.html`; create `src/screens/frame.ts` (`frameFor`, the table in the design); draw the bars and set `body[data-theme]` in `main.ts`.
    - _Requirements: 2.1, 2.2, 2.3, 3.4, 11.2_
  - [x] 4.2 Rewrite `src/styles/crt.css` and `screens.css` foundations
    - Palette tokens, themes, frame bars, Key_Buttons (48 px, square), inputs on black, faint static Scanline_Layer, yellow focus outline, `.display-xl` / `-l` / `-m` steps in multiples of 11 px, two-column layouts that stack below 600 px. Remove the old flicker.
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.5, 2.6, 3.1–3.3, 11.3_
  - [x] 4.3 Replace the ASCII boxes in `src/screens/box.ts` with CSS boxes; restyle the menus, URL entry, Duration_Menu, Connect_Confirm_Screen, Receipt_Screen, and Board_Screen (content unchanged).
    - _Requirements: 2.4, 10.1, 10.2, 10.3_
  - [x] 4.4 Write unit tests
    - `frameFor` keys and status per view, no Purpose or Message in either bar; the contrast table for every Palette pair used, with the faint and strong Scanline_Layer factors, all ≥ 4.5:1.
    - _Requirements: 1.7, 2.2, 2.3_

- [x] 5. Dial screen
  - Two columns: Modem_Log from `modemLines` (the `ATDT` line typed as now, `CONNECT 2400` in green when the handshake ends) and the double box with `BLUELINE` in `.display-l`, tagline, greeting with `CALLER #<nnnn>`, last call, this week, `ENTER · DIAL IN`. A tap anywhere still dials; core timing rules unchanged.
  - Update the dial unit tests and texts.
  - _Requirements: 4.1–4.8_

- [x] 6. Purpose and Message screens
  - Titles, Korean hint with its English meaning, cyan labels, fields on black (Message in yellow), live Character_Counter (red over the limit), dashed Sysop_Notice from `lastDays`, the read-only Purpose on the Message_Screen, `ESC · BACK` and `ENTER · NEXT` (`requestSubmit`, so the IME rule still applies).
  - _Requirements: 5.1–5.5, 6.1, 6.2_

- [x] 7. Session screen
  - Purpose_Band, two `.display-xl` numbers with their labels, Progress_Bar with a text equivalent, `LEFT · TODAY … CALLS · ₩…`, `ESC · HANG UP` in hangup-red and `OR TYPE BYE`, `● ON LINE` badge. Text-only updates every 250 ms as now.
  - _Requirements: 7.1–7.6, 11.4_

- [x] 8. NO CARRIER screen
  - Black theme, `+++ ATH0`, `NO CARRIER` in `.display-xl`, booked / on line / fee line, yellow double Message box with `SENT <MM:SS> AGO` (from `shownAt`), Purpose, question, green and outline answer buttons, Receipt_Preview column with the Post_Number line, the Function_Key_Bar hint. No-Purpose Sessions keep the core move-on.
  - _Requirements: 8.1–8.7_

- [x] 9. Haunted screen
  - Create `src/screens/haunted.ts` and `src/styles/haunted.css`: ghost layer from `ghostLayout` (aria-hidden, no pointer input), ASCII ghost, strong Scanline_Layer, title in `.display-m` red with a cyan offset, drift lines and the red Purpose box updated each second, billed line, `ENTER · FACE IT`. Flicker only under `prefers-reduced-motion: no-preference`.
  - _Requirements: 9.3–9.8, 9.11, 11.1, 11.2_

- [x] 10. Checkpoint and browser checks
  - `npm test` (both time zones), `npm run build`, file sizes, the core rules, and `.kiro/steering/structure.md` updated with the new files.
  - Headless Chrome at 360 and 1280 px (scripts outside the repo): every screen has the frame; no horizontal scroll; Display_Face lines fit; only Palette colors in computed styles; focus outline; the Haunted_Screen after a hidden Time_Up with the demo duration (Grace_Period 10 s), the level growing over 60 s, no flicker under reduced motion, then NO CARRIER with the Message; reload cases (가) and (나); demo timing both ways under 150 s. Record the results in `docs/manual-checks.md` part D.
  - _Requirements: 1.1, 1.7, 3.1, 3.2, 9.12, 9.13, 12.1–12.6_

- [x] 11. Device checks
  - Ask the user which devices are available. Then check and record in part D: the open rows of part B and part C2 (including iPhone Safari with a Hangul keyboard), the Haunted_Screen on a desktop browser and on iPhone Safari (stay in the destination app past the end, then return; reload case (가)), and the screens next to the mockups.
  - _Requirements: 13.1, 13.2_

- [x] 12. README
  - Write `README.md` as planned in the core design, updated for the purpose-board features and this spec: what it is, the demo path (both ways), how it works, privacy (what is stored, no URL, the Message only until NO CARRIER), known limitations (iPhone background tabs, the desktop-only 60-second alert), development, how Kiro specs, steering, and hooks were used, credits and licenses (MIT, GalmuriMono11 under OFL, synthesized sounds).
  - This is the README task moved here from core task 16 and purpose-board task 9.
  - _Requirements: 13.3_
