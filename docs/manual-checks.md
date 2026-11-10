# Manual browser checks (core task 15, purpose-board task 8)

Build: `npm run build`, served with `npx vite preview` (production build, with the CSP meta).

## Part A: automated in a real browser (2026-11-09)

Run with the local Google Chrome 157.0.8103.38 (headless) on macOS 26.6.2, driven by a throwaway
Playwright script with a fake clock. Destination tabs were answered by a local stub page, so nothing
left the machine. Result: **36 / 36 passed** (after one fix, below).

| Check | Result | Requirement |
|---|---|---|
| GalmuriMono11 loads from the same origin | pass | 15.3 |
| Prompt focused on load and on the confirm screen | pass | 4.7, 12.12 |
| Full 1 MIN demo by keyboard only: Enter → `1` → `1` → Enter → wait → receipt | pass | 13.1, 13.4 |
| ATDT typed one character at a time, then CONNECT, then the menu | pass | 1.4, 1.6 |
| Duration pick calls `Notification.requestPermission` and does not open a tab | pass | 4.3, 7.4 |
| Confirm (Enter) opens exactly one tab, URL unchanged, `window.opener === null` in it | pass | 5.1–5.3 |
| Session meter at 00:30 shows ₩40; last frame shows 00:00; then NO CARRIER; then receipt | pass | 6.1, 7.1, 7.7 |
| Receipt totals ₩40 / ₩40 / ₩40; stored history has the label and no URL | pass | 9.2–9.4, 10.1 |
| No horizontal scroll at 360 px on all seven screens, and at 1280 px with a 300-character URL | pass | 12.8 |
| Every button and link at least 44 × 44 px | pass | 12.8 |
| No console errors | pass | 13.2 |
| No requests from the BLUELINE tab to any other origin | pass | 10.2 |
| CSP meta with `connect-src 'none'` in the production page | pass | 10.2 |
| Scanlines and flicker on with `prefers-reduced-motion: no-preference`, off with `reduce` | pass | 15.2 |

**Bug found and fixed:** in Chrome, every ASCII box row was about seven lines tall. The column of `|`
characters that draws the box sides added its own height to the row. Fix in `src/styles/crt.css`:
`contain: size` on `.box-side`, so the row's content sets the height and the side only stretches to
it. The same change adds `white-space: pre-wrap` to `.box-cell`, so padded label columns
(`SESSION FEE  ₩40`) line up.

Screenshots of each screen at 360 px and 1280 px were reviewed by eye after the fix.

## Part B: needs a person and real devices

Mark each line with the browser version and the result.

| Check | How | Requirement | Result |
|---|---|---|---|
| Handshake and NO CARRIER sound like a modem and a busy signal | Listen during the demo | 1.5, 7.2 | |
| Permission prompt appears on the duration pick (Chrome, Safari, Firefox, Edge desktop) | Fresh profile; pick a duration | 7.4 | |
| Destination opens on Enter and on tapping CONNECT; Escape, `0`, `back` return from confirm | Try each | 4.8, 5.1 | |
| Popup blocked path: link gets keyboard focus; Enter on it opens the tab | Block popups for localhost in site settings | 5.5, 5.6, 13.4 | |
| Firefox: popup allowed from the Enter `keydown` | Firefox desktop | 5.1 | |
| Hidden tab at time-up on desktop: notification (granted) within 60 s | Stay in the destination tab for the 1 MIN session | 7.3, 7.9 | |
| Hidden tab at time-up on desktop: title flashes NO CARRIER (denied) within 60 s | Deny permission, repeat | 7.5, 7.9 | |
| iPhone Safari: on return after time-up, NO CARRIER then the receipt; fee is the full planned duration | Stay in the destination app past the end, then switch back | 7.13 | |
| iPhone Safari: tapping YOUTUBE / INSTAGRAM hands off to the app if installed | Tap through the flow | tech.md | |
| Android Chrome: no error when notifications are granted (title-flash fallback) | Grant notifications, let time run out | 7.5 | |
| Mobile: tapping menu items does not pop up the keyboard each time | Phone, tap through the flow | 12.7 | |
| Screen reader reads menu items without the box border characters | VoiceOver on the destination menu | 15.1 | |
| Demo under 2 minutes for a first-time user on a laptop | Time it | 13.1 | |

To reach the preview from a phone on the same network: `npx vite preview --host`, then open the
printed Network URL.

## Part C: purpose-board (Purpose, Message, NO CARRIER check, Board)

Build at commit `000d84b`, `npm run build`, production page with the CSP meta.

### C1: automated in a real browser (2026-11-10)

Local Google Chrome 157.0.8103.50 (headless) on macOS 26.6.2, driven by three throwaway Playwright
scripts that serve `dist/` themselves, at 360 px and 1280 px. `window.open` was stubbed, so nothing
left the machine. Result: **104 / 104 passed** (36 + 38 + 30).

| Check | Result | Requirement |
|---|---|---|
| Destination → Purpose_Screen with the field focused; Command_Prompt hidden | pass | 1.1, 11.1 |
| Empty Purpose → `PURPOSE REQUIRED`; typing clears it | pass | 1.4, 1.7 |
| Digits and `back` typed into the Purpose_Field as text | pass | 3.1, 3.2 |
| Esc on the Message_Screen returns with the Purpose kept; `0` on the Duration_Menu returns with the Message kept | pass | 3.4, 3.5 |
| Session_Screen shows `PURPOSE:`; the tab title does not | pass | 1.9, 11.6 |
| Active state stored as v2 with Purpose and Message; reload keeps them | pass | 9.1, 9.2 |
| NO CARRIER order: NO CARRIER, Message, Purpose, `PURPOSE ACHIEVED?`, Y / N buttons | pass | 5.1 |
| NO CARRIER still waiting after 3.6 s; Enter → `PRESS Y OR N`; Esc, `5`, and a tap outside do nothing | pass | 5.2, 5.6, 5.11 |
| History holds NO ANSWER before the answer; `y` → receipt with `OUTCOME DONE`; tapping N → DRIFTED | pass | 5.3–5.5 |
| Reload on NO CARRIER → Dial_Screen, no Message, NO ANSWER kept; reload on the receipt → no Message | pass | 4.5, 9.6 |
| Expired v1 active state: NO CARRIER asks nothing and moves on; NO ANSWER; both active keys cleared | pass | 5.9, 9.4 |
| Receipt shows the Purpose and `DONE 1 · DRIFTED 0 ·` / `NO ANSWER 1`, wrapping only after `·` | pass | 6.1, 6.2 |
| Board: 25 v1 records shown as posts 25…6 on page 1 and 5…1 on page 2; `(NO PURPOSE)` | pass | 7.3, 7.4, 13.3 |
| Board: N / P paging, `NO MORE PAGES` at the end, digit → `INVALID SELECTION`, Esc and BACK → menu | pass | 7.5–7.7, 7.13 |
| Board writes nothing; the v1 history key is unchanged after a new Session | pass | 7.11, 8.7 |
| A new Session becomes post 26 on top | pass | 13.1 |
| Outcome words at 1280 px, `Y` / `N` / `?` at 360 px | pass | 7.3 |
| No horizontal scroll at 360 px with a 60-Hangul Purpose and a 120-Hangul Message | pass | 7.10, 11.4 |
| No page errors | pass | 13.2 |

Screenshots of the receipt, NO CARRIER, and the Board at 360 px and 1280 px were reviewed by eye.

### C2: needs a person and real devices

| Check | How | Requirement | Result |
|---|---|---|---|
| Hangul IME: Enter while the last syllable is composing submits once, with that syllable | Type `강의 하나만`, press Enter right after `만` | 3.6, 3.7 | macOS Chrome, 2026-11-10: pass (submitted on the first Enter, no character lost or repeated). macOS Safari, 2026-11-10: pass (reported as working). |
| Hangul IME: Esc while composing does not go back | Esc during composition on the Purpose_Screen | 3.6 | macOS Chrome: pass. macOS Safari: pass (reported as working). |
| Hangul IME on the Message_Screen | Same as above with `다 봤으면 끄자` | 3.6, 3.7 | macOS Chrome: pass. macOS Safari: pass (reported as working). |
| Hangul IME on macOS Safari | Same three checks | 3.6, 3.7 | See the three rows above. |
| Hangul IME on iPhone Safari | Same three checks, via `npx vite preview --host` | 3.6, 3.7 | Moved to the next spec's manual checks |
| Message and Purpose check after a hidden-tab Time_Up | Stay in the destination tab for the 1 MIN session | 4.2, 5.1 | Moved to the next spec's manual checks |
| Full 1 MIN demo with a short Purpose under 150 s | Time it on a laptop | 12.1 | Moved to the next spec's manual checks |
| DevTools Network shows no request on the new screens | Watch the Network panel | 11.7 | Moved to the next spec's manual checks |

The four rows above, and the open rows of part B, are checked once on the final screens of the
design spec, so the redesign does not make them stale.

## Part D: design spec (Haunted line and the new screens)

Build: `npm run build`, production page with the CSP meta, loaded from `dist/index.html`.

### D1: automated in a real browser (2026-11-10)

Local Google Chrome 157.0.8103.50 (headless) on macOS, driven over the DevTools protocol by throwaway
scripts kept outside the repository (`/tmp/bl-check.mjs`, `bl-lib.mjs`). The "away" runs hide the tab for
real: a second tab is opened in front, then the BLUELINE tab is activated again, so `visibilityState`
and the page timers behave as in a desktop browser. `window.open` was stubbed, so nothing left the
machine. Viewports: 360 × 740 (mobile emulation) and 1280 × 720. Result: **102 / 102 passed**
(1280 walk 20, 360 walk 20, 1280 away 23, 360 away 23, 1280 reload 8, 360 reload 8), plus a separate
console and network check that found nothing.

On every screen at both widths (dial, dialing, destination, URL entry, Board, Purpose, Message,
Duration, Connect, Session, NO CARRIER with the question, Receipt, Haunted):

| Check | Result | Requirement |
|---|---|---|
| Status_Bar and Function_Key_Bar both have text | pass | 2.1 |
| No horizontal scroll (`scrollWidth` ≤ `innerWidth`) | pass | 3.1 |
| No Display_Face line is wider than its box or the viewport | pass | 3.2 |
| Every computed text, background, and border color is in the Palette | pass | 1.1 |
| Every button and link is at least 44 × 44 px | pass | 2.5 |
| The focused button has a solid 2 px yellow outline | pass | 11.3 |
| Scanline layer is `aria-hidden`, has `pointer-events: none`, and has no animation | pass | 1.6 |
| Purpose_Screen hides the Command_Prompt | pass | core 11.1 |
| Session_Screen shows the Purpose band | pass | 7.1 |
| NO CARRIER shows the Message box and `PURPOSE ACHIEVED?` | pass | 8.1, 8.2 |

Flows:

| Check | Result | Requirement |
|---|---|---|
| Demo, returning before the Time_Up passes through no Haunted_Screen: first Enter to receipt in 78.0 s at both widths (script think time 1.5 s per input, plus the 4.85 s handshake and the booked 60 s) | pass | 12.4 |
| Demo, staying away 20 s past the Time_Up: Haunted_Screen at once on return (1–2 ms), Enter, `N`, receipt in 107.0 s at both widths | pass | 12.5 |
| Hidden tab at the Time_Up (notification permission not granted): the tab title flashes `NO CARRIER` while hidden, and is `BLUELINE` again on return | pass | tech.md |
| Haunted_Screen after a hidden Time_Up: drift `00:26` → `00:29` over 3 s from the clock; ghosts present; the Message is not on the screen; then NO CARRIER shows the Message | pass | 9.1, 9.3, 9.4, 9.10 |
| Haunt level grows (expired stored state, reloaded): 4 ghosts at 31 s of drift, 6 ghosts at 120 s | pass | 9.6 |
| Reduced motion: `animation-name` is `none` on the Haunted title and ghosts; with motion allowed it is `title-flicker` | pass | 1.6, 9.8 |
| Reload (case 가): expired stored state, 15 s late → Haunted_Screen; FACE IT → NO CARRIER with the Message and the Y / N buttons | pass | 9.12 |
| Reload, 5 s late (inside the Grace_Period) → NO CARRIER at once, no Haunted_Screen | pass | 9.1 |
| Reload (case 나): after NO CARRIER, unanswered → Dial_Screen, stored history unchanged, `NO ANSWER` kept | pass | 9.13 |
| Reload (case 나): after answering `y` → Dial_Screen, `DONE` kept | pass | 9.13 |
| No console errors or warnings, no CSP violation, and no request outside the page and its assets (8 requests, none foreign) through the dial, the flow, and a Haunted reload | pass | 12.6 |
| Production page has the CSP meta with `connect-src 'none'`; the source has no `fetch`, `XMLHttpRequest`, or WebSocket | pass | 12.6 |

Also checked in this task: `npm test` (both time zones: Asia/Seoul and America/New_York), `npm run build`,
`tsc --noEmit`; no file under `src` is more than a few lines over 200 (`crt.css` 213, `controller.ts` 203);
`src/core` imports nothing from `app`, `screens`, `audio`, or `platform` and uses no clock, timer, or DOM API.

Not covered by D1: the sound, the real notification prompt, and a screen reader. Those are in D2.

### D2: desktop checks on this Mac, and what is left (2026-11-10)

The user has a Mac with Chrome and Safari, and no phone, Firefox, or Android device for these checks. The
Orca computer-use helper reported its permissions as granted but every UI action was refused with
`permission_denied`, so the Chrome checks below were run by the same DevTools-protocol scripts as D1,
against the production preview (`npx vite preview`, `http://localhost:4173/`, CSP on) in a separate,
fresh Chrome profile. Destination tabs opened a page on the same preview server
(`/fonts/OFL.txt`), so nothing left the machine. Safari could not be driven: `safaridriver` needs
"Allow remote automation" in Safari's Developer settings, which is off.

Chrome 157.0.8103.50, macOS. Result: **27 / 27 passed** (20 flow checks + 7 Hangul IME checks).

| Check | How | Requirement | Result |
|---|---|---|---|
| Handshake and NO CARRIER sound like a modem and a busy signal | Listen during the demo | core 1.5, 7.2 | Chrome: the AudioContext is created inside the dial key press, is `running`, and starts 24 oscillators. **How it sounds is not checked** (no one listened). |
| Permission prompt on the duration pick | Fresh profile; pick a duration | core 7.4 | Chrome: pass. No request before the pick; exactly one `Notification.requestPermission` on the pick; no tab opened by it. |
| Destination opens on Enter and on clicking CONNECT; Escape, `0`, `back` return from confirm | Each one | core 4.8, 5.1 | Chrome: pass. Enter and the CONNECT button each open exactly one tab, URL unchanged, `window.opener === null` in it; Esc, `0`, and `back` each return to the Duration_Menu. |
| Popup blocked path: link gets keyboard focus; Enter on it opens the tab | `window.open` returning `null` (the blocker's result) | core 5.5, 5.6 | Chrome: pass. `POPUP BLOCKED` with the link focused; Enter on the link opens one tab and starts the Session. A real popup-blocker setting was not toggled. |
| Firefox: popup allowed from the Enter `keydown` | Firefox desktop | core 5.1 | Not checked: no Firefox. |
| Hidden tab at the Time_Up on desktop: notification (granted) within 60 s | Permission granted; stay in the destination tab for the 1 MIN session | core 7.3, 7.9 | Chrome: pass. `NO CARRIER` / `SESSION TIME IS UP.` 59.3 s after hiding (the end of the minute), no Purpose in it, no title flash. |
| Hidden tab at the Time_Up on desktop: title flashes NO CARRIER (not granted) within 60 s | Permission not granted, repeat | core 7.5, 7.9 | Chrome: pass (D1). |
| Haunted_Screen on a desktop browser | Stay away past the 10 s Grace_Period, come back | 9.1, 13.2 | Chrome: pass (here and in D1), both with the notification granted and not. |
| Hangul IME: an Enter that ends a composition (keyCode 229) does not submit; the next Enter submits once; Esc while composing does not go back | `Input.imeSetComposition` plus a keyCode 229 key press, on the Purpose and Message screens | purpose-board 3.6, 3.7 | Chrome (emulated IME events): pass, 6 / 6. Real macOS input method: pass in Chrome and Safari in part C2 on the earlier screens. |
| `ENTER · NEXT` button submits like Enter (empty Message skips) | Click it | 5.5 | Chrome: pass. |
| Each screen next to its mockup in `docs/mockups/` | Both at 960 × 600, side by side, by eye | 1.1–1.3 | Chrome: pass. Dial, Purpose, Message, Session, NO CARRIER, and Haunted follow the mockups' layout, colors, and copy order. Differences are the confirmed decisions (real version `0.1.0`, the 10-digit dial number, no `GO BOARD`, multiples of 11 px) plus the Character_Counter and the Command_Prompt row. At 600 px tall the Haunted and Session screens scroll vertically to reach the Function_Key_Bar. |
| Safari: any of the above | | | **Not checked automatically**: turn on Safari → Settings → Advanced → "Show features for web developers", then Developer → "Allow remote automation", or check by hand. |
| Screen reader reads menu items, the Status_Bar, and the Progress_Bar text without box or block characters | VoiceOver | 11.2 | Not checked. The DOM has no box characters, the Progress_Bar cells are `aria-hidden` with a `NN% OF BOOKED TIME` text, and the ghost layer is `aria-hidden` (D1). |
| Demo under 150 s for a first-time user on a laptop | Time it | 12.4 | Not checked with a person. Scripted: 78.0 s and 107.0 s (D1). |
| iPhone Safari: Haunted_Screen after the app comes back, reload of a paused tab, NO CARRIER then the receipt with the full fee, app hand-off, Hangul keyboard | iPhone | 9.1, 9.12, core 7.13, purpose-board 3.6 | Not checked: no iPhone. Reload case (가) is covered in D1 by writing the expired active state and reloading. |
| Android Chrome: no error when notifications are granted | Android phone | core 7.5 | Not checked: no Android device. `notify.show` catches the constructor error and falls back to the title flash. |
| Mobile: tapping menu items does not pop up the keyboard each time | Phone | core 12.7 | Not checked: no phone. |
