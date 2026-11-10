# BLUELINE

A 1990s Korean dial-up BBS ("PC-tongsin") style connection gate for endless-feed apps such as
YouTube and Instagram. You dial in, say what you are going there to do, choose how long to stay, and
watch a connection-fee meter tick up. When the time is up the line drops with `NO CARRIER`, you
answer whether you did what you came for, and you get a receipt.

It is a **boundary, not a block**. BLUELINE never blocks, filters, or looks at the other app or its
recommendations. It only gives you a deliberate way in, a visible cost while you are inside, and a
clear end.

The fee is in fictional ₩ (₩40 per started minute) and has no monetary value.

## Try it

There is no hosted copy yet. Run it locally:

```sh
npm install
npm run build
npx vite preview        # then open http://localhost:4173/
```

The demo path takes about 1.5 minutes with the 1 MIN (DEMO) duration:

1. **Dial**: press Enter (or tap). The modem log and a synthesized handshake play. Press Enter again to skip.
2. **Destination**: press `1` (YouTube), `2` (Instagram), or `3` (a URL you type). `4` opens the Board.
3. **Purpose**: type what you are going there to do, for example `버그 해결 영상 하나만`, and press Enter.
4. **Message to future you** (optional): type a short note, or leave it empty, and press Enter.
5. **Duration**: press `1` for 1 MIN (DEMO). The browser may ask for notification permission here.
6. **Connect**: press Enter (or tap CONNECT). The destination opens in a new tab and this tab shows the
   Session: your Purpose, the time on line, the fee, and a progress bar. Type `bye` or press Esc to hang up early.
7. **NO CARRIER**: at the end of the minute the line drops. Your note arrives, once. Answer
   `PURPOSE ACHIEVED?` with `Y` (done) or `N` (drifted).
8. **Receipt**: duration, fee, today's and this week's totals, and how many calls were done or drifted.
   Press `1` to dial again.

**The haunted line.** Stay in the destination tab for more than 10 seconds after the minute ends (60
seconds for the longer durations), then come back. Instead of NO CARRIER you see
`THE LINE IS HAUNTED`: how long ago the line dropped, your own Purpose quoted back at you, and ghosts of
it that grow louder the longer you stay away (full strength after 1 minute in the demo, 10 minutes
otherwise). The fee stays at the booked time. Press Enter to face it and go on to NO CARRIER.

Everything works with the keyboard (number keys and typed commands; `help` lists them) and with
taps or clicks.

## How it works

- **Screens**: Dial → Destination → Purpose → Message → Duration → `CONNECT? PRESS ENTER` → Session →
  (Haunted) → NO CARRIER with the purpose check → Receipt. Past sessions are listed on the Board as
  numbered posts with their Purpose and answer.
- **Time**: the session start timestamp is stored, and every frame computes `now − start`. Timer ticks
  are never counted, because background tabs throttle timers.
- **Fee**: `ceil(seconds / 60) × ₩40`, and ₩0 at zero. A session that runs out while the tab is in the
  background is still billed for the booked time, not for the time you were away.
- **Two gestures**: picking the duration asks for notification permission; connecting is a separate key
  press or tap that opens the tab, so neither one uses up the user activation the other needs.
- **Sound**: all sounds are synthesized live with the Web Audio API. No recorded modem sounds are included.
- **Code**: the fee, time, session state machine, command parser, history, and haunted-line rules are
  pure TypeScript in `src/core`. They never touch the DOM or read the clock; `now` is passed in, so they
  are tested with property-based tests.

## Privacy

- No accounts, no server, no analytics, and no network requests besides loading the page and its own
  files. The production page sets a Content-Security-Policy with `connect-src 'none'`.
- Everything is stored in your browser's `localStorage`:
  - `blueline.history.v2`: the newest 1000 sessions, each with start and end time, duration, fee,
    destination label (`YOUTUBE`, `INSTAGRAM`, or `CUSTOM`), Purpose, answer, and post number.
  - `blueline.active.v2`: the session in progress, so a reload can pick it up. It holds the Purpose and
    the Message, and it is removed when the session ends.
- **No URL is ever stored**, not even for a custom destination. The **Message is kept only until NO
  CARRIER** and is never written to the history.
- Older `blueline.*.v1` keys from earlier versions are still read when no v2 data exists, and are never written.
- If storage is blocked, the app still works; history is simply not saved.

## Known limitations

- **iPhone (and other mobile) background tabs.** Safari on iPhone pauses the BLUELINE tab while you are
  in the other app, so nothing can alert you at the end of the time. When you come back you see NO
  CARRIER (or the haunted line), then the receipt. The fee uses the scheduled end time.
- **The "alert within 60 seconds of the end while hidden" promise is for desktop browsers only.**
- **Notifications on iPhone.** Safari on iPhone does not show notifications for a normal web page, so
  the fallback is the tab title flashing `NO CARRIER`, which you only see when you return.
- **Popup blockers.** If the browser blocks the new tab, BLUELINE shows `POPUP BLOCKED` with a link to
  open it.
- **Not checked on real devices yet**: iPhone Safari (the haunted line after returning from an app,
  opening the YouTube / Instagram app, the Hangul keyboard), Android Chrome, Firefox, and macOS Safari
  for the new screens; how the synthesized sounds actually sound; VoiceOver. Desktop Chrome was checked
  automatically, and earlier screens were checked by hand in macOS Chrome and Safari. See
  [`docs/manual-checks.md`](docs/manual-checks.md).

## Development

```sh
npm run dev     # local dev server
npm run build   # type check and production build into dist/
npm test        # all unit and property tests, once
```

TypeScript and Vite, no UI framework. Tests use Vitest and fast-check; the history and summary
properties also run in a second time zone with daylight saving (`America/New_York`).

```
src/
  core/      pure logic: fee, time, state machine, commands, history, haunted line, summaries
  app/       the shell: owns the state, timers, input, and runs the core's effects
  screens/   one file per screen; builds DOM from the state and a view model
  platform/  thin wrappers for storage, notifications, opening tabs, page visibility
  audio/     Web Audio synthesis
  styles/    DOS / CGA palette, screen frame, per-screen styles
tests/
  unit/      parser and edge cases
  property/  fast-check properties
docs/
  manual-checks.md  browser and device checks Vitest cannot do
  mockups/          screen mockups for the design
```

### How Kiro was used

- **Specs** (`.kiro/specs/`): three features, each written as requirements, then a design, then a task
  list, and built one task at a time with a commit per task.
  - `blueline-core-flow`: dial, menus, session, fee, NO CARRIER, receipt, history, reload recovery.
  - `blueline-purpose-board`: the Purpose and the message to future you, the purpose check, the Board.
  - `blueline-design`: the terminal look from the mockups, and the haunted line.
- **Steering** (`.kiro/steering/`): `product.md` (what BLUELINE is and is not), `tech.md` (hard rules:
  time from timestamps, pure core, synthesized audio, the two-gesture rule), `structure.md` (where code
  goes), and `design.md` (palette, type, and every screen).
- **Hooks** (`.kiro/hooks/`, with `.kiro/scripts/worktrail_bridge.py`): at session start, on each prompt,
  after each commit, and around context compaction, they keep a running record of decisions and
  progress in Worktrail, so a new session picks up the work where the last one stopped. Without
  Worktrail installed they print nothing and do not block anything.

## Credits and licenses

- Code: [MIT](LICENSE).
- Font: [GalmuriMono11](https://github.com/quiple/galmuri) by Lee Minseo, under the SIL Open Font
  License 1.1 ([`public/fonts/OFL.txt`](public/fonts/OFL.txt)), bundled unmodified and served from this site.
- Sounds: synthesized with the Web Audio API; no recordings.
- YouTube and Instagram are named as plain text destinations only. BLUELINE is not affiliated with them.
