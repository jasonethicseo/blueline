---
inclusion: always
---

# Design

Visual source of truth for BLUELINE. Reference mockups live in `docs/mockups/*.dc.html`
(HTML with inline styles; read them for exact layout and copy, ignore the `x-dc` / `sc-*` wrapper tags and the `support.js` line).
Where a mockup and this file disagree on screen flow, this file wins.

## Feel
A 1990s Korean PC-tongsin terminal program, not a "retro-themed" modern app.
Every screen is a full-window text terminal: status bar on top, content, function-key bar at the bottom.
One question per screen, like a BBS prompt.

## Palette (DOS / CGA colors only)
| Token | Hex | Use |
|---|---|---|
| bg-blue | `#0000AA` | default screen background |
| bg-black | `#000000` | NO CARRIER screen, input fields, function-key bar |
| bg-haunted | `#00004A` | haunted-line screen |
| text | `#FFFFFF` | primary text |
| text-dim | `#AAAAAA` | secondary text (passes 4.5:1 on bg-blue) |
| yellow | `#FFFF55` | key names, highlights, fee, the purpose band |
| cyan | `#55FFFF` | labels, progress bar |
| bar-cyan | `#00AAAA` | top status bar background (black text) |
| green | `#55FF55` | CONNECT, ON LINE, DONE button |
| red | `#FF5555` | haunted text, warnings |
| hangup-red | `#AA0000` | HANG UP button (white text) |
| ghost | `#AAAAFF` | ghost text on the haunted screen |

No gradients, no rounded corners, no shadows except the haunted chromatic offset.

## Type
- Body: `GalmuriMono11` (already bundled). Mockups use Nanum Gothic Coding only as a stand-in.
- Big numbers and screen titles (`BLUELINE`, `NO CARRIER`, timer, fee): a pixel display face at 72–120px. Use GalmuriMono11 scaled up, or bundle an OFL pixel face with its license.
- ALL-CAPS for system text. Korean appears as flavor lines (greeting, sysop notice, hints).

## Screen frame (every screen)
- Top status bar, bar-cyan background, black bold 14px: app version · context · fee rate · line status.
- Bottom function-key bar, black background, 14px: `KEY` in yellow + label in white.
- Content padding 28–40px. Boxes use `4px double` or `1px dashed` borders.
- Buttons: real `<button>`, min height 48px, square corners, labeled with their key (`ESC · HANG UP`).

## Screens
1. **Dial**: left column streams the modem log line by line (`ATZ`, `OK`, `ATDT 01410`, `DIALING...`, `RING... RING...`, `CONNECT 2400`) in time with the synthesized sound. Right: double-line box with `BLUELINE` in yellow, greeting `반갑습니다 ^^`, caller number, last call and this-week summary.
2. **Purpose** (its own screen): title `[ STATE YOUR PURPOSE ]` in yellow with the Korean hint `무엇을 하러 들어가십니까?`, one labeled input on black with a live char counter (`12/60`), and a dashed `SYSOP NOTICE` box with the last 7 days of DONE / DRIFTED. Buttons `ESC · BACK` (outline) and `ENTER · NEXT` (grey fill).
3. **Message to future you** (its own screen): same frame as Purpose. Title `[ MESSAGE TO FUTURE YOU ]`, hint that it arrives at NO CARRIER and that empty + Enter skips it, one input in yellow text with a live counter (`21/120`). The chosen purpose is shown read-only above the input as a reminder.
   The mockup `Purpose.dc.html` shows screens 2 and 3 combined; implement them as two screens with that styling.
4. **Session**: yellow band with `PURPOSE` at the very top (most visible element). Below, two huge numbers side by side: elapsed `MM:SS` (white) and fee (yellow). Text progress bar of 20 cells `▓` / `░` in cyan. `● ON LINE` badge in the status bar.
5. **Haunted line** (see below).
6. **NO CARRIER + achievement check** (one screen): black background, `+++ ATH0` then huge `NO CARRIER`, then the booked / on-line time and fee.
   - If a note exists: double yellow box `✉ MESSAGE FROM THE PAST · SENT MM:SS AGO` with the note, then `THIS MESSAGE WILL NOT BE SHOWN AGAIN.` Omit the box when there is no note.
   - Purpose line, `PURPOSE ACHIEVED?`, buttons `Y · YES (DONE)` (green fill) and `N · NO (DRIFTED)` (outline). Bottom bar hints that leaving without answering records `NO ANSWER`.
   - Right column: receipt preview for today and this week with DONE / DRIFTED / NO ANSWER counts.
   - Sessions without a purpose (from before the update) skip the question and auto-advance to the receipt.

## Haunted line
Triggered when the line has dropped (NO CARRIER happened) and the user returns to the tab after a grace period, or is still away.
- Background bg-haunted, status bar turns dark red with `LINE STATUS: UNSTABLE`.
- Title `THE LINE IS HAUNTED` in red with a cyan chromatic offset.
- Copy: `YOUR LINE DROPPED MM:SS AGO.` / `YOU NEVER CAME BACK.` / a red box quoting the user's own purpose: `YOU SAID, MM:SS AGO` + the purpose text.
- Ghosts: the user's purpose text repeated 4–6 times across the screen, absolutely positioned, slightly rotated, letter-spaced, partly corrupted with `▒ █` characters, with a red/cyan `text-shadow` offset. One small ASCII ghost.
- Intensity grows with drift time: ghost opacity and count scale from 0 at drop time to full at about 10 minutes of drift.
- Scanline overlay: a `repeating-linear-gradient` layer over the screen.
- Fee stays capped at the booked duration. Show `BILLED ₩X (MM:SS BOOKED) · DRIFT +MM:SS NOT BILLED, BUT REMEMBERED`.
- `ENTER · FACE IT` leads to the NO CARRIER + achievement check screen.
- Ghost layers are decorative: `aria-hidden="true"`, and static (no flicker or motion) under `prefers-reduced-motion`.
- The purpose text is rendered as plain text, never as HTML.