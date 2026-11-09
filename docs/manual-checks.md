# Manual browser checks (task 15)

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
