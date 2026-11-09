# Requirements Document

## Introduction

BLUELINE is a client-side static web app that acts as a 1990s dial-up BBS-style "connection gate" for endless-feed apps. The user dials in, chooses a destination and a session length, watches an elapsed-time clock and a fictional connection-fee meter while the destination is open in another tab, and is disconnected with a NO CARRIER screen and a receipt.

This document covers the Core flow MVP only: Dial screen, Destination menu, Duration menu, Connect and live Session screen, Time-up disconnect, Receipt, and Early hang-up. BLUELINE draws a boundary around feed use. BLUELINE does not block, filter, inspect, or control the destination or any other app. BLUELINE runs entirely in the browser with no accounts, no server, and no tracking of watched content. Session history stays in the user's browser.

Out of scope for this MVP: enforcing limits inside other apps, browser extensions, iOS Shortcuts integration, multi-user chat, a real BBS server, and SSH access.

Known limitation: Safari on iPhone pauses scripts in background tabs, and other mobile browsers may do the same. On those browsers BLUELINE cannot alert the user at Time_Up while the user is in the Destination tab. When the user returns to the BLUELINE tab, BLUELINE shows the NO_CARRIER_Screen and then the Receipt_Screen, with the fee computed from the scheduled end time. The 60-second alert bound in Requirement 7 criterion 9 applies to desktop browsers only.

## Glossary

- **BLUELINE**: The client-side static web app described in this document. BLUELINE runs in a single browser tab, called the BLUELINE tab.
- **Dial_Screen**: The first screen of the Core flow. The Dial_Screen shows a blue background, ATDT dial text, the modem handshake, and the CONNECT message.
- **Dial_Sequence**: The period from the Enter press or tap that starts dialing on the Dial_Screen until the `CONNECT` message is displayed.
- **Destination_Menu**: The numbered menu where the user picks a Destination: 1. YOUTUBE, 2. INSTAGRAM, 3. CUSTOM URL.
- **Destination**: The web address that BLUELINE opens in a new tab. Preset Destinations are `https://www.youtube.com/` (label YOUTUBE) and `https://www.instagram.com/` (label INSTAGRAM). A Custom Destination is a URL entered by the user.
- **Destination_Label**: The plain-text name of a Destination shown in the UI: YOUTUBE, INSTAGRAM, or CUSTOM.
- **URL_Normalizer**: The component that validates and normalizes a user-entered Custom URL into an absolute `http` or `https` URL.
- **Duration_Menu**: The numbered menu where the user picks a Planned_Duration: 1. 1 MIN (DEMO), 2. 5 MIN, 3. 10 MIN, 4. 15 MIN, 5. 30 MIN.
- **Planned_Duration**: The session length chosen in the Duration_Menu.
- **Connect_Confirm_Screen**: The screen shown after a Planned_Duration is selected and before the Destination opens. The Connect_Confirm_Screen shows the Destination_Label, the Planned_Duration, the prompt `CONNECT? PRESS ENTER`, and an on-screen CONNECT button.
- **Connect step**: The action that starts when the user presses Enter or taps the CONNECT button on the Connect_Confirm_Screen. The Connect step opens the Destination and starts the Session.
- **Desktop browser**: A browser running on a laptop or desktop operating system (macOS, Windows, Linux, ChromeOS), as opposed to a phone or tablet.
- **Session**: The period that starts when BLUELINE opens the Destination and ends at Time_Up or Hang_Up.
- **Session_Screen**: The live screen shown in the BLUELINE tab during a Session. The Session_Screen shows the Destination_Label, Elapsed_Time, Remaining_Time, and the Fee_Meter.
- **Elapsed_Time**: The time since Session start, computed from wall-clock timestamps and shown in MM:SS format.
- **Remaining_Time**: Planned_Duration minus Elapsed_Time, shown in MM:SS format and never below 00:00.
- **Fee_Meter**: The Session_Screen element that shows the running fee in Fee_Units.
- **Fee_Unit**: The fictional won used for all fees, shown with the symbol `₩` before the amount (for example `₩40`). Fee_Units have no monetary value, and BLUELINE labels Fee_Units as fictional wherever a fee appears.
- **Fee_Rate**: The fixed number of Fee_Units charged per started minute of Elapsed_Time. The default Fee_Rate is ₩40 per started minute. Fee_Rate is a single constant defined in one place in the code.
- **Fee_Calculator**: The component that computes a fee as `fee(elapsedSeconds) = ceil(elapsedSeconds / 60) × Fee_Rate` Fee_Units, with `fee(0) = 0`.
- **Time_Formatter**: The component that formats a whole number of seconds as an MM:SS string and parses an MM:SS string back into a whole number of seconds.
- **Time_Up**: The event that occurs when Elapsed_Time reaches Planned_Duration.
- **Hang_Up**: The event that occurs when the user ends a Session before Time_Up, by typing `bye` or by using the Hang_Up_Control.
- **Hang_Up_Control**: The Escape key on keyboards and an on-screen HANG UP button on the Session_Screen.
- **NO_CARRIER_Screen**: The screen shown when a Session ends. The NO_CARRIER_Screen shows the text NO CARRIER.
- **Receipt_Screen**: The screen shown after the NO_CARRIER_Screen. The Receipt_Screen lists session duration, session fee, today's total, and this week's total.
- **Command_Prompt**: The text input on every screen where the user types commands and submits them with the Enter key.
- **Command_Parser**: The component that converts Command_Prompt text into a Command value.
- **Command**: One of: a menu number (digit 0–9), `bye`, `back`, `help`, or `go <alias>`, where `<alias>` is a Destination_Alias.
- **Destination_Alias**: A short name for a preset Destination used with the `go` Command: `yt` for YOUTUBE and `ig` for INSTAGRAM.
- **Session_State_Machine**: The component that holds the current Session_State and applies transitions between Session_States.
- **Session_State**: One of the six states of the Core flow: IDLE (Dial_Screen before dialing), DIALING (Dial_Sequence in progress or `CONNECT` displayed), SELECT_DEST (Destination_Menu or URL entry field displayed), SELECT_DURATION (Duration_Menu or Connect_Confirm_Screen displayed, including while the `POPUP BLOCKED` message is shown), CONNECTED (Session active), and ENDED (Session finished; NO_CARRIER_Screen or Receipt_Screen displayed).
- **Bundled_Font**: The monospace or pixel font file that BLUELINE serves from its own origin. The Bundled_Font is licensed under the SIL Open Font License (OFL) and contains Hangul glyphs.
- **Sound_Engine**: The component that synthesizes the modem handshake sound and the NO CARRIER sound in the browser, with no audio files fetched from third parties.
- **Notifier**: The component that shows a browser notification at Time_Up.
- **Session_Record**: The stored summary of one finished Session: start timestamp, end timestamp, Planned_Duration, actual duration, fee, end reason (TIME UP or HANG UP), and Destination_Label. A Session_Record contains no URL.
- **Session_History**: The list of Session_Records stored in the browser's local storage.
- **History_Serializer**: The component that converts Session_History to and from the stored text format.
- **Active_Session_State**: The stored state of a Session in progress (start timestamp, Planned_Duration, Destination_Label), used to recover the Session after a reload of the BLUELINE tab.
- **Today**: The period from 00:00 local time of the current day to now.
- **This_Week**: The period from 00:00 local time of the most recent Monday to now.

## Requirements

### Requirement 1: Dial Screen and Handshake

**User Story:** As a feed-app user, I want a deliberate dial-in ritual before I connect, so that entering a feed is a conscious choice rather than a reflexive tap.

#### Acceptance Criteria

1. WHEN the BLUELINE tab loads with no Active_Session_State, THE BLUELINE SHALL display the Dial_Screen with a blue background, the BLUELINE name, and the prompt `PRESS ENTER OR TAP TO DIAL`.
2. WHILE the Dial_Screen shows the prompt `PRESS ENTER OR TAP TO DIAL`, THE Sound_Engine SHALL play no sound.
3. WHEN the user presses Enter or taps the Dial_Screen while the prompt `PRESS ENTER OR TAP TO DIAL` is shown, THE BLUELINE SHALL start the Dial_Sequence.
4. WHEN the Dial_Sequence starts, THE Dial_Screen SHALL display the text `ATDT` followed by a dial number of 7 to 11 digits, one character at a time. Each character SHALL appear between 30 and 200 milliseconds after the previous character, and the full text SHALL be displayed within 3 seconds of the Dial_Sequence start.
5. WHEN the Dial_Sequence starts, THE Sound_Engine SHALL play a synthesized modem handshake sound lasting no less than 2 seconds and no more than 8 seconds.
6. WHEN the handshake sound ends, THE Dial_Screen SHALL display the message `CONNECT` within 500 milliseconds, and THE BLUELINE SHALL display the Destination_Menu within 2 seconds of the `CONNECT` message appearing.
7. WHILE the Dial_Sequence is in progress, WHEN the user presses Enter or taps the Dial_Screen, THE BLUELINE SHALL stop the handshake sound within 200 milliseconds and display the complete `ATDT` text and the `CONNECT` message. THE BLUELINE SHALL then display the Destination_Menu within 2 seconds of that press or tap.
8. WHILE the Dial_Sequence is in progress or the `CONNECT` message is displayed, THE BLUELINE SHALL display the Destination_Menu exactly once and SHALL NOT restart the Dial_Sequence or the handshake sound, regardless of how many additional times the user presses Enter or taps the Dial_Screen.
9. IF the browser rejects audio playback, or audio playback stops with an error before the handshake sound ends, THEN THE BLUELINE SHALL complete the Dial_Sequence with the `ATDT` text and the `CONNECT` message and no sound. THE BLUELINE SHALL show no error message that blocks the flow, and SHALL display the Destination_Menu within 10 seconds of the Dial_Sequence start.
10. THE Dial_Screen SHALL display exactly one Korean greeting written in Hangul, with the English meaning of the greeting on the same line or on the line directly below it. The greeting and its English meaning SHALL be visible while the prompt `PRESS ENTER OR TAP TO DIAL` is shown.

### Requirement 2: Destination Menu

**User Story:** As a feed-app user, I want to pick where I am going from a numbered menu, so that moving requires intent.

#### Acceptance Criteria

1. WHEN the Destination_Menu is displayed, THE Destination_Menu SHALL show exactly three numbered choices in this top-to-bottom order, `1. YOUTUBE`, `2. INSTAGRAM`, and `3. CUSTOM URL`, enclosed in a box drawn only with text characters.
2. THE BLUELINE SHALL show every Destination, including a Custom Destination, only as a plain-text Destination_Label (YOUTUBE, INSTAGRAM, or CUSTOM), with no third-party logo, favicon, trademark graphic, or other image.
3. WHEN the user presses the digit key 1 or 2, or taps the matching menu item, THE Destination_Menu SHALL select the matching preset Destination (`https://www.youtube.com/` with the Destination_Label YOUTUBE, or `https://www.instagram.com/` with the Destination_Label INSTAGRAM) and display the Duration_Menu within 500 milliseconds.
4. WHEN the user presses the digit key 3 or taps the CUSTOM URL menu item, THE Destination_Menu SHALL display an empty URL entry field labeled `ENTER URL:`, give the URL entry field keyboard focus, and accept up to 2048 characters in the URL entry field, with no characters accepted beyond the 2048th.
5. IF the user presses the digit key 0 or any digit key from 4 to 9 while the Destination_Menu is displayed, THEN THE Destination_Menu SHALL display the message `INVALID SELECTION`, keep the Destination_Menu on screen, and leave no Destination selected.
6. WHEN the user presses any key or taps any menu item after the `INVALID SELECTION` message appears, THE Destination_Menu SHALL remove the `INVALID SELECTION` message and handle that key press or tap as defined in criteria 3, 4, and 5.
7. WHEN the user returns to the Destination_Menu from the Duration_Menu or the URL entry field, THE BLUELINE SHALL clear any previously selected Destination, so that the next selection on the Destination_Menu decides the Destination that opens.

### Requirement 3: Custom URL Validation

**User Story:** As a feed-app user, I want to enter my own destination, so that I can use the gate for any feed site.

#### Acceptance Criteria

1. WHEN the user presses Enter in the URL entry field, THE URL_Normalizer SHALL remove leading and trailing whitespace from the entered text and validate the remaining text, which is called the submitted text.
2. WHEN the submitted text is 1 to 2048 characters long, begins with the scheme `http://` or `https://` in any letter case, and has a non-empty host, THE URL_Normalizer SHALL accept the submitted text unchanged.
3. WHEN the submitted text is 1 to 2048 characters long, has no scheme, and begins with a valid host followed by an optional port and an optional path, THE URL_Normalizer SHALL prefix the submitted text with `https://` and accept the result. A valid host is two or more labels separated by dots, where each label has 1 to 63 ASCII letters, digits, or hyphens and does not begin or end with a hyphen. A port is a colon followed by a number from 1 to 65535.
4. IF the submitted text begins with any scheme other than `http` or `https`, including `javascript:`, `data:`, `file:`, `ftp:`, and `mailto:`, THEN THE URL_Normalizer SHALL reject the submitted text, and THE BLUELINE SHALL display the message `INVALID URL - HTTP OR HTTPS ONLY`, keep the URL entry field on screen with the entered text and focus kept, and select no Destination.
5. IF the entered text is empty or whitespace-only, THEN THE BLUELINE SHALL display the message `INVALID URL`, keep the URL entry field on screen with focus kept, and select no Destination.
6. IF the submitted text is longer than 2048 characters, or has the `http` or `https` scheme with an empty host, or has no scheme and does not begin with a valid host, THEN THE URL_Normalizer SHALL reject the submitted text, and THE BLUELINE SHALL display the message `INVALID URL`, keep the URL entry field on screen with the entered text and focus kept, and select no Destination.
7. WHEN the URL_Normalizer accepts a URL, THE BLUELINE SHALL select the accepted URL as the Destination with the Destination_Label CUSTOM, clear any displayed error message, and display the Duration_Menu.
8. THE URL_Normalizer SHALL produce, for every accepted input, a normalized URL that the URL_Normalizer accepts unchanged when that normalized URL is submitted again (idempotence property).
9. WHILE the URL entry field has focus, THE BLUELINE SHALL insert every digit key from 0 to 9 into the URL entry field as text, with no menu selection and no return to the previous menu.
10. WHEN the user submits the exact text `back` in the URL entry field, in any letter case, THE BLUELINE SHALL display the Destination_Menu and select no Destination.

### Requirement 4: Duration Menu

**User Story:** As a feed-app user, I want to choose how long I will stay before I connect, so that the session has a clear end.

#### Acceptance Criteria

1. THE Duration_Menu SHALL display the numbered choices `1. 1 MIN (DEMO)`, `2. 5 MIN`, `3. 10 MIN`, `4. 15 MIN`, and `5. 30 MIN` inside an ASCII box, listed top to bottom in that order.
2. THE Duration_Menu SHALL display the Fee_Rate value used by the Fee_Calculator as the symbol `₩` followed by the Fee_Rate value and the text `PER STARTED MINUTE` (for example `₩40 PER STARTED MINUTE`), on the same screen as the numbered choices, together with a label stating that Fee_Units are fictional.
3. WHEN the user presses a digit key from 1 to 5 or taps the matching menu item, THE Duration_Menu SHALL set the Planned_Duration to the matching length (1 → 60 seconds, 2 → 300 seconds, 3 → 600 seconds, 4 → 900 seconds, 5 → 1800 seconds) and display the Connect_Confirm_Screen within 500 milliseconds. Selecting a Planned_Duration SHALL NOT open the Destination.
4. IF the user presses a digit key from 6 to 9, THEN THE Duration_Menu SHALL display the message `INVALID SELECTION`, keep the Duration_Menu on screen, leave the Planned_Duration unset, and not display the Connect_Confirm_Screen.
5. WHILE the `INVALID SELECTION` message is displayed, WHEN the user presses a digit key or taps a menu item, THE Duration_Menu SHALL remove the `INVALID SELECTION` message before handling the new input.
6. IF the user presses a digit key from 1 to 9 while the Connect_Confirm_Screen is displayed, or presses any key or taps any element after the Connect step has started, THEN THE BLUELINE SHALL ignore the input as a menu selection, keep the first Planned_Duration, and start no second Connect step.
7. WHEN the Connect_Confirm_Screen is displayed, THE Connect_Confirm_Screen SHALL show the selected Destination_Label, the Planned_Duration in the Duration_Menu label format (for example `5 MIN`), the prompt `CONNECT? PRESS ENTER`, and a CONNECT button, and SHALL give keyboard focus to the Command_Prompt.
8. WHEN the user presses the digit key 0, presses the Escape key (whether or not the Command_Prompt has focus), or submits the Command `back` while the Connect_Confirm_Screen is displayed and the Connect step has not started, THE BLUELINE SHALL display the Duration_Menu with the Planned_Duration unset and the selected Destination kept.

### Requirement 5: Connect and Open Destination

**User Story:** As a feed-app user, I want the destination to open in a new tab while BLUELINE keeps time, so that I keep the full feed experience with a visible boundary.

#### Acceptance Criteria

1. WHEN the user presses Enter with an empty Command_Prompt, or clicks or taps the CONNECT button, while the Connect_Confirm_Screen is displayed, THE BLUELINE SHALL start the Connect step and open the Destination URL in exactly one new browser tab during that same key press, click, or tap.
2. THE BLUELINE SHALL open a Destination URL that is character-for-character identical to the preset Destination URL or, for a Custom Destination, to the URL_Normalizer output, with no added query parameters or fragments and no proxying, framing, or content changes.
3. THE BLUELINE SHALL open the Destination tab with an empty opener reference, so that scripts in the Destination tab have no reference back to the BLUELINE tab.
4. WHEN the browser reports that the Destination tab opened, THE BLUELINE SHALL record the Session start timestamp as the wall-clock time of that moment and save the Active_Session_State containing that start timestamp, the Planned_Duration, and the Destination_Label.
5. IF the browser blocks the new tab, THEN THE BLUELINE SHALL display the message `POPUP BLOCKED` with a tappable link to the same Destination URL, and record no Session start timestamp and save no Active_Session_State until the user activates the link.
6. WHEN the user activates the link shown with the `POPUP BLOCKED` message, THE BLUELINE SHALL open the Destination URL in a new tab under the rules of criteria 2 and 3 and start the Session as defined in criterion 4, with the start timestamp taken at the moment of link activation.
7. WHEN the Session starts, THE BLUELINE SHALL display the Session_Screen in the BLUELINE tab within 1 second, showing the Destination_Label, an Elapsed_Time no greater than 00:01, and a Remaining_Time equal to the Planned_Duration minus that Elapsed_Time.
8. IF the user presses Enter or the CONNECT button again, or activates the `POPUP BLOCKED` link again, after the Connect step has started, THEN THE BLUELINE SHALL open no additional Destination tab and keep the original Session start timestamp and Active_Session_State.

### Requirement 6: Live Session Screen and Fee Meter

**User Story:** As a feed-app user, I want to see elapsed time and a running fee while I am connected, so that the cost of my attention is visible.

#### Acceptance Criteria

1. WHILE a Session is active, THE Session_Screen SHALL display the Destination_Label, Elapsed_Time in MM:SS format, Remaining_Time in MM:SS format, and the Fee_Meter showing the current fee as a non-negative whole number of Fee_Units.
2. WHILE a Session is active and the BLUELINE tab is visible, THE Session_Screen SHALL update Elapsed_Time, Remaining_Time, and the Fee_Meter at least once every 1000 milliseconds, with each displayed Elapsed_Time differing from the wall-clock time since the Session start timestamp by no more than 1 second.
3. THE Fee_Calculator SHALL compute the fee as `fee(elapsedSeconds) = ceil(elapsedSeconds / 60) × Fee_Rate` Fee_Units, with `fee(0) = 0`, where elapsedSeconds is the whole number of seconds, rounded down, between the Session start timestamp and the current wall-clock time, limited to the range 0 to the Planned_Duration in seconds (maximum 1800).
4. FOR ALL pairs of elapsed times t1 ≤ t2 in the range 0 to 1800 seconds, THE Fee_Calculator SHALL return a fee for t1 that is less than or equal to the fee for t2 (non-decreasing property).
5. FOR ALL elapsed times in the range 0 to 1800 seconds, THE Fee_Calculator SHALL return a fee that is greater than or equal to 0 (non-negative property).
6. FOR ALL elapsed times in the range 0 to 1800 seconds, THE Fee_Calculator SHALL return a fee that is a whole-number multiple of Fee_Rate (multiple-of-rate property).
7. WHEN the elapsed time is 0 seconds, THE Fee_Calculator SHALL return a fee of 0 Fee_Units (zero-at-zero property).
8. THE Fee_Meter SHALL display the symbol `₩` before the fee value, together with a label on the Session_Screen stating that Fee_Units are fictional.
9. WHEN the BLUELINE tab becomes visible after being hidden, THE Session_Screen SHALL recompute Elapsed_Time, Remaining_Time, and the Fee_Meter from the Session start timestamp and the current wall-clock time, and display the recomputed values within 1000 milliseconds of the tab becoming visible.
10. WHILE a Session is active, THE Session_Screen SHALL display the hang-up instructions `TYPE BYE OR PRESS ESC TO HANG UP` and the on-screen HANG UP button.
11. IF the current wall-clock time is earlier than the Session start timestamp, THEN THE Session_Screen SHALL display Elapsed_Time as 00:00, Remaining_Time equal to the Planned_Duration, and a fee of 0 Fee_Units, and keep the Session active.
12. IF the elapsed wall-clock time since the Session start timestamp is greater than or equal to the Planned_Duration, THEN THE Session_Screen SHALL display Elapsed_Time equal to the Planned_Duration, Remaining_Time as 00:00, and the fee for the Planned_Duration in seconds.
13. WHEN the Session_Screen renders, THE BLUELINE SHALL compute Elapsed_Time as the current wall-clock time minus the Session start timestamp at that render, with no use of a count of timer ticks.
14. THE Time_Formatter SHALL format a whole number of seconds from 0 to 1800 as an MM:SS string with two-digit minutes and two-digit seconds (for example, 0 → `00:00`, 75 → `01:15`, 1800 → `30:00`).
15. FOR ALL whole numbers of seconds from 0 to 1800, THE Time_Formatter SHALL produce an MM:SS string with no minus sign, and parsing that string with the Time_Formatter SHALL return the same whole number of seconds (round-trip property).

### Requirement 7: Time-Up Disconnect

**User Story:** As a feed-app user, I want the system to declare the session over when time is up, so that I get a clear end instead of an endless feed.

#### Acceptance Criteria

1. WHILE the BLUELINE tab is visible, WHEN Elapsed_Time reaches Planned_Duration, THE BLUELINE SHALL display the NO_CARRIER_Screen within 1 second, with the Session_Screen last showing Remaining_Time as 00:00.
2. WHEN Time_Up occurs, THE Sound_Engine SHALL play a synthesized NO CARRIER sound lasting no more than 3 seconds.
3. WHERE the browser supports notifications and the user has granted notification permission, WHEN Time_Up occurs, THE Notifier SHALL show one browser notification with the title `NO CARRIER` and a message stating that the session time is up, with no Destination URL in the title or message.
4. WHERE the browser supports notifications, WHEN the user selects a Planned_Duration in the Duration_Menu while the browser's notification permission is neither granted nor denied, THE BLUELINE SHALL request notification permission from the browser during that same key press or tap and display the Connect_Confirm_Screen without waiting for the user's answer. THE BLUELINE SHALL make no notification permission request on the Dial_Screen, the Destination_Menu, or the Duration_Menu before a Planned_Duration is selected, SHALL make no permission request during the Connect step, and SHALL make at most one permission request between the start of a Dial_Sequence and the next display of the Dial_Screen, even if the user goes back and selects a Planned_Duration again.
5. IF notification permission is denied or notifications are unsupported, THEN at Time_Up THE BLUELINE SHALL, while the BLUELINE tab is hidden, flash the BLUELINE tab title by alternating the title `NO CARRIER` with the normal BLUELINE title, have the Sound_Engine play the NO CARRIER sound, and display the NO_CARRIER_Screen within 1 second after the BLUELINE tab becomes visible. THE BLUELINE SHALL show no error message about notifications and make no further permission request during that Session.
6. WHEN a Session ends by Time_Up, THE BLUELINE SHALL record the end timestamp as the Session start timestamp plus Planned_Duration, record the actual duration as the Planned_Duration, and compute the fee with the Fee_Calculator as `fee(Planned_Duration seconds) = ceil(Planned_Duration seconds / 60) × Fee_Rate` Fee_Units, even if the BLUELINE tab detects Time_Up later than that scheduled end time.
7. WHEN the NO_CARRIER_Screen has been displayed for 3 seconds, or the user presses Enter or taps the NO_CARRIER_Screen before 3 seconds pass, THE BLUELINE SHALL display the Receipt_Screen exactly once, within 1 second of whichever of these events occurs first.
8. THE NO_CARRIER_Screen and the Notifier SHALL state only that the session time is up, with no claim that BLUELINE closed, blocked, or controlled the Destination.
9. WHERE the BLUELINE tab runs in a Desktop browser, IF the BLUELINE tab is hidden when Elapsed_Time reaches Planned_Duration, THEN THE BLUELINE SHALL treat Time_Up as occurred and, within 60 seconds after the scheduled end time, either show the browser notification described in criterion 3 when notification permission is granted, or start the tab title flashing described in criterion 5 when notification permission is denied or notifications are unsupported. THE BLUELINE SHALL display the NO_CARRIER_Screen within 1 second after the BLUELINE tab becomes visible.
10. WHEN Time_Up occurs, THE BLUELINE SHALL end the Session exactly once with the end reason TIME UP, stop updating Elapsed_Time, Remaining_Time, and the Fee_Meter, and ignore any Hang_Up input received after Time_Up for that Session.
11. IF the browser cannot start audio playback at Time_Up, THEN THE BLUELINE SHALL display the NO_CARRIER_Screen and the Receipt_Screen as defined in criteria 1, 7, and 9 with no sound and no error message about audio.
12. WHEN the BLUELINE tab becomes visible while the tab title is flashing, THE BLUELINE SHALL stop the tab title flashing and restore the normal BLUELINE title within 1 second.
13. WHERE the browser pauses scripts in background tabs (for example Safari on iPhone), WHEN the BLUELINE tab resumes after the scheduled end time, THE BLUELINE SHALL treat Time_Up as occurred, end the Session as defined in criterion 6, display the NO_CARRIER_Screen within 1 second of resuming, and then display the Receipt_Screen as defined in criterion 7. BLUELINE gives no time bound for a notification or title flashing on such browsers.

### Requirement 8: Early Hang-Up

**User Story:** As a feed-app user, I want to hang up at any time, so that I can leave early and still see what the session cost.

#### Acceptance Criteria

1. WHILE a Session is active, WHEN the user submits text in the Command_Prompt that the Command_Parser returns as the Command `bye` (after trimming leading and trailing whitespace and ignoring letter case), THE BLUELINE SHALL end the Session with the end reason HANG UP.
2. WHILE a Session is active, WHEN the user presses the Escape key (whether or not the Command_Prompt has focus) or clicks or taps the HANG UP button, THE BLUELINE SHALL end the Session with the end reason HANG UP.
3. WHEN a Session ends by Hang_Up, THE BLUELINE SHALL record the actual duration as the Elapsed_Time at the moment of Hang_Up, computed from the Session start timestamp and the current wall-clock time and rounded down to whole seconds, and THE Fee_Calculator SHALL compute the session fee from that actual duration as `fee(actual duration seconds) = ceil(actual duration seconds / 60) × Fee_Rate` Fee_Units, with a fee of 0 Fee_Units for an actual duration of 0 seconds.
4. WHEN a Session ends by Hang_Up, THE BLUELINE SHALL display the NO_CARRIER_Screen within 1 second, have the Sound_Engine play the synthesized NO CARRIER sound, and display the NO_CARRIER_Screen text even if the browser cannot start audio playback.
5. WHEN the NO_CARRIER_Screen shown after a Hang_Up has been displayed for 3 seconds, or the user presses Enter or taps the NO_CARRIER_Screen, THE BLUELINE SHALL display the Receipt_Screen as defined in Requirement 9, with the end reason HANG UP.
6. WHEN a Session ends by Hang_Up, THE Notifier SHALL show no browser notification.
7. IF a further Hang_Up input (`bye`, the Escape key, or the HANG UP button) or a Time_Up occurs after the Session has already ended, THEN THE BLUELINE SHALL ignore that input or event, keep exactly one Session_Record for the Session with the end reason of whichever event ended the Session first, and play the NO CARRIER sound no more than once.
8. IF the user submits the Command `bye` or presses the Escape key while no Session is active, THEN THE BLUELINE SHALL display no NO_CARRIER_Screen and append no Session_Record to the Session_History. THE BLUELINE SHALL keep the current screen, except that the Escape key on the Connect_Confirm_Screen returns to the Duration_Menu as defined in Requirement 4 criterion 8.

### Requirement 9: Receipt

**User Story:** As a feed-app user, I want a receipt after every session, so that I can see how much attention I spent today and this week.

#### Acceptance Criteria

1. WHEN a Session ends by Time_Up or Hang_Up, THE BLUELINE SHALL append exactly one Session_Record for that Session to the Session_History and clear the Active_Session_State before displaying the NO_CARRIER_Screen.
2. THE Receipt_Screen SHALL display, inside an ASCII box, the following values for the Session that just ended: the Destination_Label, the Planned_Duration in the Duration_Menu label format (for example `5 MIN`), the actual duration in MM:SS, the end reason as `TIME UP` or `HANG UP`, the session fee equal to the fee stored in that Session's Session_Record, today's total fee, and this week's total fee, with every fee shown as a whole number of Fee_Units.
3. WHEN the Receipt_Screen is displayed, THE BLUELINE SHALL compute today's total as the sum of the fees of all Session_Records in the Session_History whose end timestamp is at or after 00:00 local time of the current day and at or before the moment of display, including the Session that just ended.
4. WHEN the Receipt_Screen is displayed, THE BLUELINE SHALL compute this week's total as the sum of the fees of all Session_Records in the Session_History whose end timestamp is at or after 00:00 local time of the most recent Monday and at or before the moment of display, including the Session that just ended.
5. THE BLUELINE SHALL compute today's total and this week's total such that, for every Session_History, this week's total is greater than or equal to today's total (metamorphic property).
6. FOR ALL Session_Histories of 0 to 1,000 Session_Records and every moment of display, THE BLUELINE SHALL compute today's total equal to the sum of the fees of exactly those Session_Records whose end timestamp falls within Today (model-based property).
7. THE Receipt_Screen SHALL show the symbol `₩` before each of the session fee, today's total, and this week's total, and SHALL display a statement that Fee_Units are fictional and have no monetary value.
8. THE Receipt_Screen SHALL display the numbered choice `1. DIAL AGAIN`.
9. WHEN the user presses the digit key 1, submits the Command `1` in the Command_Prompt, or taps the `1. DIAL AGAIN` choice on the Receipt_Screen, THE BLUELINE SHALL display the Dial_Screen.
10. IF a Time_Up or Hang_Up event occurs for a Session that has already ended, THEN THE BLUELINE SHALL handle that event as defined in Requirement 8 criterion 7 and keep the current screen.
11. IF the user presses a digit key other than 1 on the Receipt_Screen, THEN THE BLUELINE SHALL display the message `INVALID SELECTION` and keep the Receipt_Screen on screen.

### Requirement 10: Local History Storage

**User Story:** As a privacy-minded user, I want my session history to stay in my browser, so that no one tracks what I watch.

#### Acceptance Criteria

1. THE BLUELINE SHALL store the Session_History and the Active_Session_State only in the browser's local storage of the BLUELINE tab's origin, and SHALL NOT include any Destination URL, including a Custom Destination URL, in the Session_History or the Active_Session_State.
2. THE BLUELINE SHALL make no network requests other than (a) loading the page and its static assets, including the Bundled_Font files, from the origin that served BLUELINE and (b) opening the Destination in a new tab, so that no analytics, third-party font, third-party audio, or other third-party request is sent from the BLUELINE tab.
3. THE History_Serializer SHALL convert a Session_History of 0 to 1,000 Session_Records into a single text string for storage in local storage.
4. THE History_Serializer SHALL parse a stored text string into a Session_History, and SHALL treat the text as unreadable if the text cannot be parsed or if any Session_Record in it is missing a field, has an end reason other than TIME UP or HANG UP, has a Destination_Label other than YOUTUBE, INSTAGRAM, or CUSTOM, or has an end timestamp earlier than its start timestamp.
5. FOR ALL valid Session_Histories of 0 to 1,000 Session_Records, serializing then parsing SHALL produce a Session_History equal to the original, where equal means the same number of Session_Records in the same order with identical values in every field (round-trip property).
6. IF the stored Session_History text is unreadable as defined in criterion 4, THEN THE BLUELINE SHALL start a new empty Session_History, replace the unreadable text with the new Session_History at the next write, compute the totals from the new Session_History, and display the notice `HISTORY RESET - STORED DATA UNREADABLE` on the next Receipt_Screen shown.
7. IF local storage is unavailable or a read or write to local storage fails, THEN THE BLUELINE SHALL complete the Core flow without stopping, keep any Session_History already stored unchanged, show the Receipt_Screen with Today and This_Week totals computed from the current Session only, and display the notice `HISTORY NOT SAVED - STORAGE UNAVAILABLE` on that Receipt_Screen.
8. WHEN a Session starts as defined in Requirement 5 criterion 4 or criterion 6, THE BLUELINE SHALL write the Active_Session_State (start timestamp, Planned_Duration, Destination_Label) to local storage before the Session_Screen is displayed. A failed write is handled as defined in criterion 7.
9. WHEN a Session ends by Time_Up or Hang_Up, THE BLUELINE SHALL write the Session_Record appended under Requirement 9 criterion 1 to the Session_History in local storage and remove the Active_Session_State from local storage, both before the NO_CARRIER_Screen is displayed.
10. WHEN appending a Session_Record would make the Session_History longer than 1,000 Session_Records, THE BLUELINE SHALL remove the oldest Session_Records so that the Session_History keeps the newest 1,000 Session_Records, including the one just appended.

### Requirement 11: Session Recovery After Reload

**User Story:** As a feed-app user, I want my session to survive a reload of the BLUELINE tab, so that the meter and receipt stay honest.

#### Acceptance Criteria

1. WHEN the BLUELINE tab loads with a valid Active_Session_State whose scheduled end time (the stored start timestamp plus the stored Planned_Duration) is later than the current time, THE BLUELINE SHALL display the Session_Screen within 1 second of load, showing the stored Destination_Label and showing Elapsed_Time, Remaining_Time, and the Fee_Meter computed from the stored start timestamp and the current time.
2. WHEN BLUELINE recovers a Session onto the Session_Screen, THE BLUELINE SHALL keep the stored start timestamp and Planned_Duration unchanged, SHALL NOT open a new Destination tab, and SHALL end the recovered Session at Time_Up or Hang_Up as specified in Requirements 7 and 8.
3. WHEN the BLUELINE tab loads with a valid Active_Session_State whose scheduled end time is earlier than or equal to the current time, THE BLUELINE SHALL end the Session with the end reason TIME UP, an end timestamp equal to the scheduled end time, an actual duration equal to the Planned_Duration, and a fee computed by the Fee_Calculator from the Planned_Duration, and SHALL display the NO_CARRIER_Screen followed by the Receipt_Screen as specified in Requirement 7.
4. WHEN BLUELINE ends a Session that was recovered after a reload, THE BLUELINE SHALL append exactly one Session_Record to the Session_History and clear the Active_Session_State before displaying the NO_CARRIER_Screen, so that any later reload displays the Dial_Screen and appends no second Session_Record for that Session.
5. IF the stored Active_Session_State fails to parse, has a missing field, or contains a start timestamp later than the current time, a Planned_Duration other than 1, 5, 10, 15, or 30 minutes, or a Destination_Label other than YOUTUBE, INSTAGRAM, or CUSTOM, THEN THE BLUELINE SHALL clear the Active_Session_State, leave the Session_History unchanged with no Session_Record appended, and display the Dial_Screen.

### Requirement 12: Keyboard-First Commands with Mouse and Touch Support

**User Story:** As a user on a laptop or a phone, I want every action reachable by number keys, typed commands, or taps, so that I can use BLUELINE on any device.

#### Acceptance Criteria

1. THE BLUELINE SHALL display the Command_Prompt on the Dial_Screen, the Destination_Menu, the Duration_Menu, the Connect_Confirm_Screen, the Session_Screen, the NO_CARRIER_Screen, and the Receipt_Screen, and THE Command_Prompt SHALL accept at most 32 characters of input.
2. WHEN the user presses the Enter key in the Command_Prompt, THE Command_Parser SHALL remove leading and trailing whitespace, compare the remaining text to each Command without regard to letter case, and return the Command whose text matches exactly (for example, ` BYE ` returns `bye` and `Help` returns `help`). For the `go` Command, THE Command_Parser SHALL match the word `go`, one or more spaces, and an alias (for example, ` GO YT ` returns `go yt`). THE Command_Parser SHALL return no Command for empty or whitespace-only text, in which case THE BLUELINE SHALL take no action and keep the current screen.
3. IF the submitted text is non-empty after trimming and matches no Command, THEN THE BLUELINE SHALL display the message `UNKNOWN COMMAND - TYPE HELP`, keep the current screen, and leave any running Session's start timestamp and Planned_Duration unchanged.
4. WHEN the user submits the Command `help`, THE BLUELINE SHALL display a list of every Command the current screen accepts, one Command per line, with menu numbers matching the menu items shown on that screen, and SHALL keep the current screen and any running Session unchanged.
5. WHEN the user submits a menu number Command in the Command_Prompt while the Destination_Menu, the Duration_Menu, or the Receipt_Screen is displayed, THE BLUELINE SHALL perform the same action as pressing the matching digit key, including displaying `INVALID SELECTION` for a number that matches no menu item.
6. WHEN the user presses the digit key 0 or submits the Command `back` while the Duration_Menu is displayed, THE BLUELINE SHALL display the Destination_Menu with no Destination selected.
7. WHEN the user clicks or taps a menu item or the HANG UP button, THE BLUELINE SHALL perform the same action as pressing the matching digit key or the Escape key, with a single click or a single tap and no double-tap or long-press required.
8. THE BLUELINE SHALL render the Dial_Screen, the Destination_Menu, the Duration_Menu, the Connect_Confirm_Screen, the Session_Screen, the NO_CARRIER_Screen, and the Receipt_Screen with no horizontal scrolling on viewports from 360 CSS pixels to 1920 CSS pixels wide, and with every menu item, the CONNECT button, and the HANG UP button at least 44 CSS pixels wide and 44 CSS pixels tall.
9. THE BLUELINE SHALL display all text that BLUELINE generates (menu labels, status messages, error messages, `help` output, and receipt labels) in ALL-CAPS English, and SHALL display user-entered text and Custom Destination URLs exactly as entered.
10. WHEN the user submits the Command `back` while the URL entry field is displayed, THE BLUELINE SHALL discard the entered URL text, hide the URL entry field, and display the Destination_Menu with no Destination selected. The digit key 0 in the URL entry field is text input as defined in Requirement 3 criterion 9 and does not return to the Destination_Menu.
11. IF the submitted text matches a Command that the current screen does not accept (for example, `bye` while no Session is active, `back` on the Destination_Menu, or a menu number on the Session_Screen), THEN THE BLUELINE SHALL display a message indicating that the Command is not available on the current screen, keep the current screen, and leave any running Session unchanged.
12. WHEN the user submits text in the Command_Prompt, THE BLUELINE SHALL clear the Command_Prompt text and keep keyboard focus in the Command_Prompt.
13. WHEN the user submits the Command `go yt` or `go ig` while the Destination_Menu is displayed, THE BLUELINE SHALL perform the same action as pressing the digit key 1 (YOUTUBE) or the digit key 2 (INSTAGRAM) respectively, as defined in Requirement 2 criterion 3.
14. IF the user submits the word `go` with no alias, or with an alias other than `yt` or `ig`, while the Destination_Menu is displayed, THEN THE BLUELINE SHALL display the message `UNKNOWN DESTINATION - TYPE HELP`, keep the Destination_Menu on screen, and select no Destination.
15. THE Command_Parser SHALL return the following results for these inputs: `1` returns the menu number Command 1; `2` returns the menu number Command 2; `go yt` returns the `go` Command with the Destination_Alias `yt`; `bye` returns the Command `bye`; empty text returns no Command; and non-empty text that matches no Command (for example `xyz`) returns no Command and leads to the message `UNKNOWN COMMAND - TYPE HELP` defined in criterion 3.
16. WHILE the Connect_Confirm_Screen is displayed, THE BLUELINE SHALL accept the Commands `back`, `0`, and `help`, SHALL treat Enter with an empty Command_Prompt as the confirmation defined in Requirement 5 criterion 1, SHALL treat the Escape key as `back` as defined in Requirement 4 criterion 8, and SHALL handle any other Command as defined in criterion 11.

### Requirement 13: Demo Completion Time

**User Story:** As a hackathon judge on a laptop, I want to complete the whole flow quickly, so that I can evaluate BLUELINE in a short demo slot.

#### Acceptance Criteria

1. WHEN a user on the Dial_Screen presses Enter to dial, presses a digit key to select a preset Destination (YOUTUBE or INSTAGRAM), presses a digit key to select the 1 MIN (DEMO) Planned_Duration, presses Enter on the Connect_Confirm_Screen, returns to the BLUELINE tab with a keyboard shortcut before Time_Up, and makes no Hang_Up, with each input entered within 5 seconds of the screen that accepts it appearing, THE BLUELINE SHALL display the Receipt_Screen less than 120 seconds after the user first presses Enter on the Dial_Screen.
2. THE BLUELINE SHALL complete the Core flow from the Dial_Screen to the Receipt_Screen, with no JavaScript errors reported in the browser console, in the latest stable major version and the previous stable major version of Chrome, Safari, Firefox, and Edge on desktop and on mobile at the time of testing.
3. THE BLUELINE SHALL limit the total time spent in BLUELINE-controlled waits in the 1 MIN (DEMO) flow to no more than 75 seconds, made up of a Dial_Sequence of no more than 8 seconds, no more than 2 seconds from the end of the handshake sound to the Destination_Menu, a Session of 60 seconds, no more than 1 second from Time_Up to the NO_CARRIER_Screen, and no more than 3 seconds from the NO_CARRIER_Screen to the Receipt_Screen.
4. THE BLUELINE SHALL let the user perform every step of the Core flow from the Dial_Screen to the Receipt_Screen with keyboard input only, including activating the link shown with the `POPUP BLOCKED` message, with no pointer or touch input required.
5. THE BLUELINE SHALL run the production build output produced by `npm run build` as static files served from a static file host (for example GitHub Pages or AWS Amplify Hosting), with no server-side code at runtime.

### Requirement 14: Session State Machine

**User Story:** As a developer, I want the Core flow to follow one explicit state machine, so that a finished Session can never resume and every screen change is predictable.

#### Acceptance Criteria

1. THE Session_State_Machine SHALL hold exactly one Session_State at any time, chosen from IDLE, DIALING, SELECT_DEST, SELECT_DURATION, CONNECTED, and ENDED.
2. THE Session_State_Machine SHALL apply only these transitions: IDLE → DIALING when the Dial_Sequence starts; DIALING → SELECT_DEST when the Destination_Menu is displayed; SELECT_DEST → SELECT_DURATION when a Destination is selected; SELECT_DURATION → SELECT_DEST when the user returns to the Destination_Menu; SELECT_DURATION → CONNECTED when a Session starts as defined in Requirement 5 criterion 4 or criterion 6; CONNECTED → ENDED at Time_Up or Hang_Up; and ENDED → IDLE when the Dial_Screen is displayed from the Receipt_Screen.
3. WHEN the BLUELINE tab loads, THE Session_State_Machine SHALL start in CONNECTED for a Session recovered under Requirement 11 criterion 1, in ENDED for a Session ended under Requirement 11 criterion 3, and in IDLE in every other case.
4. IF an input or event has no transition listed in criterion 2 for the current Session_State, THEN THE Session_State_Machine SHALL keep the current Session_State unchanged.
5. FOR ALL sequences of inputs and events applied after a Session reaches ENDED, THE Session_State_Machine SHALL produce no transition that returns that Session to CONNECTED, and any later CONNECTED state SHALL belong to a new Session with its own start timestamp (ended-is-final property).

### Requirement 15: Accessible Presentation and Bundled Font

**User Story:** As a user who relies on assistive technology or is sensitive to motion, I want readable real text and calm visuals, so that the retro style does not get in my way.

#### Acceptance Criteria

1. THE BLUELINE SHALL render all screen text, including menus, ASCII boxes, messages, Elapsed_Time, Remaining_Time, the Fee_Meter, and receipts, as DOM text, with no text drawn on a canvas element or embedded in an image.
2. WHERE the browser reports the user preference `prefers-reduced-motion: reduce`, THE BLUELINE SHALL display every screen with the CRT flicker and scanline effects disabled.
3. THE BLUELINE SHALL display all screen text, including the Korean greeting in Hangul, in the Bundled_Font, served from the same origin as BLUELINE.
4. THE BLUELINE source repository SHALL include the Bundled_Font license file in the same folder as the Bundled_Font files.
