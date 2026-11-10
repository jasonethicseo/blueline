# Requirements Document

## Introduction

This spec applies the visual design in `.kiro/steering/design.md` and the mockups in `docs/mockups/*.dc.html` to every BLUELINE screen. BLUELINE should look like a 1990s Korean PC-tongsin terminal program: a full-window text terminal with a status bar on top, content in the middle, and a function-key bar at the bottom, in DOS / CGA colors only.

It also adds the one new screen that `design.md` defines, the Haunted_Screen. That screen is shown when the line has dropped at Time_Up and the user stays away from the BLUELINE tab.

The flow, the commands, the stored data, and the fee stay as the core spec (`.kiro/specs/blueline-core-flow/`) and the purpose-board spec (`.kiro/specs/blueline-purpose-board/`) define them. Those spec files are not edited. Where this document and those specs disagree, this document wins, and the table below lists every such case. Where a mockup and `design.md` disagree on screen flow, `design.md` wins (as `design.md` itself says).

This spec is also where the checks left open by the earlier specs are done, on the final screens: the open rows of part B and part C2 of `docs/manual-checks.md`.

### Changes to earlier specs

| Earlier criterion | Change | Defined in |
|---|---|---|
| core 2.1, 4.1, 9.2 ("a box drawn only with text characters") | Boxes are drawn with CSS borders (`4px double` or `1px dashed`), not with `+ - \|` characters. | Requirement 2 |
| core 1.1 (prompt `PRESS ENTER OR TAP TO DIAL`) | The Dial_Screen shows the button `ENTER · DIAL IN`; a tap anywhere still dials. | Requirement 4 |
| core 1.4 (`ATDT` text typed one character at a time) | The Dial_Screen streams a Modem_Log of several lines, one line at a time, in time with the handshake sound. The `ATDT` line keeps a 7 to 11 digit number. | Requirement 4 |
| core 1.10 (one Korean greeting) | The greeting is `반갑습니다 ^^` with `WELCOME BACK` on the same line. | Requirement 4 |
| core 6.1, 6.10 (Session_Screen contents and hang-up text) | The Session_Screen layout follows the mockup; the hang-up text is the `ESC · HANG UP` button with `OR TYPE BYE`. | Requirement 7 |
| core 15.2 (CRT flicker and scanlines) | Every screen keeps a very faint, static scanline layer. The strong scanlines and the flicker are only on the Haunted_Screen, and the flicker is off under `prefers-reduced-motion: reduce`. | Requirements 1, 9 |
| core 13.1, purpose-board 12.1 (demo time) | The 150-second demo bound also holds for a demo that passes through the Haunted_Screen. | Requirement 12 |
| purpose-board 5.1 (NO_CARRIER_Screen contents) | The NO_CARRIER_Screen also shows a header line, a Receipt_Preview, and the Post_Number line. | Requirement 8 |

## Glossary

Terms from the core spec and the purpose-board spec keep their meaning.

- **Palette**: The colors listed in `design.md` under "Palette": bg-blue `#0000AA`, bg-black `#000000`, bg-haunted `#00004A`, text `#FFFFFF`, text-dim `#AAAAAA`, yellow `#FFFF55`, cyan `#55FFFF`, bar-cyan `#00AAAA`, green `#55FF55`, red `#FF5555`, hangup-red `#AA0000`, ghost `#AAAAFF`.
- **Screen_Frame**: The three parts every screen has, top to bottom: the Status_Bar, the content area, and the Function_Key_Bar.
- **Status_Bar**: The top bar of a screen, black bold text on bar-cyan, showing the app name and version, the screen's context, the fee rate, and the line status.
- **Function_Key_Bar**: The bottom bar of a screen, on black, listing the keys the screen accepts, each as the key name in yellow and its label in white.
- **Display_Face**: GalmuriMono11 shown at a large size for `BLUELINE`, `NO CARRIER`, `THE LINE IS HAUNTED`, and the big Session_Screen numbers. Sizes are multiples of 11 CSS pixels where possible (for example 44, 55, 66, 88, 110 px), so the 11-pixel pixel grid of the font stays sharp.
- **Key_Button**: A real `<button>` labeled with its key, for example `ESC · HANG UP`, at least 48 CSS pixels tall, with square corners.
- **Modem_Log**: The lines the Dial_Screen streams while dialing: `ATZ`, `OK`, `ATDT <number>`, `DIALING...`, `RING... RING...`, `CONNECT 2400`.
- **Caller_Number**: The number in `WELCOME BACK, CALLER #0017`. See Requirement 4.
- **Character_Counter**: The `12/60` or `21/120` text next to a Text_Field, showing the current Character count and the limit.
- **Sysop_Notice**: The dashed box on the Purpose_Screen that summarizes the last 7 days of Outcomes.
- **Purpose_Band**: The yellow band at the top of the Session_Screen that shows the Purpose.
- **Progress_Bar**: The 20-cell text bar on the Session_Screen, `▓` for elapsed cells and `░` for the rest.
- **Receipt_Preview**: The column on the NO_CARRIER_Screen with today's and this week's calls, fees, and Outcome counts.
- **Drop_Time**: The moment the line dropped. For a Time_Up, the scheduled end time.
- **Drift_Time**: The time from the Drop_Time to now, while the user has not come back to the BLUELINE tab.
- **Grace_Period**: The Drift_Time after which a returning user sees the Haunted_Screen: 60 seconds, or 10 seconds for a Session with the 1 MIN (DEMO) Planned_Duration. See Requirement 9.
- **Haunt_Full_Time**: The Drift_Time at which the Haunt_Level reaches 1: 600 seconds (10 minutes), or 60 seconds for a Session with the 1 MIN (DEMO) Planned_Duration.
- **Haunted_Screen**: The screen `THE LINE IS HAUNTED`, shown before the NO_CARRIER_Screen when the Drift_Time is at least the Grace_Period. See Requirement 9.
- **Haunt_Level**: A number from 0 to 1 that sets how strong the Haunted_Screen ghosts are: `min(1, Drift_Time / Haunt_Full_Time)`. See Requirement 9.
- **Scanline_Layer**: A static, non-interactive overlay of thin horizontal lines over the whole screen. The faint Scanline_Layer is on every screen; the strong one is on the Haunted_Screen only.
- **Narrow viewport**: A viewport less than 600 CSS pixels wide, as in the purpose-board spec.

## Requirements

### Requirement 1: Palette, Type, and Effects

**User Story:** As a user, I want BLUELINE to look like a real 1990s terminal program, so that the dial-in ritual feels deliberate rather than like a themed web page.

#### Acceptance Criteria

1. THE BLUELINE SHALL draw every background, text, border, and button color from the Palette, with no other colors, except that the Haunted_Screen ghost layers MAY use the Palette colors at reduced opacity.
2. THE BLUELINE SHALL use no gradients, no rounded corners, and no shadows, except the Scanline_Layers and the Haunted_Screen red / cyan text offset (Requirement 9).
3. THE BLUELINE SHALL set all text, body and Display_Face alike, in the Bundled_Font (GalmuriMono11) served from the BLUELINE origin, and SHALL NOT add a second font file. Display_Face sizes SHALL be multiples of 11 CSS pixels wherever the layout allows.
4. THE BLUELINE SHALL make no request to any other origin for fonts or any other asset; the mockups' Google Fonts links SHALL NOT be copied into the app.
5. THE BLUELINE SHALL show all text that BLUELINE generates in ALL-CAPS English, except Korean flavor lines (the greeting, the Purpose_Screen hint, the Sysop_Notice, the function-key hints), each of which SHALL have its English meaning on the same screen.
6. EVERY screen SHALL show the faint Scanline_Layer. It SHALL NOT move or flicker, SHALL NOT receive pointer input, and SHALL be `aria-hidden="true"`. THE BLUELINE SHALL show no flicker animation outside the Haunted_Screen.
7. EVERY text and background pair that BLUELINE shows SHALL have a contrast ratio of at least 4.5:1, measured with the Scanline_Layer over both, except decorative Haunted_Screen ghost text marked `aria-hidden="true"`.

### Requirement 2: Screen Frame, Boxes, and Buttons

**User Story:** As a user, I want every screen to share the same terminal frame, so that I always know where the status and the keys are.

#### Acceptance Criteria

1. EVERY screen SHALL show, top to bottom, the Status_Bar, the content area, and the Function_Key_Bar. The Command_Prompt, where the screen has one, SHALL sit between the content area and the Function_Key_Bar.
2. THE Status_Bar SHALL show, left to right: the app name and version, the screen's context (for example `DESTINATION: YOUTUBE`), the fee rate `₩40/MIN (FICTIONAL)`, and the line status (`OFF LINE`, `● ON LINE`, `NO CARRIER`, or `LINE STATUS: UNSTABLE`). The Status_Bar text SHALL NOT include the Purpose or the Message.
3. THE Function_Key_Bar SHALL list only keys and Commands that the current screen accepts, each as the key name in yellow and its label in white.
4. THE BLUELINE SHALL draw boxes with CSS borders of `4px double` or `1px dashed`, and SHALL NOT draw box edges with `+`, `-`, or `|` characters.
5. EVERY button SHALL be a Key_Button: a real `<button>`, at least 48 CSS pixels tall and 44 CSS pixels wide, with square corners, labeled with its key (for example `Y · YES (DONE)`), and working with a single click or tap.
6. THE content area SHALL have 28 to 40 CSS pixels of padding on viewports 600 CSS pixels and wider, and at least 12 CSS pixels on a Narrow viewport.

### Requirement 3: Layout on Small and Large Screens

**User Story:** As a phone user, I want the terminal look to fit my screen, so that I can use BLUELINE on my iPhone without scrolling sideways.

#### Acceptance Criteria

1. THE BLUELINE SHALL render every screen with no horizontal scrolling on viewports from 360 to 1920 CSS pixels wide, including a 60-Character Hangul Purpose and a 120-Character Hangul Message.
2. THE BLUELINE SHALL size Display_Face text between 77 and 110 CSS pixels (multiples of 11) on viewports 960 CSS pixels and wider, and SHALL step it down on smaller viewports, preferring multiples of 11, so that the longest Display_Face line on each screen fits the width.
3. ON a Narrow viewport, THE BLUELINE SHALL stack two-column layouts (the Dial_Screen, the NO_CARRIER_Screen) into one column, with the main column first.
4. ON a Narrow viewport, THE Status_Bar and the Function_Key_Bar SHALL wrap onto more lines instead of cutting text off.

### Requirement 4: Dial Screen

**User Story:** As a returning user, I want the dial screen to greet me like a BBS and show how my last calls went, so that I remember my intent before I dial.

#### Acceptance Criteria

1. THE Dial_Screen SHALL show, in a two-column layout: on the left, the Modem_Log column; on the right, a `4px double` box with `BLUELINE` in yellow Display_Face, the line `PERSONAL DIAL-UP GATE FOR ENDLESS FEEDS`, the greeting line, the last-call line, the this-week line, and the `ENTER · DIAL IN` Key_Button.
2. BEFORE dialing, THE Modem_Log column SHALL be empty except for a dim hint; WHEN the Dial_Sequence starts, THE Dial_Screen SHALL add the Modem_Log lines one line at a time, spread over the handshake sound, with `CONNECT 2400` in green last. THE `ATDT` line SHALL show a fictional dial number of 7 to 11 digits.
3. THE Dial_Screen SHALL keep every timing rule of core Requirement 1 (handshake length, CONNECT within 500 ms of the sound's end, skip on Enter or tap, no restart, silent fallback).
4. THE greeting line SHALL read `반갑습니다 ^^  WELCOME BACK, CALLER #<Caller_Number>`, with the Caller_Number written as four digits (for example `#0017`).
5. THE last-call line SHALL show the newest Session_Record as `LAST CALL: <when> · <MM:SS> ON LINE · <Outcome_Label>`, where `<when>` is `TODAY HH:MM`, `YESTERDAY HH:MM`, or `YYYY-MM-DD HH:MM` in local time from the end timestamp. With no Session_Records, it SHALL read `FIRST CALL. WELCOME.`
6. THE this-week line SHALL read `THIS WEEK: <n> CALLS · ₩<fee> · DONE <n> · DRIFTED <n> · NO ANSWER <n>`, using the This_Week rule and the counts of the purpose-board spec, with `₩` amounts written with thousands separators.
7. IF local storage is unavailable or the stored history is unreadable, THEN THE Dial_Screen SHALL show `FIRST CALL. WELCOME.` and the this-week line with zeros, and SHALL NOT write to local storage.
8. THE Dial_Screen SHALL read the stored history only; reading it SHALL NOT change any Session_Record.

### Requirement 5: Purpose Screen

**User Story:** As a user stating my purpose, I want to see how many characters I have left and how my last week went, so that I write a purpose I can keep.

#### Acceptance Criteria

1. THE Purpose_Screen SHALL show the title `[ STATE YOUR PURPOSE ]` in yellow with the hint `무엇을 하러 들어가십니까?` and its English meaning, the label `PURPOSE (REQUIRED · 1–60 CHARS)` in cyan, the Purpose_Field on black, a Character_Counter, the Sysop_Notice, and the Key_Buttons `ESC · BACK` (outline) and `ENTER · NEXT` (grey fill).
2. THE Character_Counter SHALL show `<n>/60`, where `<n>` is the Character count of the field text after trimming, and SHALL update on every input event, including during a Hangul composition.
3. WHEN the counted Characters exceed 60, THE Character_Counter SHALL turn red; THE BLUELINE SHALL still reject the text only on submit, as in the purpose-board spec.
4. THE Sysop_Notice SHALL show the DONE and DRIFTED counts of the Session_Records whose end falls in the last 7 local calendar days, including today, for example `최근 7일: 목적을 지킨 접속 3 / 떠내려간 접속 2` with its English meaning `LAST 7 DAYS: DONE 3 · DRIFTED 2`.
5. THE `ENTER · NEXT` button SHALL submit the field text exactly as Enter does, including the Hangul composition rule of purpose-board Requirement 3.

### Requirement 6: Message Screen

**User Story:** As a user writing a note to my future self, I want to see the purpose I just wrote, so that the note can speak to it.

#### Acceptance Criteria

1. THE Message_Screen SHALL use the Purpose_Screen frame, with the title `[ MESSAGE TO FUTURE YOU ]`, the hint that the note arrives at NO CARRIER and that empty + Enter skips it, the Purpose shown read-only above the field, the label `MESSAGE (OPTIONAL · ARRIVES AT NO CARRIER)`, the Message_Field on black with yellow text, a Character_Counter `<n>/120`, and the Key_Buttons `ESC · BACK` and `ENTER · NEXT`.
2. THE Character_Counter SHALL follow Requirement 5 criteria 2 and 3 with the limit 120.

### Requirement 7: Session Screen

**User Story:** As a connected user, I want my purpose to be the most visible thing on the screen, with time and fee in big numbers, so that I see why I came and what it costs at a glance.

#### Acceptance Criteria

1. THE Session_Screen SHALL show, top to bottom: the Purpose_Band (yellow background, black text, the label `PURPOSE` and the Purpose, or `(NO PURPOSE)`), the elapsed time and the fee side by side in Display_Face, the Progress_Bar, the line `<MM:SS> LEFT · TODAY <n> CALLS · ₩<fee>`, and the `ESC · HANG UP` Key_Button in hangup-red with the text `OR TYPE BYE`.
2. THE elapsed time SHALL be labeled `ON LINE` and followed by `OF <MM:SS> BOOKED`; THE fee SHALL be labeled `FEE SO FAR` and followed by `₩40 PER STARTED MINUTE · FICTIONAL`.
3. THE Progress_Bar SHALL have exactly 20 cells; the number of `▓` cells SHALL be `floor(20 × elapsed seconds / Planned_Duration seconds)`, from 0 to 20, and SHALL never decrease during a Session (property).
4. THE `TODAY <n> CALLS · ₩<fee>` part SHALL count the Session_Records that ended today before this Session started, plus this Session, with this Session's current fee.
5. THE Status_Bar SHALL show `DESTINATION: <Destination_Label> (OPENED IN NEW TAB)` and the badge `● ON LINE` in green on black.
6. THE Session_Screen SHALL keep every timing and accuracy rule of core Requirement 6, and the purpose-board rule that the tab title and notifications never include the Purpose.

### Requirement 8: NO CARRIER and Purpose Check Screen

**User Story:** As a user who just got disconnected, I want the note from my past self, my purpose, and today's totals on one dark screen, so that I answer honestly before I see the receipt.

#### Acceptance Criteria

1. THE NO_CARRIER_Screen SHALL use the bg-black background and show, in the main column top to bottom: `+++ ATH0`, `NO CARRIER` in Display_Face, the line `<MM:SS> BOOKED · <MM:SS> ON LINE · ₩<fee> (FICTIONAL)`, the Message box (if the Session has a Message), the Purpose line, `PURPOSE ACHIEVED?`, and the Key_Buttons `Y · YES (DONE)` (green fill) and `N · NO (DRIFTED)` (outline).
2. THE Message box SHALL be a `4px double` yellow box with the heading `✉ MESSAGE FROM THE PAST · SENT <MM:SS> AGO`, the Message, and `THIS MESSAGE WILL NOT BE SHOWN AGAIN.`, where `<MM:SS>` is the time from the Session start to the moment NO CARRIER is first shown, at most `99:59`.
3. THE NO_CARRIER_Screen SHALL show a Receipt_Preview column: `TODAY`, `<n> CALLS · ₩<fee>`, `DONE <n> · DRIFTED <n> · NO ANSWER <n>`, then the same for `THIS WEEK`, counting the Session that just ended as NO ANSWER until the user answers, and at the bottom `YOUR ANSWER GOES TO THE BOARD AS POST #<Post_Number>` with the Post_Number of that Session's stored record (four digits).
4. IF local storage was unavailable when the Session ended, THEN THE Receipt_Preview SHALL count the current Session only and SHALL omit the Post_Number line.
5. THE Function_Key_Bar SHALL show `Y DONE`, `N DRIFTED`, and the hint `답하지 않고 떠나면 NO ANSWER로 기록됩니다` with its English meaning `LEAVE WITHOUT ANSWERING = NO ANSWER`.
6. FOR a Session with no Purpose, THE NO_CARRIER_Screen SHALL omit the Purpose line, the question, and the Y / N buttons, and SHALL move on as in purpose-board Requirement 5 criterion 9.
7. THE NO_CARRIER_Screen SHALL keep every behavior of purpose-board Requirements 4 and 5 (wait for Y or N, `PRESS Y OR N`, Esc does nothing, the Message at most once).

### Requirement 9: Haunted Line

**User Story:** As a user who let the timer run out and stayed in the feed, I want BLUELINE to show me, with my own words, how long I drifted, so that coming back feels like facing it rather than reading a number.

#### Acceptance Criteria

1. WHEN a Session ends by Time_Up and the user first sees the BLUELINE tab after the Drop_Time (the tab becomes visible, the tab resumes, or the tab is reloaded) with a Drift_Time of at least the Grace_Period (60 seconds, or 10 seconds for the 1 MIN (DEMO) Planned_Duration), THE BLUELINE SHALL show the Haunted_Screen before the NO_CARRIER_Screen.
2. THE BLUELINE SHALL NOT show the Haunted_Screen for a Hang_Up, for a Time_Up seen within the Grace_Period, or for a Session with no Purpose.
3. THE Haunted_Screen SHALL use the bg-haunted background, a dark red Status_Bar with `LINE STATUS: UNSTABLE`, the title `THE LINE IS HAUNTED` in red Display_Face with a cyan offset, the lines `YOUR LINE DROPPED <MM:SS> AGO.` and `YOU NEVER CAME BACK.`, a red box with `YOU SAID, <MM:SS> AGO` and the Purpose in quotes, the line `BILLED ₩<fee> (<MM:SS> BOOKED) · DRIFT +<MM:SS> NOT BILLED, BUT REMEMBERED`, and the Key_Button `ENTER · FACE IT`.
4. WHILE the Haunted_Screen is shown, THE BLUELINE SHALL update the Drift_Time once per second from the Drop_Time and the current time, with no use of a count of timer ticks.
5. THE Haunted_Screen SHALL show ghost copies of the Purpose as plain text, 4 to 6 of them at full strength, positioned across the screen, slightly rotated and letter-spaced, partly corrupted with `▒` and `█` characters, with a red / cyan offset, plus one small ASCII ghost. All ghost layers SHALL be `aria-hidden="true"` and SHALL NOT receive pointer input.
6. THE Haunt_Level SHALL be `min(1, Drift_Time / Haunt_Full_Time)`, with a Haunt_Full_Time of 600 seconds, or 60 seconds for the 1 MIN (DEMO) Planned_Duration. FOR ALL Drift_Times and Planned_Durations, THE Haunt_Level SHALL be between 0 and 1, SHALL be 0 at the Drop_Time and 1 at the Haunt_Full_Time or later, and SHALL NOT decrease when the Drift_Time grows (property). Ghost opacity and the number of ghosts shown SHALL grow with the Haunt_Level.
7. THE Grace_Period and the Haunt_Full_Time for both cases SHALL be defined in one place in the code (`src/core/config.ts`).
8. THE Haunted_Screen SHALL show the strong Scanline_Layer and a flicker on the title and the ghosts. WHERE the user prefers reduced motion, THE flicker SHALL be off and the ghosts SHALL not move; the strong Scanline_Layer stays, static.
9. WHEN the user presses Enter (or taps `ENTER · FACE IT`), THE BLUELINE SHALL show the NO_CARRIER_Screen of Requirement 8, with the Message if the Session has one.
10. THE Haunted_Screen SHALL NOT change the fee, the Session_Record, or the Outcome, SHALL NOT show the Message, and SHALL appear at most once per Session. A reload while the Haunted_Screen is shown SHALL follow purpose-board Requirement 9 criterion 6 (Dial_Screen, NO ANSWER kept).
11. THE fee shown on the Haunted_Screen SHALL equal the fee of the Session_Record, which is computed from the Planned_Duration (core Requirement 7 criterion 6).

### Requirement 10: Screens without a Mockup

**User Story:** As a user, I want the menus, the receipt, and the Board to match the new look, so that the app feels like one program.

#### Acceptance Criteria

1. THE Destination_Menu, the URL entry, the Duration_Menu, the Connect_Confirm_Screen, the Receipt_Screen, and the Board_Screen SHALL use the Screen_Frame, the Palette, Key_Buttons, and CSS boxes, with the same content, keys, and order as in the earlier specs.
2. THE Status_Bar context SHALL be `MAIN MENU`, `ENTER URL`, `DESTINATION: <label>`, `CONNECT?`, `RECEIPT`, and `BOARD · PAGE <p>/<n>` on those screens.
3. THE Board_Screen SHALL keep the 600-pixel rule of purpose-board Requirement 7 (Outcome words or `Y` / `N` / `?`).

### Requirement 11: Accessibility

**User Story:** As a screen reader or keyboard user, I want the terminal look to keep working text and focus, so that the style does not lock me out.

#### Acceptance Criteria

1. THE BLUELINE SHALL keep all screen text as DOM text, with no text in a canvas or an image.
2. THE Status_Bar and the Function_Key_Bar SHALL be real text that screen readers read once per screen, and decorative characters (the Progress_Bar cells, `▒ █`, box drawing) SHALL be hidden from screen readers or given a text equivalent (for example the Progress_Bar as `75% OF BOOKED TIME`).
3. EVERY focusable element SHALL show a visible focus outline in a Palette color.
4. THE elapsed time and fee on the Session_Screen SHALL keep `role="timer"` with `aria-live="off"`.

### Requirement 12: Behavior Kept

**User Story:** As the developer, I want the redesign to change how BLUELINE looks and not what it does, so that every earlier requirement and test still holds.

#### Acceptance Criteria

1. EVERY requirement of the core spec and the purpose-board spec SHALL still hold, except the criteria listed in the Introduction table.
2. EVERY existing property test and unit test SHALL still pass, changed only where a test checks text that this spec changes.
3. THE stored history and active-session formats SHALL NOT change.
4. THE demo flow of purpose-board Requirement 12 (returning before Time_Up) SHALL still finish in less than 150 seconds, and SHALL NOT pass through the Haunted_Screen.
5. WHEN a user runs the same demo flow but stays in the Destination tab past Time_Up, returns to the BLUELINE tab between 10 and 30 seconds after Time_Up, presses Enter on the Haunted_Screen within 5 seconds, and presses Y or N on the NO_CARRIER_Screen within 5 seconds, THE BLUELINE SHALL display the Receipt_Screen less than 150 seconds after the user first pressed Enter on the Dial_Screen.
6. THE production bundle SHALL make no request to another origin (core Requirement 10 criterion 2), checked with the production CSP.

### Requirement 13: Open Device Checks and README

**User Story:** As the builder, I want the checks that need real devices done once on the final screens, and a README that matches them, so that the submission is complete.

#### Acceptance Criteria

1. THE open rows of `docs/manual-checks.md` part B and part C2 SHALL be checked on the final screens and recorded with the browser and the result, including iPhone Safari with a Hangul keyboard.
2. THE Haunted_Screen SHALL be checked on a desktop browser (stay in the destination tab past the Grace_Period) and on iPhone Safari (stay in the destination app, then return).
3. THE README SHALL be written in this spec, covering the core flow, the purpose-board features, the Haunted_Screen, the demo path, privacy, known limitations, development, Kiro usage, and credits and licenses, as planned in the core design.

## Confirmed decisions

Confirmed before design. Each one is written into the criteria above.

1. **CSS boxes replace text boxes.** The core spec's "box drawn only with text characters" becomes CSS `4px double` / `1px dashed` borders, as `design.md` says. (Req 2.4)
2. **Display face.** GalmuriMono11 scaled up for the big titles and numbers; no second font file. Sizes are multiples of 11 px where the layout allows (for example 88 px, 110 px). (Req 1.3, 3.2)
3. **Version in the Status_Bar.** Show the real `package.json` version (`BLUELINE 0.1.0`), not the mockups' fictional `BLUELINE 2.4`. (Req 2.2)
4. **Dial number.** Keep the current fictional 10-digit `ATDT 0145550199` instead of the mockup's 5-digit `ATDT 01410`, so the core 7-to-11-digit rule still holds. (Req 4.2)
5. **Caller_Number.** The Caller_Number is the next Post_Number (the largest stored Post_Number + 1), so it matches the post this call will become. (Req 4.4)
6. **No `GO BOARD` on the Dial_Screen.** The Main mockup's footer shows `GO BOARD`, but the Board stays at `4. BOARD` on the Destination_Menu; the Dial_Screen footer lists only `ENTER DIAL` and `HELP`. (Req 2.3)
7. **Haunted_Screen trigger and Grace_Period.** Time_Up only, Sessions with a Purpose only, at most once per Session; nothing new is stored (the drift is shown, not saved). The Grace_Period is 60 seconds, or 10 seconds for the 1 MIN (DEMO) Planned_Duration. (Req 9.1, 9.2, 9.10)
8. **Haunt_Level.** Linear from 0 at the Drop_Time to 1 at the Haunt_Full_Time: 10 minutes, or 1 minute for the 1 MIN (DEMO) Planned_Duration. Both demo values and both normal values live in `src/core/config.ts`. (Req 9.6, 9.7)
9. **Scanlines.** A very faint, static Scanline_Layer stays on every screen, with text contrast of at least 4.5:1 under it. The strong Scanline_Layer and the flicker are on the Haunted_Screen only; the flicker is off under `prefers-reduced-motion: reduce`. (Req 1.6, 1.7, 9.8)
10. **Sysop_Notice period.** The last 7 local calendar days including today, not This_Week. (Req 5.4)
11. **`SENT <MM:SS> AGO`.** Measured from the Session start to the first NO CARRIER view; the Receipt_Preview counts the ended Session as NO ANSWER until the answer. (Req 8.2, 8.3)
12. **This is the last spec.** The README task moved from the earlier specs is done here, after the device checks. (Req 13.3)
