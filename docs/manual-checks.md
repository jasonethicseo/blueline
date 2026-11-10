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
