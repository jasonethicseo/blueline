# Requirements Document

## Introduction

This feature turns BLUELINE from an app that only opens a link into an app that asks the user to state a purpose before every Session and to look back on it afterwards. It adds five things to the Core flow:

- a required one-line Purpose, entered after the Destination is chosen and before the Planned_Duration is chosen;
- an optional Message to the user's future self, shown when the Session ends;
- a `PURPOSE ACHIEVED? Y/N` check between the NO_CARRIER_Screen and the Receipt_Screen;
- a Board that lists past Sessions like a BBS post list, each with a fixed post number;
- Purpose and Outcome on the Receipt_Screen, and Outcome counts in the Today and This_Week totals.

Purposes and Messages stay in the browser's local storage, like the rest of the Session_History. BLUELINE still stores no Destination URL. BLUELINE still does not block, filter, inspect, or control the Destination.

### Relation to the core flow spec

This spec builds on `.kiro/specs/blueline-core-flow/requirements.md` (the core spec). Every core spec requirement still applies unless this document changes it. That file is not edited. Where the two documents disagree, this document wins. The core spec criteria changed by this document are:

| Core spec criterion | Change | Defined in |
|---|---|---|
| 2.1, 2.5 | The Destination_Menu has a fourth choice, `4. BOARD`. Digit 4 is no longer `INVALID SELECTION`. | Requirement 7 |
| 2.3, 3.7 | Selecting a Destination displays the Purpose_Screen instead of the Duration_Menu. | Requirement 1 |
| 6.1 | The Session_Screen also shows the Session's Purpose. | Requirement 1 |
| 7.7, 8.5 | The NO_CARRIER_Screen leads to the Purpose_Check_Screen, and then to the Receipt_Screen. | Requirements 4, 5 |
| 9.2 | The Receipt_Screen also shows the Purpose, the Outcome, and Outcome counts. | Requirement 6 |
| 10.1, 10.3, 10.4, 10.5, 10.8 | The stored formats gain Purpose, Outcome, Post_Number, and Message fields, and old-format data is still read. | Requirements 8, 13 |
| 10.10 | Removing the oldest records keeps the Post_Numbers of the records that remain. | Requirement 13 |
| 11.1, 11.3 | A recovered Session keeps its Purpose and Message. | Requirement 9 |
| 12.1, 12.4, 12.6, 12.8 | New screens, new commands, and a new `back` target for the Duration_Menu. | Requirements 3, 10, 11 |
| 13.1, 13.3 | The demo flow includes the new screens, and the bound changes from 120 to 150 seconds. | Requirement 12 |
| 14.1, 14.2 | A new Session_State SET_PURPOSE and new transitions. | Requirement 10 |

The core decision to request notification permission and to open the Destination in two separate user actions is unchanged. Notification permission is still requested when the Planned_Duration is selected, and the Destination still opens from the Connect_Confirm_Screen. The new input screens all come before the Duration_Menu.

## Glossary

Terms defined in the core spec keep their meaning unless changed here.

- **Character**: One Unicode code point. One Hangul syllable, one Latin letter, and one space each count as one Character.
- **Purpose**: The one-line text the user enters on the Purpose_Screen, after leading and trailing whitespace is removed. A Purpose is 1 to 60 Characters long.
- **Purpose_Screen**: The screen shown after a Destination is selected. The Purpose_Screen shows the heading `STATE YOUR PURPOSE`, a single-line text field labeled `PURPOSE:` (the Purpose_Field), and a BACK button.
- **Purpose_Validator**: The component that trims the submitted Purpose_Field text and accepts it as a Purpose or rejects it.
- **Message**: The optional one-line text the user enters on the Message_Screen, after leading and trailing whitespace is removed. A Message is 1 to 120 Characters long.
- **Message_Screen**: The screen shown after a Purpose is accepted. The Message_Screen shows the heading `MESSAGE TO FUTURE YOU`, a single-line text field labeled `MESSAGE:` (the Message_Field), the hint `LEAVE EMPTY AND PRESS ENTER TO SKIP`, and a BACK button.
- **Text_Field**: The Purpose_Field or the Message_Field.
- **Message_Delivery**: The display of a Session's Message on the NO_CARRIER_Screen under the heading `MESSAGE FROM THE PAST`.
- **Purpose_Check_Screen**: The screen shown after the NO_CARRIER_Screen and before the Receipt_Screen. The Purpose_Check_Screen shows the Session's Purpose, the question `PURPOSE ACHIEVED? Y/N`, a YES button, and a NO button.
- **Outcome**: The user's answer about a Session's Purpose: DONE (the user answered yes), DRIFTED (the user answered no), or NO ANSWER. The Outcome_Labels are the words `DONE`, `DRIFTED`, and `NO ANSWER`. The Outcome_Short_Forms are `Y`, `N`, and `?`, used only where a narrow viewport leaves no room for the Outcome_Labels.
- **Outcome_Count_Line**: The text that shows the number of Session_Records with each Outcome in one period, in the form `DONE <n> · DRIFTED <n> · NO ANSWER <n>` (for example `DONE 1 · DRIFTED 0 · NO ANSWER 2`).
- **Narrow viewport**: A viewport less than 600 CSS pixels wide.
- **Board_Screen**: The screen that lists Session_Records as BBS posts, newest first, one Board_Page at a time.
- **Board_Page**: A group of up to 20 consecutive posts on the Board_Screen.
- **Post_Number**: A positive whole-number serial number stored in each Session_Record. A Post_Number is set once, when the Session_Record is appended (or when a Legacy_Record is first read), and never changes. See Requirement 13.
- **Session_Record** (extended): The core Session_Record plus the Post_Number, the Purpose (or no Purpose, for a Legacy_Record), and the Outcome. A Session_Record contains no URL and no Message.
- **Active_Session_State** (extended): The core Active_Session_State plus the Purpose and the Message, if any. It still contains no URL.
- **Legacy_Record**: A Session_Record stored in the history format written before this feature (format version 1). A Legacy_Record has no Purpose and no Outcome field.
- **Legacy_Active_State**: An Active_Session_State stored in format version 1, with no Purpose and no Message.
- **No_Purpose_Label**: The text `(NO PURPOSE)`, shown wherever a Purpose would be shown for a Session_Record that has no Purpose.
- **Session_State** (extended): One of the seven states IDLE, DIALING, SELECT_DEST, SET_PURPOSE, SELECT_DURATION, CONNECTED, and ENDED. SELECT_DEST covers the Destination_Menu, the URL entry field, and the Board_Screen. SET_PURPOSE covers the Purpose_Screen and the Message_Screen. ENDED covers the NO_CARRIER_Screen, the Purpose_Check_Screen, and the Receipt_Screen.

## Requirements

### Requirement 1: State a Purpose

**User Story:** As a feed-app user, I want to write down why I am connecting before I pick a duration, so that each session starts with intent.

#### Acceptance Criteria

1. WHEN the user selects a Destination on the Destination_Menu (by digit key, menu tap, `go` Command, or an accepted Custom URL), THE BLUELINE SHALL display the Purpose_Screen within 500 milliseconds with an empty Purpose_Field that has keyboard focus, and SHALL NOT display the Duration_Menu.
2. WHEN the user presses Enter in the Purpose_Field, THE Purpose_Validator SHALL remove leading and trailing whitespace from the field text and count the remaining Characters.
3. WHEN the trimmed text is 1 to 60 Characters long, THE Purpose_Validator SHALL accept the trimmed text as the Purpose, and THE BLUELINE SHALL display the Message_Screen within 500 milliseconds.
4. IF the trimmed text is empty, THEN THE BLUELINE SHALL display the message `PURPOSE REQUIRED`, keep the Purpose_Screen on screen with focus in the Purpose_Field, and SHALL NOT display the Message_Screen.
5. IF the trimmed text is longer than 60 Characters, THEN THE BLUELINE SHALL display the message `PURPOSE TOO LONG - MAX 60 CHARS`, keep the Purpose_Screen on screen with the entered text and focus kept, and SHALL NOT display the Message_Screen.
6. FOR ALL strings, THE Purpose_Validator SHALL accept the string if and only if the string, with leading and trailing whitespace removed, is 1 to 60 Characters long, and the accepted Purpose SHALL equal that trimmed string (validation property).
7. WHEN the user types in the Purpose_Field again after a `PURPOSE REQUIRED` or `PURPOSE TOO LONG - MAX 60 CHARS` message appears, THE BLUELINE SHALL remove the message.
8. THE BLUELINE SHALL keep the Purpose for the Session that the user starts next, and SHALL clear it when the Destination_Menu is displayed again before that Session starts.
9. WHILE a Session is active, THE Session_Screen SHALL display `PURPOSE:` followed by the Session's Purpose, or the No_Purpose_Label for a Session that has no Purpose. The tab title and browser notifications SHALL NOT include the Purpose, as defined in Requirement 11 criterion 6.

### Requirement 2: Message to Future You

**User Story:** As a feed-app user, I want to leave a note for the moment I get disconnected, so that my past self can remind me why I came.

#### Acceptance Criteria

1. WHEN the Message_Screen is displayed, THE Message_Screen SHALL show the heading `MESSAGE TO FUTURE YOU`, the Message_Field with keyboard focus, the hint `LEAVE EMPTY AND PRESS ENTER TO SKIP`, and the BACK button.
2. WHEN the user presses Enter in the Message_Field, THE BLUELINE SHALL remove leading and trailing whitespace from the field text.
3. WHEN the trimmed text is empty, THE BLUELINE SHALL record that the Session has no Message and display the Duration_Menu within 500 milliseconds.
4. WHEN the trimmed text is 1 to 120 Characters long, THE BLUELINE SHALL keep the trimmed text as the Message for the Session that the user starts next, and display the Duration_Menu within 500 milliseconds.
5. IF the trimmed text is longer than 120 Characters, THEN THE BLUELINE SHALL display the message `MESSAGE TOO LONG - MAX 120 CHARS`, keep the Message_Screen on screen with the entered text and focus kept, and SHALL NOT display the Duration_Menu.
6. THE BLUELINE SHALL show the Message only on the NO_CARRIER_Screen as defined in Requirement 4, and SHALL NOT show it on the Session_Screen, the Board_Screen, the Receipt_Screen, a browser notification, or the tab title.

### Requirement 3: Text Entry and Back Navigation on the New Screens

**User Story:** As a keyboard user or a phone user, I want to type freely in the new fields and step back without losing my place, so that the extra screens do not get in my way.

#### Acceptance Criteria

1. WHILE a Text_Field has focus, THE BLUELINE SHALL insert every printable key, including the digit keys 0 to 9 and the letter keys Y, N, and P, into that Text_Field as text, and SHALL perform no menu selection, page change, or screen change for those keys.
2. WHILE a Text_Field has focus, THE BLUELINE SHALL treat the submitted text as Purpose or Message text only. The texts `back`, `bye`, `help`, and menu numbers SHALL be accepted as ordinary text and SHALL NOT run a Command.
3. WHEN the user presses the Escape key or taps the BACK button on the Purpose_Screen, THE BLUELINE SHALL display the Destination_Menu with no Destination selected and no Purpose kept.
4. WHEN the user presses the Escape key or taps the BACK button on the Message_Screen, THE BLUELINE SHALL display the Purpose_Screen with the Purpose_Field showing the Purpose accepted earlier and with focus in the Purpose_Field.
5. WHEN the user presses the digit key 0 or submits the Command `back` while the Duration_Menu is displayed, THE BLUELINE SHALL display the Message_Screen with the Message_Field showing the Message entered earlier (or empty if the user skipped it) and with focus in the Message_Field. This replaces the core spec rule that `0` and `back` on the Duration_Menu return to the Destination_Menu.
6. WHILE the browser reports that text composition is in progress in a Text_Field (for example, a Hangul input method editor), THE BLUELINE SHALL leave Enter and Escape to the input method editor and SHALL NOT submit or go back on that key press.
7. WHEN the user submits a Text_Field with Enter, THE BLUELINE SHALL submit the field text exactly once per Enter press, including the last composed Hangul syllable, with no Character lost or repeated.
8. THE BACK buttons on the Purpose_Screen and the Message_Screen SHALL be at least 44 CSS pixels wide and 44 CSS pixels tall and SHALL work with a single tap.

### Requirement 4: Message Delivery at Disconnect

**User Story:** As a feed-app user, I want to read the note from my past self when the line drops, so that the end of the session carries my own reminder.

#### Acceptance Criteria

1. WHEN a Session that has a Message ends by Time_Up or by Hang_Up, THE NO_CARRIER_Screen SHALL display the heading `MESSAGE FROM THE PAST` followed by the Message exactly as entered after trimming.
2. WHEN a Session that has a Message ends while the BLUELINE tab is hidden, or ends because the BLUELINE tab loads after the scheduled end time (core Requirement 11 criterion 3), THE BLUELINE SHALL display the Message on the NO_CARRIER_Screen that the user sees when the BLUELINE tab is visible.
3. WHEN a Session that has no Message ends, THE NO_CARRIER_Screen SHALL display no `MESSAGE FROM THE PAST` heading.
4. WHEN a Session ends, THE BLUELINE SHALL remove the Message from local storage together with the Active_Session_State, before the NO_CARRIER_Screen is displayed, so that the Message is not stored anywhere after the Session ends.
5. THE BLUELINE SHALL perform at most one Message_Delivery per Session. FOR ALL sequences of user inputs, Time_Up and Hang_Up events, tab visibility changes, and reloads of the BLUELINE tab, THE BLUELINE SHALL display a given Session's Message on at most one NO_CARRIER_Screen (at-most-once property).
6. WHILE the NO_CARRIER_Screen shows a Message, THE BLUELINE SHALL keep the NO_CARRIER_Screen on screen until the user presses Enter or taps the NO_CARRIER_Screen, instead of moving on after 3 seconds. WHILE the NO_CARRIER_Screen shows no Message, the core spec 3-second rule applies.

### Requirement 5: Purpose Check

**User Story:** As a feed-app user, I want to say whether I did what I came for, so that I can look back honestly on each session.

#### Acceptance Criteria

1. WHEN the user leaves the NO_CARRIER_Screen as defined in core Requirement 7 criterion 7 and Requirement 4 criterion 6, THE BLUELINE SHALL display the Purpose_Check_Screen instead of the Receipt_Screen.
2. THE Purpose_Check_Screen SHALL display the Session's Purpose, the question `PURPOSE ACHIEVED? Y/N`, a YES button, and a NO button, and SHALL NOT move on by itself after any amount of time.
3. WHEN the user presses the Y key (in either letter case) while the Command_Prompt is empty or does not have focus, submits `y` or `yes` in the Command_Prompt (ignoring letter case), or taps the YES button, THE BLUELINE SHALL set the Session's Outcome to DONE, write the updated Session_Record to the Session_History in local storage, and display the Receipt_Screen within 1 second.
4. WHEN the user presses the N key (in either letter case) while the Command_Prompt is empty or does not have focus, submits `n` or `no` in the Command_Prompt (ignoring letter case), or taps the NO button, THE BLUELINE SHALL set the Session's Outcome to DRIFTED, write the updated Session_Record to the Session_History in local storage, and display the Receipt_Screen within 1 second.
5. WHEN a Session ends, THE BLUELINE SHALL append its Session_Record with the Outcome NO ANSWER, as part of core Requirement 9 criterion 1, so that a reload, a closed tab, or a browser exit before the user answers leaves that Session_Record with the Outcome NO ANSWER.
6. IF the user presses Enter with an empty Command_Prompt, presses a digit key while the Command_Prompt is empty or does not have focus, or submits any text other than `y`, `yes`, `n`, `no`, or `help` (ignoring letter case), while the Purpose_Check_Screen is displayed, THEN THE BLUELINE SHALL display the message `PRESS Y OR N`, keep the Purpose_Check_Screen on screen, and leave the Outcome unchanged.
7. WHEN the user has answered once, THE BLUELINE SHALL ignore further Y or N input for that Session and keep the first answer.
8. IF the write of the updated Session_Record fails, THEN THE BLUELINE SHALL still display the Receipt_Screen with the answered Outcome for the current Session, and display the notice `HISTORY NOT SAVED - STORAGE UNAVAILABLE` as defined in core Requirement 10 criterion 7.
9. WHEN a Session that has no Purpose ends (a Session recovered from a Legacy_Active_State), THE BLUELINE SHALL skip the Purpose_Check_Screen, keep the Outcome NO ANSWER, and display the Receipt_Screen.
10. THE YES and NO buttons SHALL be at least 44 CSS pixels wide and 44 CSS pixels tall and SHALL work with a single tap.
11. WHEN the user presses the Escape key on the Purpose_Check_Screen, THE BLUELINE SHALL keep the Purpose_Check_Screen on screen and leave the Outcome unchanged.

### Requirement 6: Receipt with Purpose and Outcome Counts

**User Story:** As a feed-app user, I want the receipt to show what I came for and how my sessions went, so that I see not only cost but also results.

#### Acceptance Criteria

1. THE Receipt_Screen SHALL display, in addition to the values in core Requirement 9 criterion 2, the Session's Purpose (or the No_Purpose_Label) and the Session's Outcome as its Outcome_Label (`DONE`, `DRIFTED`, or `NO ANSWER`).
2. THE Receipt_Screen SHALL display, directly below today's total fee, the Outcome_Count_Line for Today, and directly below this week's total fee, the Outcome_Count_Line for This_Week. On every viewport the Receipt_Screen SHALL use the Outcome_Labels, not the Outcome_Short_Forms, and MAY wrap an Outcome_Count_Line onto a second line only at a ` · ` separator, so that a label and its number stay on the same line.
3. THE BLUELINE SHALL assign Session_Records to Today and This_Week for the Outcome counts by the same end-timestamp rule that core Requirement 9 criteria 3 and 4 use for fee totals, and SHALL count the Session that just ended with its answered Outcome.
4. FOR ALL Session_Histories of 0 to 1,000 Session_Records and every moment of display, THE BLUELINE SHALL compute Outcome counts such that the DONE count plus the DRIFTED count plus the NO ANSWER count equals the number of Session_Records in that period, for Today, for This_Week, and for the whole Session_History (sum property).
5. FOR ALL Session_Histories, THE BLUELINE SHALL compute each Outcome count for This_Week greater than or equal to the same Outcome count for Today (metamorphic property).
6. THE BLUELINE SHALL count every Legacy_Record as NO ANSWER.
7. IF local storage is unavailable, THEN THE BLUELINE SHALL compute the Outcome counts from the current Session only, as core Requirement 10 criterion 7 does for the fee totals.

### Requirement 7: Board

**User Story:** As a feed-app user, I want to browse my past sessions like posts on a BBS board, so that I can look back on what I connected for and whether it worked.

#### Acceptance Criteria

1. THE Destination_Menu SHALL show four numbered choices in this top-to-bottom order: `1. YOUTUBE`, `2. INSTAGRAM`, `3. CUSTOM URL`, and `4. BOARD`. The digit key 0 and the digit keys 5 to 9 SHALL display `INVALID SELECTION` as in core Requirement 2 criterion 5.
2. WHEN the user presses the digit key 4, submits the Command `4`, or taps the `4. BOARD` choice on the Destination_Menu, THE BLUELINE SHALL display the Board_Screen within 500 milliseconds, showing the first Board_Page, and select no Destination.
3. THE Board_Screen SHALL show one row per Session_Record with the Post_Number, the local date of the end timestamp as `YYYY-MM-DD`, the Purpose (or the No_Purpose_Label), the actual duration in MM:SS, and the Outcome. THE Board_Screen SHALL show the Outcome as its Outcome_Label (`DONE`, `DRIFTED`, or `NO ANSWER`) on viewports 600 CSS pixels wide or wider, and as its Outcome_Short_Form (`Y`, `N`, or `?`) only on a Narrow viewport. The Post_Number shown SHALL be the Post_Number stored in that Session_Record under Requirement 13.
4. THE Board_Screen SHALL order rows newest first (highest Post_Number first) and show at most 20 rows per Board_Page. The first Board_Page SHALL hold the 20 newest Session_Records. The Board_Screen SHALL show the current page number and the total number of Board_Pages (for example `PAGE 1/3`).
5. WHEN the user presses the N key while the Command_Prompt is empty or does not have focus, submits `n` in the Command_Prompt, or taps the NEXT button, THE Board_Screen SHALL show the next older Board_Page. IF the last Board_Page is shown, THEN THE Board_Screen SHALL keep it and display the message `NO MORE PAGES`.
6. WHEN the user presses the P key while the Command_Prompt is empty or does not have focus, submits `p` in the Command_Prompt, or taps the PREV button, THE Board_Screen SHALL show the next newer Board_Page. IF the first Board_Page is shown, THEN THE Board_Screen SHALL keep it and display the message `NO MORE PAGES`.
7. WHEN the user presses the digit key 0, presses the Escape key, submits the Command `back`, or taps the BACK button on the Board_Screen, THE BLUELINE SHALL display the Destination_Menu with no Destination selected.
8. IF the Session_History has no Session_Records, THEN THE Board_Screen SHALL show `NO POSTS` and the page indicator `PAGE 1/1`.
9. IF local storage is unavailable or the stored Session_History is unreadable as defined in core Requirement 10 criterion 4, THEN THE Board_Screen SHALL show `NO POSTS` with the notice `HISTORY NOT SAVED - STORAGE UNAVAILABLE` or `HISTORY RESET - STORED DATA UNREADABLE` respectively, and SHALL NOT write to local storage.
10. THE Board_Screen SHALL show every Purpose in full, wrapping it onto further lines when needed, with no horizontal scrolling on viewports from 360 to 1920 CSS pixels wide.
11. THE Board_Screen SHALL only read the Session_History. Opening, paging, and leaving the Board_Screen SHALL NOT change any Session_Record, the Active_Session_State, or the notification permission state, and SHALL NOT open any tab.
12. THE NEXT, PREV, and BACK buttons SHALL be at least 44 CSS pixels wide and 44 CSS pixels tall and SHALL work with a single tap.
13. IF the user presses a digit key from 1 to 9 while the Command_Prompt is empty or does not have focus, or submits a menu number Command from 1 to 9, while the Board_Screen is displayed, THEN THE BLUELINE SHALL display the message `INVALID SELECTION` and keep the Board_Screen on screen.

### Requirement 8: Stored Format and Legacy Records

**User Story:** As an existing user, I want my earlier sessions to keep counting the same after the update, so that my history stays honest.

#### Acceptance Criteria

1. THE BLUELINE SHALL store Purposes and Outcomes in the Session_History and Purposes and Messages in the Active_Session_State, only in the browser's local storage of the BLUELINE origin, and SHALL NOT store any Destination URL, as in core Requirement 10 criterion 1.
2. THE History_Serializer SHALL write the Session_History in a new format version that includes, for each Session_Record, the core fields plus the Post_Number, the Purpose (or a marker for no Purpose), and the Outcome, and SHALL write no Message and no URL.
3. WHEN the History_Serializer parses stored text in format version 1, THE History_Serializer SHALL read each Legacy_Record with every core field value unchanged, with no Purpose, and with the Outcome NO ANSWER.
4. FOR ALL valid format version 1 Session_Histories of 0 to 1,000 Session_Records, the start timestamp, end timestamp, Planned_Duration, actual duration, fee, end reason, and Destination_Label of every parsed record SHALL equal the stored values, and today's total fee, this week's total fee, and the sum of actual durations computed from the parsed Session_History SHALL equal the values computed from the stored values (legacy-preservation property).
5. FOR ALL valid Session_Histories of 0 to 1,000 Session_Records in the new format, including records with no Purpose, serializing then parsing SHALL produce a Session_History equal to the original in every field, including the Post_Number (round-trip property).
6. THE History_Serializer SHALL treat new-format text as unreadable, under core Requirement 10 criterion 4 and criterion 6, if any Session_Record has a Purpose that is not a string of 1 to 60 Characters with no leading or trailing whitespace, or an Outcome other than DONE, DRIFTED, or NO ANSWER.
7. WHEN BLUELINE next writes a Session_History that it read in format version 1, THE BLUELINE SHALL write it in the new format version, with the Legacy_Records still having no Purpose and the Outcome NO ANSWER. Legacy_Records SHALL keep the Post_Numbers assigned under Requirement 13 criterion 3.
8. THE BLUELINE SHALL keep the 1,000-record limit of core Requirement 10 criterion 10. Updating a Session_Record's Outcome SHALL NOT change the number or order of Session_Records.
9. WHEN BLUELINE writes an Outcome answer, THE BLUELINE SHALL change only the Outcome of the Session_Record of the Session that just ended, and SHALL leave every other Session_Record unchanged.

### Requirement 9: Recovery After Reload

**User Story:** As a feed-app user, I want my purpose and note to survive a reload, so that a reload does not erase what I wrote.

#### Acceptance Criteria

1. WHEN a Session starts, THE BLUELINE SHALL write the Purpose and the Message, if any, to the Active_Session_State together with the core fields, before the Session_Screen is displayed.
2. WHEN BLUELINE recovers a Session under core Requirement 11 criterion 1, THE BLUELINE SHALL keep the stored Purpose and Message for that Session.
3. WHEN BLUELINE ends a Session under core Requirement 11 criterion 3 (expired while the tab was closed or reloading), THE BLUELINE SHALL show the stored Message as defined in Requirement 4, then the Purpose_Check_Screen as defined in Requirement 5, then the Receipt_Screen.
4. WHEN the BLUELINE tab loads with a valid Legacy_Active_State, THE BLUELINE SHALL recover it as in core Requirement 11 with no Purpose and no Message.
5. IF the stored Active_Session_State has a Purpose that is not a string of 1 to 60 Characters with no leading or trailing whitespace, or a Message that is not a string of 1 to 120 Characters with no leading or trailing whitespace, THEN THE BLUELINE SHALL treat it as invalid under core Requirement 11 criterion 5.
6. WHEN the BLUELINE tab loads while no Active_Session_State is stored, including after a reload on the NO_CARRIER_Screen, the Purpose_Check_Screen, or the Receipt_Screen, THE BLUELINE SHALL display the Dial_Screen and show no Message.

### Requirement 10: Flow Order and State Machine

**User Story:** As a developer, I want the new screens to fit the existing state machine, so that the permission and connect rules keep working.

#### Acceptance Criteria

1. THE Session_State_Machine SHALL hold exactly one Session_State at any time, chosen from IDLE, DIALING, SELECT_DEST, SET_PURPOSE, SELECT_DURATION, CONNECTED, and ENDED.
2. THE Session_State_Machine SHALL apply only these transitions: IDLE → DIALING when the Dial_Sequence starts; DIALING → SELECT_DEST when the Destination_Menu is displayed; SELECT_DEST → SET_PURPOSE when a Destination is selected; SET_PURPOSE → SELECT_DEST when the user goes back from the Purpose_Screen; SET_PURPOSE → SELECT_DURATION when the Message_Screen is submitted; SELECT_DURATION → SET_PURPOSE when the user goes back from the Duration_Menu; SELECT_DURATION → CONNECTED when a Session starts; CONNECTED → ENDED at Time_Up or Hang_Up; and ENDED → IDLE when the Dial_Screen is displayed from the Receipt_Screen. Moving between the Destination_Menu, the URL entry field, and the Board_Screen stays in SELECT_DEST.
3. WHILE in ENDED, THE BLUELINE SHALL move only forward from the NO_CARRIER_Screen to the Purpose_Check_Screen to the Receipt_Screen, and SHALL NOT return to an earlier one of these screens for the same Session.
4. THE BLUELINE SHALL request notification permission only as defined in core Requirement 7 criterion 4, and SHALL make no notification permission request on the Purpose_Screen, the Message_Screen, the Board_Screen, or the Purpose_Check_Screen.
5. THE BLUELINE SHALL open the Destination only from the Connect_Confirm_Screen as defined in core Requirement 5, and SHALL open no tab from the Purpose_Screen, the Message_Screen, the Board_Screen, or the Purpose_Check_Screen.
6. THE ended-is-final property of core Requirement 14 criterion 5 SHALL hold with the new Session_States and transitions.

### Requirement 11: Commands, Display, and Privacy for the New Screens

**User Story:** As a user on a laptop or a phone, I want the new screens to behave like the rest of BLUELINE, so that everything stays keyboard-first and touch-friendly.

#### Acceptance Criteria

1. THE BLUELINE SHALL display the Command_Prompt on the Board_Screen and the Purpose_Check_Screen. On the Purpose_Screen and the Message_Screen, the Text_Field takes the place of the Command_Prompt, as the URL entry field does in the core spec.
2. WHEN the user submits `help` on the Board_Screen or the Purpose_Check_Screen, THE BLUELINE SHALL list every Command and key that screen accepts, one per line, as in core Requirement 12 criterion 4. The Destination_Menu `help` list SHALL include `4 - BOARD`, and the Duration_Menu `help` list SHALL describe `0` and `back` as returning to the Message_Screen.
3. THE BLUELINE SHALL display the Purpose and the Message as plain text exactly as stored, and SHALL NOT interpret any part of them as HTML or markup.
4. THE BLUELINE SHALL render the Purpose_Screen, the Message_Screen, the Board_Screen, and the Purpose_Check_Screen with no horizontal scrolling on viewports from 360 to 1920 CSS pixels wide, and the Session_Screen, the NO_CARRIER_Screen, and the Receipt_Screen SHALL keep that rule with a 60-Character Purpose and a 120-Character Message shown.
5. THE BLUELINE SHALL display all text that BLUELINE generates on the new screens in ALL-CAPS English, and SHALL display the Purpose and the Message exactly as entered after trimming, in any letter case and any script, including Hangul.
6. THE Notifier SHALL include no Purpose and no Message in a browser notification, and the tab title SHALL include no Purpose and no Message.
7. THE BLUELINE SHALL send no Purpose, Message, or Outcome over the network, as in core Requirement 10 criterion 2.

### Requirement 12: Demo Completion Time

**User Story:** As a hackathon judge on a laptop, I want the longer flow to still fit a short demo slot, so that I can try the purpose and review steps.

#### Acceptance Criteria

1. WHEN a user on the Dial_Screen presses Enter to dial, selects a preset Destination with a digit key, types a Purpose of up to 20 Characters and presses Enter within 10 seconds of the Purpose_Screen appearing, presses Enter on the empty Message_Field, selects the 1 MIN (DEMO) Planned_Duration, presses Enter on the Connect_Confirm_Screen, returns to the BLUELINE tab with a keyboard shortcut before Time_Up, makes no Hang_Up, and presses Y or N on the Purpose_Check_Screen, with every other input entered within 5 seconds of the screen that accepts it appearing, THE BLUELINE SHALL display the Receipt_Screen less than 150 seconds (2 minutes 30 seconds) after the user first presses Enter on the Dial_Screen.
2. THE BLUELINE-controlled waits in that flow SHALL stay within the 75-second budget of core Requirement 13 criterion 3. A NO_CARRIER_Screen with no Message SHALL still move on after 3 seconds. THE BLUELINE SHALL NOT shorten the Dial_Sequence or the handshake sound to meet this bound.

### Requirement 13: Post Numbers

**User Story:** As a feed-app user, I want each post on the Board to keep its number, so that I can remember and find a past session by its number.

#### Acceptance Criteria

1. WHEN a Session_Record is appended to the Session_History, THE BLUELINE SHALL give it the Post_Number one greater than the largest Post_Number in the Session_History, or the Post_Number 1 if the Session_History is empty.
2. THE BLUELINE SHALL NOT change a Post_Number after it is assigned. Writing an Outcome answer (Requirement 8 criterion 9) and removing the oldest Session_Records at the 1,000-record limit (core Requirement 10 criterion 10) SHALL leave the Post_Numbers of all remaining Session_Records unchanged.
3. WHEN the History_Serializer parses stored text in format version 1, THE History_Serializer SHALL assign the Post_Numbers 1 to n to the n Legacy_Records in stored order, so that the oldest Legacy_Record has the Post_Number 1.
4. FOR ALL Session_Histories of 0 to 1,000 Session_Records and every sequence of appends, including appends that remove the oldest Session_Records, every Session_Record that remains SHALL keep the Post_Number it had before the appends (stable-number property).
5. FOR ALL such Session_Histories and sequences of appends, no two Session_Records SHALL have the same Post_Number, and Post_Numbers SHALL increase strictly in stored order from oldest to newest (unique-number property).
6. THE History_Serializer SHALL treat new-format text as unreadable, under core Requirement 10 criterion 4 and criterion 6, if any Post_Number is not a positive safe integer, or if the Post_Numbers do not increase strictly in stored order.
7. IF the Session_History is reset because the stored text was unreadable (core Requirement 10 criterion 6), THEN THE BLUELINE SHALL start numbering again at 1.

## Confirmed decisions

These choices were confirmed before design. Each one is written into the criteria above.

1. The Board is reached as `4. BOARD` on the Destination_Menu (after dialing), and returns there. (Req 7.1, 7.2, 7.7)
2. The Board pages through the whole stored history, 20 posts per page, with N (older) and P (newer). (Req 7.4–7.6)
3. The Post_Number is a fixed serial number stored in each Session_Record. Legacy_Records get 1 to n in stored order, and each new record gets the largest Post_Number so far plus 1. Removing old records at the 1,000-record limit does not change the numbers of the records that remain. (Req 7.3, 13)
4. "접속 시간" on the Board is the actual duration in MM:SS, and the date is the end date. (Req 7.3)
5. The Message is not kept after the Session ends: it is deleted from storage when the Session ends and is shown only on that NO_CARRIER_Screen. (Req 2.6, 4.4)
6. When a Message is shown, the NO_CARRIER_Screen waits for Enter or tap instead of moving on after 3 seconds. (Req 4.6)
7. `0` and `back` on the Duration_Menu now return to the Message_Screen, not the Destination_Menu. (Req 3.5)
8. Over-long text is not cut off while typing; it is rejected on Enter with a message. Characters are counted as Unicode code points. (Req 1.5, 2.5)
9. In the Text_Fields, `back`, `bye`, and `help` are ordinary text. Going back uses Esc or the BACK button only. (Req 3.2)
10. A Session recovered from an old-format active state has no Purpose, skips the Purpose_Check_Screen, and records NO ANSWER. (Req 5.9, 9.4)
11. The Session_Screen shows the Purpose. The tab title and browser notifications show no Purpose and no Message. (Req 1.9, 11.6)
12. The demo bound is 150 seconds (2 minutes 30 seconds) from the first Enter to the Receipt_Screen, and the dial and handshake timing is not shortened. (Req 12.1, 12.2)
13. New data is written to the v2 storage keys. The v1 history key is only read and is never written or removed. The v1 active key is read as a fallback and is removed when a Session ends. (Req 8.7, design)
14. The Board uses one line per post at 600 CSS pixels and wider, and moves the Purpose to a second line on a Narrow viewport. (Req 7.3, 7.10)
15. Outcomes are shown as the words DONE, DRIFTED, and NO ANSWER. The receipt always uses the words (`DONE 1 · DRIFTED 0 · NO ANSWER 2`); the Board uses `Y`, `N`, `?` only on a Narrow viewport. (Req 6.1, 6.2, 7.3)
