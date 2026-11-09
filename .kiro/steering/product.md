---
inclusion: always
---

# Product: BLUELINE (working name)

## One-line
A 1990s dial-up BBS-style "connection gate" for endless-feed apps: you dial in, choose how long to stay, watch a connection-fee meter tick up, and get disconnected with a receipt.

## Problem
- People lose time on YouTube / Instagram not because they dislike them, but because the feed never ends.
- The serendipity of recommendations is the part users actually enjoy. We must NOT remove or filter it.
- What is missing is a boundary: a deliberate moment to enter, a visible cost while inside, and a clear end.

## Target user
- Primary: someone who opens feed apps reflexively and wants a boundary, not a ban.
- Demo persona: the builder — an iPhone user who watches YouTube / Instagram and values recommendation serendipity.

## Core idea (Resurrection category)
Revive the constraints of 1990s Korean dial-up BBS networks ("PC-tongsin"), because those constraints are exactly the opposite of today's endless feeds.

| Old constraint | What it does today |
|---|---|
| Dial-up ritual (ATDT, modem handshake sound) | A deliberate entry moment instead of a reflexive tap |
| Per-minute connection fee | Makes the cost of attention visible |
| `NO CARRIER` disconnect | The system declares "this session is over" |
| Numbered menus, typed commands | Moving requires intent; no mindless scrolling |

## Core flow (MVP)
1. **Dial screen**: blue screen, `ATDT` text, synthesized modem handshake sound, `CONNECT` message.
2. **Destination menu**: numbered choices — 1. YouTube 2. Instagram 3. Custom URL.
3. **Duration menu**: numbered choices — 1 min (demo), 5, 10, 15, 30 min.
4. **Connect**: destination opens in a new tab; this tab becomes the live session screen with elapsed time and a fee meter.
5. **Time up**: `NO CARRIER` screen + sound + browser notification (if permitted).
6. **Receipt**: session duration, fee, today's total, this week's total.
7. **Early hang-up**: user can type `bye` (or press the hang-up key) at any time; a receipt is still issued.

## Principles
- **Boundary, not blocking.** Never claim we block or control other apps.
- **Keep serendipity.** Never filter, alter, or inspect the destination's content.
- **Keyboard-first.** Every action is reachable with number keys or typed commands. Mouse / touch also works so phones can use it.
- **Honest numbers.** The fee is a fictional currency for awareness and is labeled as such.
- **Private by default.** No accounts, no server, no tracking of what the user watches. History stays in the user's browser.
- **Works on desktop and mobile browsers.**

## Non-goals (MVP)
- Enforcing limits inside other apps
- Browser extension
- iOS Shortcuts integration (planned optional add-on; may appear at the end of the demo video)
- Multi-user chat, a real BBS server, SSH access

## Language and tone
- UI text in English with 90s BBS flavor: ALL-CAPS system messages, ASCII boxes, numbered menus.
- Small Korean touches are allowed as easter eggs (e.g., a greeting), always with the English meaning nearby.
- No third-party logos or trademarks in the UI or demo. Destinations are shown as plain text labels only.

## Demo success criteria
- A judge on a laptop can complete dial → connect → `NO CARRIER` → receipt in under 2 minutes using the 1-minute demo duration.
