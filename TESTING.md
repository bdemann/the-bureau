# Testing — BCR Clear

Two layers:

1. **Automated** — pure data-layer tests via `node:test` + `@augment-vir/assert`.
   Run: `npm test` (no browser, no DOM).
2. **Manual** — UI/UX flows that need a real browser. Use the checklist below.

When you find a bug during manual testing, the goal is to add a regression
test for it in the automated layer where possible, then fix.

---

## Automated coverage (current)

- `recurrence.ts` — period boundaries, day-of-week / Nth-weekday math, fixed
  vs rolling advance, rollover semantics.
- `urgency.ts` — every band-decision path including snooze escalation.
- `storage.ts` — date helpers, visibility/overdue, Phase 1 → Phase 2 migration.
- `dialogues.ts` — trigger coverage, character preference, defensive fallback.

Not (yet) covered: element rendering, event flows. Those are manual until/unless
we add a browser test runner.

---

## Manual checklist

Mark each row as you verify in the browser. Reset the localStorage entry
`bureau_v1` between phases when you want a clean state.

### App shell

- [ ] Page loads with no console errors
- [ ] Header shows `CLEAR` + `BUREAU OF CIVIC RESPONSIBILITY` subtitle
- [ ] Patriot score + streak render top-right
- [ ] Daily is the default landing view
- [ ] Hamburger (☰) opens slide-in menu from the right; menu shows Insights and Report a Neighbor only
- [ ] Menu → Insights navigates to insights view and closes menu
- [ ] Menu → Report a Neighbor triggers share sheet (or copies link)
- [ ] Clicking outside the menu panel closes it
- [ ] Day-start dialogue appears on first load each day; dismiss closes it

### Bottom navigation bar

- [ ] Fixed bottom nav bar is visible on all primary views: Daily, Areas, Ideas, Goals
- [ ] Bar shows four tabs: Daily · Areas · Ideas · Goals
- [ ] Active tab is highlighted in amber with an amber indicator line at its top edge
- [ ] Tapping Daily tab navigates to the daily view
- [ ] Tapping Areas tab navigates to the areas of responsibility list
- [ ] Tapping Ideas tab navigates to the ideas view
- [ ] Tapping Goals tab navigates to the goals list
- [ ] While in an area detail (area drill-down), the Areas tab stays highlighted
- [ ] While in a goal detail, the Goals tab stays highlighted
- [ ] Tapping Areas or Goals tab from their detail view returns to the top-level list
- [ ] On iOS PWA: nav bar sits above the home-indicator safe area (no content clipped)
- [ ] Undo toast appears above the nav bar, not behind it

### Areas of Responsibility view (area list)

- [ ] Empty: shows `NO AREAS OF RESPONSIBILITY` stamp
- [ ] `+ NEW AREA OF RESPONSIBILITY` button opens the wizard
- [ ] Wizard cancel (with no data entered) closes immediately without creating anything
- [ ] Clicking outside the wizard with data entered shows "DISCARD CHANGES?" confirmation
- [ ] Confirmation "Keep editing" returns to the wizard with all data intact
- [ ] Confirmation "Discard" closes the wizard and clears all state
- [ ] Click card → area-detail opens
- [ ] Multiple areas render
- [ ] A area where all `kind=task` commitments are completed shows "CLEARED" (regardless of routines)
- [ ] A area with only routines (no tasks) never shows "CLEARED"
- [ ] A area with a mix: CLEARED only when the task commitments are all done

### Area of Responsibility creation wizard

- [ ] On mobile: wizard sheet scrolls so all content (including bottom buttons) is visible above the nav bar — nav bar remains visible and on top (regression: issue #10)
- [ ] Step 1: Continue disabled until area name is typed
- [ ] Step 1: Description is optional (Continue works with empty description)
- [ ] Step 1: Color picker selects a highlight color; swatch updates visually
- [ ] Step 1: "Quick create (no commitments)" skips to area creation with no commitments
- [ ] Step 2: Brainstorm textarea accepts free text; parsed names preview below (split on newlines and commas, empties stripped)
- [ ] Step 2: "Create without commitments" creates the area immediately with no commitments
- [ ] Step 2: "Configure N commitments →" advances to step 3 with the parsed list
- [ ] Step 3: Commitment name pre-filled from brainstorm text; editable
- [ ] Step 3: Tier T1–T4 grid selects consequence tier
- [ ] Step 3: Default cadence is Daily
- [ ] Step 3: Cadence grid (Daily / Weekly / Monthly / Quarterly / Annually) is selectable
- [ ] Step 3 Annually: Season shortcuts (Spring/Summer/Fall/Winter) appear and select corresponding month
- [ ] Step 3 Annually: Month grid (Jan–Dec, 4×3) appears; active month is highlighted
- [ ] Step 3 Annually: Day-of-month field appears; anchor summary reads "Every Sep 1st." etc.
- [ ] Step 3 Annually: Clicking a season shortcut and then checking the month grid shows the correct month highlighted
- [ ] Step 3 Weekly: day-of-week multi-select appears; multiple days can be toggled
- [ ] Step 3 Weekly: default day selected is today's day of the week
- [ ] Step 3 Monthly: "Day of month" / "Nth weekday" toggle appears
- [ ] Step 3 Monthly (day of month): numeric input accepts 1–31
- [ ] Step 3 Monthly (Nth weekday): 1st/2nd/3rd/4th/5th\*/Last picker + day-of-week picker appear
- [ ] Step 3 Monthly (Nth weekday): anchor summary reads "The 2nd Sunday of each month" etc.
- [ ] Step 3 Monthly (Nth weekday): selecting 5th\* shows "(skips months without a 5th)" in summary
- [ ] Step 3: Time-of-day grid (Anytime / Morning / Afternoon / Evening) is selectable
- [ ] Step 3: "Create with commitments so far" creates the area using only configured commitments up to this point
- [ ] Step 3: "Next Commitment →" advances to the next commitment without creating yet
- [ ] Step 3: Last commitment shows "Create Area ✓" instead of Next
- [ ] After wizard completes: area card appears in dashboard
- [ ] After wizard completes: commitments appear with ROUTINE chip in area detail

### Area-detail

- [ ] Header breadcrumb shows area name
- [ ] Back button returns to Areas of Responsibility
- [ ] Empty state shows "No active commitments in this area." + Whitaker quote
- [ ] `+ MAKE NEW COMMITMENT` opens dialog
- [ ] Active tasks list shows incomplete + un-snoozed (regardless of due date)
- [ ] Snoozed list shows separately when applicable
- [ ] Cleared tasks toggle (Show/Hide N cleared commitments) works
- [ ] EDIT AREA and DECOMMISSION AREA buttons visible at bottom of area detail
- [ ] Clicking EDIT AREA opens inline form pre-filled with current name, briefing, and color
- [ ] Color swatch matching current area color is pre-selected
- [ ] Changing name/description/color and clicking SAVE CHANGES persists the updates
- [ ] Saved area name and color reflect immediately in the area-detail header
- [ ] CANCEL in edit form closes the form with no changes
- [ ] Cannot save with blank area name (SAVE CHANGES does nothing until name is non-empty)
- [ ] Clicking DECOMMISSION AREA shows inline confirmation ("DECOMMISSION" / "CANCEL")
- [ ] Cancelling confirmation returns to normal view with no changes
- [ ] Confirming decommission removes the area and all its commitments, then navigates back to Areas of Responsibility

### Filing commitments — type picker

- [ ] `+ MAKE COMMITMENT` (daily view) and `+ MAKE NEW COMMITMENT` (area detail) both show a bottom-sheet type picker with 4 options: ROUTINE / TASK / GOAL / IDEA
- [ ] Tapping the backdrop outside the panel dismisses the picker without creating anything
- [ ] CANCEL button also dismisses
- [ ] ROUTINE → opens the add-commitment sheet pre-set to Routine mode (recurring on, daily cadence)
- [ ] TASK → opens the add-commitment sheet pre-set to Task mode (one-time, hard date)
- [ ] GOAL → opens the add-commitment sheet pre-set to Goal mode (title = "FILE NEW GOAL")
- [ ] IDEA → opens the add-commitment sheet pre-set to Idea mode (title = "FILE NEW IDEA")

### Filing commitments — type switcher (create and edit)

- [ ] Add dialog defaults to TASK kind selected
- [ ] ROUTINE / TASK / GOAL / IDEA type toggle is visible in BOTH create and edit mode
- [ ] Switching type in create mode shows the correct fields for each type
- [ ] Switching type in edit mode shows the correct fields and preserves previously-entered data
- [ ] Switching to ROUTINE forces recurring ON (if it was off); does not clobber other recurrence settings
- [ ] Switching to TASK from ROUTINE preserves the isRecurring state (doesn't force it off)
- [ ] Selecting ROUTINE changes sheet title to "MAKE NEW ROUTINE" / "AMEND ROUTINE" and submit to "COMMIT ROUTINE" / "SAVE ROUTINE"
- [ ] Selecting TASK shows "MAKE NEW TASK" / "AMEND TASK" and "FILE TASK" / "SAVE TASK"
- [ ] Selecting GOAL shows "NEW GOAL" / "AMEND GOAL" and "SET GOAL" / "SAVE GOAL"
- [ ] Selecting IDEA shows "NEW IDEA" / "AMEND IDEA" and "FILE IDEA" / "SAVE IDEA"
- [ ] Commitments with `kind=routine` show a ROUTINE chip in the task-item card

### Cross-type conversion (edit mode)

- [ ] Edit a task → switch to GOAL → save: original task is removed; a new goal appears in Goals view
- [ ] Edit a routine → switch to IDEA → save: original routine is removed; idea appears in Ideas view
- [ ] Edit a goal → switch to TASK → save: original goal is removed; new task appears in commitment lists
- [ ] Edit an idea → switch to TASK → save: original idea is removed; new commitment appears
- [ ] Linked goal picker is visible in edit mode for TASK/ROUTINE (shows current linked goal pre-selected)
- [ ] Linked goal picker is visible even when an area is selected that has no goals — shows "— None —" only (regression: issue #28)
- [ ] Changing the linked goal in edit mode and saving rewires the goal linkages correctly
- [ ] Removing the linked goal in edit mode and saving removes the task from the old goal's linked list

### Goal → other type conversion (dissociation warning)

- [ ] Editing a goal that has linked commitments: switching to any other type shows a yellow warning banner
- [ ] Warning reads "This goal has N linked commitment(s). Switching type will dissociate them." (text uses the skin's goal term)
- [ ] Clicking CANCEL in the warning returns to goal edit mode; no type switch occurs
- [ ] Clicking PROCEED dismisses the warning and switches to the new type
- [ ] Save button is disabled while the warning is visible
- [ ] After confirming PROCEED: saving removes the goal (its linked commitments are no longer under any goal)
- [ ] Editing a goal with NO linked commitments: switching type immediately (no warning shown)

### Task commitment creation — one-time

- [ ] New task form defaults: recurring OFF, window type Hard, due date = today
- [ ] Title required (FILE TASK disabled until typed)
- [ ] Description optional
- [ ] Tier 1–4 buttons toggle; help text updates per tier
- [ ] Flexible / Hard date toggle works
- [ ] Hard requires a date; flexible date is optional
- [ ] Date picker visible (not recurring)
- [ ] Submit creates commitment; dialog closes; commitment appears in active list
- [ ] Cancel closes without creating

### Task commitment creation — recurring (daily cadence)

- [ ] Toggle "Recurring task" on, set cadence to Daily → "Timing Type" selector disappears (B1)
- [ ] Set cadence to Multiple times/day → "Timing Type" selector disappears (B1)
- [ ] Set cadence back to Weekly → "Timing Type" selector reappears
- [ ] "Repeat Cycle" (schedule mode) selector is hidden inside cadence picker when cadence is daily (existing behavior, verify still working)
- [ ] With daily cadence, a "Skip Days" row appears with Sun–Sat toggle buttons (#37)
- [ ] "Skip Days" row does NOT appear for weekly cadence
- [ ] Toggling a day button selects/deselects it; multiple days can be selected
- [ ] Saving a daily task with Sunday skipped → task does not appear in daily view on Sundays
- [ ] Same task appears normally on Monday (non-skip day)
- [ ] Completing on Saturday → next suggestedDate is Monday (skipping Sunday)
- [ ] Completing on Friday with Sat+Sun skipped → next suggestedDate is Monday
- [ ] Rollover through a Sunday (skip day): no miss counted, skipStreak unchanged
- [ ] Rollover through a Monday (non-skip day): miss counted normally
- [ ] Editing an existing daily task with skipDays set: skip day buttons show the correct selection

### Task commitment creation — recurring (weekly day-of-week, multi-select)

- [ ] Toggle "Recurring task" on
- [ ] Cadence: Weekly
- [ ] Day-of-week picker appears (Sun–Sat); date picker hidden
- [ ] Multiple days can be toggled on/off independently
- [ ] Default is today's day of the week (single day selected)
- [ ] Anchor summary updates with readable description:
    - 5 weekdays → "Every weekday (Mon–Fri)."
    - 6 days without Sun → "Every day except Sunday."
    - 6 days without Sat → "Every day except Saturday."
    - 7 days → "Every day."
    - Custom → "Mon, Wed, Fri." style list
- [ ] FILE TASK disabled when no days selected
- [ ] **Single day selected, today matches**: first occurrence = today
- [ ] **Single day selected, today doesn't match**: first occurrence = next occurrence
- [ ] **Multi-day, complete on Wed (Mon/Wed/Fri)**: next occurrence = Fri (same week)
- [ ] **Multi-day, complete on Fri (Mon/Wed/Fri)**: next occurrence = Mon (next week)
- [ ] **Weekly commitment with hardDaysOfWeek**: shows in MANDATORY on each configured day (not Suggested)
- [ ] Existing commitment with multi-day schedule pre-fills correctly in edit dialog

### Task commitment creation — recurring (monthly, day-of-month)

- [ ] Cadence: Monthly → "Anchor" toggle appears
- [ ] Day-of-month input accepts 1–31; rejects out-of-range
- [ ] Anchor summary shows "The Nth of each month"
- [ ] Submit creates commitment; first occurrence is this month's that-day if it
      hasn't passed, else next month's
- [ ] Card label `Day N of each month · next {date}`

### Task commitment creation — recurring (monthly, Nth weekday)

- [ ] Switch to "Nth weekday" mode
- [ ] Ordinal (1st/2nd/3rd/4th/5th (when it occurs)/Last) and day-of-week pickers appear
- [ ] Anchor summary shows "The 3rd Thursday of each month"
- [ ] **This month's Nth-dow already passed**: first occurrence = next month's
- [ ] **Not yet passed**: first occurrence = this month's
- [ ] **Last weekday**: works in both 4-Thursday and 5-Thursday months
- [ ] **5th weekday**: skips months that don't have a 5th occurrence (e.g., 5th Sunday skips Sep and Oct 2026, lands Nov 29)
- [ ] Card label `3rd Thursday of each month · next {date}`

### Milestone commitment — progress cadence

- [ ] Create a milestone commitment → "Progress Cadence" field appears below window type
- [ ] Default is "Once per day" (no custom cadence)
- [ ] Switching to "Custom" reveals a frequency number input and cadence dropdown
- [ ] Frequency input accepts 2–99; rejects values below 2
- [ ] Submit with "Once per day" → milestone hides after logging progress once today; reappears tomorrow
- [ ] Submit with custom cadence (e.g. 3× / week) → milestone hides after logging progress 3 times that week; reappears next week
- [ ] After hitting the weekly quota the milestone does not reappear until the next progress period starts
- [ ] Logging progress on the same day twice is blocked (still hides for rest of today even when quota not yet met)
- [ ] Edit an existing milestone with a progress cadence → cadence and frequency pre-populate correctly
- [ ] Changing window type away from Milestone → progress cadence section disappears

### Task commitment creation — multiple-per-period

- [ ] Cadence: Multiple per week (or per-day/month/quarter/year)
- [ ] "Times per period" input appears; accepts 2–99
- [ ] Date picker still visible (multi-per uses dates, not anchors)
- [ ] Submit creates commitment with `frequencyPerPeriod`
- [ ] Card shows `0 / 3 this week` progress chip

### Commitment completion

- [ ] One-time task: ✓ → commitment moves to "cleared" (collapsed)
- [ ] Standard recurring: ✓ → suggestedDate updates to next period
- [ ] Multi-per-period: ✓ → progress chip increments
- [ ] When multi-per count reaches target: commitment hides until next period
- [ ] Score goes up by tier-weighted amount
- [ ] Streak increments
- [ ] Sometimes Whitaker (or Briggs) speaks; Dir Briggs may deliver "The only good Commie is a Commi-tment."

### Reordering commitments

- [ ] Each commitment card in area-detail (active commitments) shows a `⠿` drag handle on the right
- [ ] Each commitment card in daily view shows a `⠿` drag handle on the right
- [ ] Dragging a commitment by its handle (or anywhere on the card) shows the card at reduced opacity
- [ ] A blue line appears above the drop target as the dragged card hovers over it
- [ ] Dropping onto another commitment inserts the dragged one before the target
- [ ] A drop zone at the bottom of each list allows moving a commitment to the last position
- [ ] Reorder persists after navigating away and back (saved to state)
- [ ] Reordering in area-detail does not affect commitments in other areas
- [ ] Reordering within a daily-view band does not affect commitments in other bands
- [ ] Reordering within one time-slot group does not affect commitments in another slot group within the same band

### Reordering areas (dashboard)

- [ ] Dragging an area card on the dashboard shows the card at reduced opacity
- [ ] A blue line appears above the drop target as the dragged card hovers over it
- [ ] Dropping onto another card inserts the dragged one before the target
- [ ] A drop zone at the bottom of the list allows moving an area to the last position
- [ ] Reorder persists after navigating away and back (saved to state)

### Filing commitments from the daily view

- [ ] `+ MAKE COMMITMENT` button visible at the bottom of the daily view
- [ ] Clicking it opens the dialog with "No area" pre-selected in the Area of Responsibility dropdown
- [ ] Commitment can be submitted with "No area" selected — appears in daily view with no area name tag
- [ ] Area dropdown lists all existing areas; selecting one assigns the commitment to that area
- [ ] After creation, commitment appears in the correct area-detail if an area was selected

### Area of Responsibility assignment on commitments

- [ ] Area of Responsibility dropdown is the last field in the commitment dialog
- [ ] When opened via `+ FILE NEW COMMITMENT` in a area, that area is pre-selected in the dropdown
- [ ] User can change the pre-selected area before submitting
- [ ] When editing an existing commitment, the current area is pre-selected in the dropdown
- [ ] Changing the area on an existing commitment and saving moves it to the new area
- [ ] "No area" option always present; selecting it saves the commitment with no area assignment
- [ ] Commitments with no area do not appear in any area-detail view
- [ ] Commitments with no area do appear in the daily view (with no area name tag above the title)

### Commitment termination

- [ ] In edit mode (click any commitment card), "TERMINATE COMMITMENT" button appears at the bottom of the dialog
- [ ] Clicking TERMINATE COMMITMENT shows inline confirmation: "PERMANENTLY TERMINATE THIS COMMITMENT?" with TERMINATE and CANCEL buttons
- [ ] CANCEL in confirmation returns to the edit form without deleting
- [ ] Confirming TERMINATE removes the commitment and closes the dialog
- [ ] Terminated commitment no longer appears in area-detail or daily view
- [ ] TERMINATE COMMITMENT button is NOT present when creating a new commitment (add mode)

### Snooze

- [ ] Daily routines (kind=routine, cadence=daily or multiple-per-day) show no snooze button — only Skip
- [ ] Snooze button → snoozedUntil = +24h, badge appears
- [ ] Commitment moves to Snoozed section
- [ ] Snooze count escalates color (yellow → orange → red)
- [ ] Score decreases on snooze (tier-weighted, N-scaled by active task count)
- [ ] Score decreases on skip (penalty > snooze penalty; N-scaled)
- [ ] Reopening the app after missing tasks decreases the score (auto-skip penalty; auto-skip > skip > snooze)
- [ ] With fewer active tasks each action has a larger per-task score impact; with more tasks each action has a smaller per-task impact
- [ ] Hard-date commitment whose date is today: button reads "Cannot snooze" and is disabled
- [ ] Mon–Sat routine (hardDaysOfWeek [1–6]) on a weekday (Mon–Fri): button reads "Cannot snooze" (next occurrence is tomorrow)
- [ ] Same routine on Saturday: snooze IS allowed (Sunday is not a committed day)
- [ ] At 6 snoozes (any tier), Briggs takes over
- [ ] Whitaker dialogue escalates with count

### Multi-day weekly routines (hardDaysOfWeek) — completion dismissal

- [ ] Mon–Sat routine completed on Monday: card disappears from the daily view immediately
- [ ] Same routine: card reappears as mandatory on Tuesday
- [ ] Skip button works on Mon–Sat routine (advances to Tuesday's occurrence, card hides)
- [ ] Completing every day Mon–Sat: card is hidden on Sunday (no committed day) and reappears Monday of the following week
- [ ] "Disable snooze" toggle is NOT shown in the create/edit form (B2 — removed)

### Un-snooze

- [ ] In Snoozed list → "Wake up" moves commitment back to Active
- [ ] Snooze count _retained_ (un-snooze ≠ reset)

### Skip indicator

- [ ] After the first skip, a grey "↷ Skipped ×1" badge appears on the commitment card (warning)
- [ ] After 2–3 skips, badge turns olive and reads "↷ Skipped ×N — Pattern noted" (caution)
- [ ] After 4–5 skips, badge turns dark and reads "↷ FLAGGED — Skipped ×N" (danger)
- [ ] At 6+ skips, badge becomes a pulsing navy stamp "CHRONIC AVOIDANCE ×N" (critical)
- [ ] Completing a commitment replaces the skip badge with the remediation badge (skip → recovery)
- [ ] Skip badge is visible on commitment cards in both the daily view and area-detail

### Remediation (recovery after skip/snooze streak)

Remediation fires whenever a commitment that had a skip streak OR high snooze count is completed for the first time. The agent must demonstrate consecutive completions to clear the record.

**Basic remediation flow**

- [ ] Complete a routine that had skipStreak ≥ 1 → skip badge disappears and a teal "↺ Recovering — N left" badge appears (remediationCount = previous skipStreak)
- [ ] Complete it again → badge counts down (N − 1 left)
- [ ] Complete it enough times → badge disappears entirely (fully cleared)
- [ ] Completing a routine with NO prior streak or remediation → no remediation badge appears

**Snooze-triggered remediation**

- [ ] Complete a routine that had snoozeCount ≥ 1 → snooze badge disappears and remediation badge appears (remediationCount = previous snoozeCount)
- [ ] When both skipStreak and snoozeCount are > 0, remediationCount = max(skipStreak, snoozeCount)

**Severity escalation**

- [ ] remediationCount 1–2 → teal low-severity badge "↺ Recovering — N left"
- [ ] remediationCount 3–4 → amber medium-severity badge "↺ Remediation — N needed"
- [ ] remediationCount 5+ → pulsing rust badge "↺ INTEGRITY AUDIT ×N"

**Relapse mid-remediation**

- [ ] While remediation badge is showing (e.g. remediationCount = 3), skip the routine → skip badge reappears with skipStreak = 3 (starts at the remediation level, NOT at 1); remediation badge gone
- [ ] While remediation badge is showing (e.g. remediationCount = 3), snooze the routine → snooze badge reappears with snoozeCount = 3 (starts at remediation level); remediation badge gone

**Score / penalty**

- [ ] A snooze while in remediation applies the same score penalty as a regular snooze at the resulting count level

### Daily view

- [ ] Mandatory: commitments due today / hard-overdue / cadence=daily / weekly with hardDaysOfWeek on a configured day
- [ ] Suggested: flexible commitments past suggestedDate but inside window (regression: suggestedDate = today shows "Due today", not "Suggested [date]")
- [ ] Radar: commitments ≤ 3 days from hard date, or window % low
- [ ] Backlog: everything else
- [ ] All four bands (Mandatory, Suggested, Radar, Backlog) start with a chevron ▾/▸ in the header
- [ ] Clicking a band header collapses/expands it; Mandatory and Suggested start expanded, Radar and Backlog start collapsed
- [ ] When a band is collapsed only the header + count are visible; tasks are hidden
- [ ] Empty Mandatory: "No mandatory tasks today. Agent Whitaker approves."
- [ ] Each card shows area name above title (cross-area context)
- [ ] When commitments span multiple time-of-day slots within a band, each slot has a collapsible header (label · count · chevron)
- [ ] The slot matching the current time of day starts expanded; others start collapsed
- [ ] Tapping a slot header toggles it open/closed
- [ ] Switching to background and returning after the time slot changes resets the default to the new slot
- [ ] Active use (app stays open through a slot transition) does NOT collapse open sections
- [ ] Complete/snooze actions work from daily view
- [ ] T1 daily routine appears in MANDATORY band; T2/T3/T4 daily routines appear in SUGGESTED band (C2)
- [ ] T2 daily routine with skipStreak ≥ 5 escalates to MANDATORY band (C2 skip escalation)
- [ ] T4 task never appears in MANDATORY band even on its due date (C1)
- [ ] Completing all mandatory tasks → mandatory band auto-collapses and suggested band auto-expands (E1)
- [ ] After E1 auto-collapse the user can still manually toggle mandatory open/closed
- [ ] Radar and backlog task cards show a "Not Today" button (E2)
- [ ] Mandatory and suggested task cards do NOT show "Not Today" button (E2)
- [ ] Pressing "Not Today" hides the card for the rest of today — no score change, no snoozeCount increment (E2)
- [ ] After midnight the "Not Today" card reappears normally (E2)
- [ ] Snoozing a commitment shows an UNDO toast at the bottom of the screen
- [ ] Skipping a commitment shows an UNDO toast at the bottom of the screen
- [ ] Clicking UNDO on the toast reverses the skip/snooze (task returns to its pre-action state, score is restored)
- [ ] The UNDO toast disappears automatically after ~3 seconds
- [ ] Performing a second skip/snooze replaces the previous UNDO toast

### Pausing commitments

- [ ] Edit any commitment → "Pause Commitment" row with 4 options: No / Indefinitely / Until date / For N days
- [ ] No: commitment is visible and operates normally
- [ ] Indefinitely: commitment disappears from daily view with no score impact
- [ ] Until date: hides until the selected date, then reappears automatically
- [ ] For N days: hides for N days from today
- [ ] Paused commitments do NOT accrue misses during rollover
- [ ] Paused commitments appear in a PAUSED section in their area's area detail
- [ ] Clicking the task card for a paused commitment opens edit mode where pause can be removed

### Monthly multi-day scheduling

- [ ] Monthly cadence → "Day of month" mode shows a 7-column grid of buttons 1–31 (not a number input)
- [ ] Buttons toggle on/off; at least one must stay selected (can't deselect the last one)
- [ ] Anchor summary reads "The 1st of each month." for one day, "The 1st and 15th of each month." for two
- [ ] Completing on the 1st when [1,15] are selected advances the commitment to the 15th of the same month
- [ ] Completing on the 15th advances to the 1st of the next month
- [ ] Edit dialog re-opens with all previously selected days highlighted
- [ ] Area wizard monthly: same multi-select grid behaviour

### Quarterly cadence with month-of-quarter anchor

- [ ] Quarterly cadence → "Month of Quarter" picker shows three buttons: "1st Month", "2nd Month", "3rd Month"
- [ ] Selecting "2nd Month" updates the anchor summary (e.g., "The 15th of the 2nd month of each quarter.")
- [ ] Day-of-month grid (1–31 toggle buttons) appears below the month-of-quarter picker
- [ ] Multiple days can be selected; at least one must remain selected
- [ ] Anchor summary reflects multiple selected days (e.g., "The 1st and 15th of the 2nd month of each quarter.")
- [ ] Completing on the 1st when [1,15] selected in 2nd month advances to the 15th of that same quarter's 2nd month
- [ ] Completing on the 15th (last dom in period) advances to the 1st of the 2nd month of the next quarter
- [ ] Edit dialog re-opens with the correct month-of-quarter button highlighted and all selected days toggled on
- [ ] Area wizard quarterly: same month-of-quarter picker and multi-dom grid behavior

### Annually cadence (commitment dialog)

- [ ] Selecting "Annually" from the cadence dropdown shows Month grid and Day Anchor toggle
- [ ] Month grid (Jan–Dec) allows selection; clicking any month updates the anchor summary
- [ ] Day Anchor toggle: "Day of month" shows day-of-month grid; "Nth weekday" shows ordinal + day-of-week pickers (#35)
- [ ] Day of month: day-of-month grid updates the anchor summary (e.g., "Every Sep 1st.")
- [ ] Nth weekday: ordinal picker (1st/2nd/3rd/4th/5th/Last) + day-of-week picker (#35)
- [ ] Nth weekday: summary reads "The 4th Thursday of Nov each year." (#35)
- [ ] Saving with Nth weekday: edit dialog re-opens with "Nth weekday" selected and correct ordinal/day-of-week (#35)
- [ ] After advancing one year with day-of-month: suggested date is the same month/day next year
- [ ] After advancing one year with Nth weekday: suggested date is that weekday in the same month next year (#35)
- [ ] "4th Thursday of November" task: first occurrence is correct Thanksgiving date; advances correctly year-over-year (#35)
- [ ] "2nd Sunday of May" (Mother's Day): correct date each year (#35)

### Recurring start date

- [ ] "Has a start date" checkbox appears in the recurring section (for both routines and tasks)
- [ ] Checking it reveals a date picker labeled "Start Date"
- [ ] A commitment with a future start date does NOT appear in the daily view
- [ ] A commitment with a future start date does NOT accrue misses during rollover
- [ ] Once the start date arrives the commitment appears normally
- [ ] Edit dialog pre-fills start date checkbox + date if one is set

### Recurring end conditions

- [ ] "Has an end condition" checkbox is hidden for routines (they never end)
- [ ] Checkbox appears inside the recurring section for task-kind commitments
- [ ] Checking it reveals "N completions" / "A date" toggle
- [ ] "N completions" shows a number input; "A date" shows a date picker
- [ ] After N completions: commitment disappears permanently (no more periods)
- [ ] After date: completing on the end date permanently closes the commitment
- [ ] After date: commitment is retired on next app load after end date passes (even if not completed)
- [ ] Edit dialog pre-fills end condition from an existing commitment with one set

### Recurrence rollover

- [ ] Daily routine: complete it, advance device clock 1 day, reload — back, fresh
- [ ] Weekly fixed (anchored Thursday): complete it, next-week reload — suggestedDate is next Thursday
- [ ] Weekly rolling: complete on a different day — next due = completion + 7 days
- [ ] Multi-per-week: complete 1× this week, advance week — completionsThisPeriod resets to 0

### Insights

- [ ] Hamburger → Insights navigates to the insights view; bottom nav has no active tab while on this view
- [ ] Page shows "Insights" title and subtitle
- [ ] MISSED COMMITMENTS section shows commitments whose one-time hard-date has passed (missedAt set); empty state shows "No missed commitments on record"
- [ ] Missed one-time hard-date commitments no longer appear in daily or area-detail views
- [ ] Each missed one-time commitment row shows REVIVE and DISMISS buttons
- [ ] REVIVE: commitment returns to active; if its suggestedDate was in the past it is reset to today; commitment reappears in daily mandatory band
- [ ] DISMISS: commitment is permanently deleted and no longer appears anywhere
- [ ] Recurring commitments with missed periods (totalMisses > 0 but missedAt = null) show the miss count only — no REVIVE/DISMISS buttons
- [ ] Recurring commitments that rolled over without completion appear in MISSED COMMITMENTS with miss count
- [ ] MOST SNOOZED section shows commitments with totalSnoozes > 0, sorted by count desc
- [ ] Snoozing a commitment increments its totalSnoozes (verify by checking insights after snooze)
- [ ] MOST SKIPPED section shows commitments with totalSkips > 0, sorted by count desc
- [ ] Skipping a recurring commitment increments its totalSkips (visible in insights)
- [ ] TOP COMPLETIONS section shows commitments sorted by totalCompletions desc
- [ ] Completing a commitment increments totalCompletions (visible in insights)
- [ ] BEST STREAKS section appears when any task has maxTaskCompletionStreak > 1
- [ ] RESPONSIBILITIES OVERVIEW table appears when areas exist; shows miss/snooze/skip/done counts per area
- [ ] Recurring commitment rolled over at startup (period elapsed without completion): totalMisses incremented
- [ ] skipStreak resets to 0 on commitment completion; taskCompletionStreak resets to 0 on skip

### Radar lead days (per-commitment)

- [ ] Hard-date commitment add/edit form shows a "Radar lead (days)" number field (default 3)
- [ ] Field is absent for flexible-window and milestone commitments
- [ ] Setting lead to 5: commitment appears in RADAR band 5 days before its date
- [ ] Setting lead to 1: commitment stays in BACKLOG until 1 day before its date
- [ ] Setting lead to 0: commitment never appears in RADAR (goes directly BACKLOG → MANDATORY)
- [ ] Edit dialog re-opens with the saved lead value pre-filled
- [ ] Existing commitments without a saved radarLeadDays behave as if set to 3 (no regression)

### Goals

**Global view (Goals nav item)**

- [ ] Bottom nav → Goals tab navigates to the goals view
- [ ] Page shows "GOALS" title and subtitle with "CLICK A GOAL TO MANAGE COMMITMENTS" hint
- [ ] Empty state shows "No objectives on file. Make one above to begin."
- [ ] "+ MAKE GOAL" button opens the unified commitment sheet pre-set to Goal mode
- [ ] Goal cards are listed under ACTIVE / ACHIEVED / ABANDONED section headers (counts shown; empty sections hidden)
- [ ] All goals across all areas are listed, sorted by target date (soonest first, no-date goals last) within each section
- [ ] Goal cards show: title, description snippet (2-line clamp), target date, area badge (⊙ Area), linked commitment chips (read-only)
- [ ] Target date in the past shows "OVERDUE" in red for active goals
- [ ] MARK ACHIEVED and ABANDON action buttons on active cards (clicking does NOT navigate to detail)
- [ ] REACTIVATE action button on achieved/abandoned cards
- [ ] Clicking the body of a goal card (not an action button) navigates to the goal-detail view

**Per-area view (area detail page)**

- [ ] Area detail page shows a "GOALS" section (label matches the active skin's goal term)
- [ ] Only goals linked to that area appear; other areas' goals are not shown
- [ ] "+ MAKE GOAL" button in the per-area view opens the commitment sheet pre-set to Goal mode
- [ ] Goals filed from area detail are automatically linked to that area
- [ ] Clicking a goal card in the per-area view navigates to the goal-detail view

**Goal-detail view**

- [ ] Header breadcrumb shows the goal title; back button returns to the previous view
- [ ] Title, description, target date, status badge, and area badge are shown
- [ ] EDIT button opens the unified bottom-sheet dialog pre-filled with current title, description, target date, and area — in GOAL type mode
- [ ] The type switcher is visible; all four types are available; the dialog opens on GOAL
- [ ] Target date in the goal edit form is pre-filled from the saved value
- [ ] Saving the dialog updates the goal and closes the sheet
- [ ] LINK COMMITMENT button opens a bottom-sheet picker with a search bar
- [ ] Picker lists all commitments not already linked to the goal; search filters by title
- [ ] Tapping a commitment in the picker links it to the goal and closes the sheet
- [ ] "+ MAKE NEW COMMITMENT" button opens the add-commitment sheet with the goal's area pre-selected; created commitment is auto-linked to the goal
- [ ] Cancelling the commitment sheet leaves the goal's linked commitments unchanged
- [ ] Active, Paused, Snoozed, and Completed task sections appear for linked commitments
- [ ] Each linked commitment shows "⊗ unlink from objective" below its card; clicking unlinks it (commitment itself is not deleted)
- [ ] Completed linked commitments are shown in a collapsible "COMPLETED" section (Show/Hide toggle)
- [ ] ABANDON OBJECTIVE (active goals only) and DELETE OBJECTIVE buttons appear in the delete zone at the bottom
- [ ] ABANDON OBJECTIVE moves the goal to the ABANDONED section; navigating back shows it there
- [ ] DELETE OBJECTIVE shows inline confirmation; confirming deletes the goal and returns to the previous view
- [ ] Decommissioning an area also deletes all goals linked to that area

### Ideas

**Global view (Ideas nav item)**

- [ ] Bottom nav → Ideas tab navigates to the ideas view
- [ ] Page shows "IDEAS" title and subtitle
- [ ] Empty state shows "No intelligence on file. Observations go here."
- [ ] "FILE INTELLIGENCE" dashed button appears when no add-form is open
- [ ] Clicking "FILE INTELLIGENCE" shows the add form with Title, Notes, Linked Area, and (when an area is selected) a Linked Objective dropdown
- [ ] Linked Area dropdown lists all areas; default is "— None —"
- [ ] Selecting an area causes the "Linked Objective" dropdown to appear, listing active goals for that area
- [ ] Submitting with a blank title does nothing (form stays open)
- [ ] Submitting with a title closes the form and the idea card appears immediately
- [ ] Idea cards show title, notes (if any), linked area badge (if set), and linked objective badge (if set)
- [ ] Ideas are listed newest-first
- [ ] Clicking anywhere on an idea card (except the action buttons) opens the unified bottom-sheet dialog pre-filled with the idea's data, in IDEA type mode
- [ ] EDIT button on a card also opens the unified dialog (same behavior as clicking the card body)
- [ ] The type switcher is visible in the edit dialog; switching to TASK/ROUTINE/GOAL converts the idea
- [ ] Saving the dialog with IDEA type updates the idea in place; dialog closes
- [ ] DELETE button shows a "Permanently delete?" confirmation row with CONFIRM and CANCEL buttons
- [ ] CONFIRM deletes the idea; CANCEL dismisses the confirmation without deleting
- [ ] PROMOTE TO COMMITMENT opens the Add Commitment sheet with the idea's title and notes pre-filled
- [ ] If the idea had a linked area, the commitment dialog's area selector is pre-selected to that area
- [ ] If the idea had a linked objective, promoting it auto-links the created commitment to that objective
- [ ] Submitting the promoted commitment deletes the idea from the ideas list
- [ ] Cancelling the commitment sheet leaves the idea intact

**Per-area view (area detail page)**

- [ ] AREA detail page shows an "INTELLIGENCE" section below the Objectives section
- [ ] Only ideas linked to that area appear in the per-area intelligence section
- [ ] "MAKE IDEA" button in the embedded view pre-fills the area; no area selector is shown
- [ ] If the area has active objectives, the Linked Objective dropdown appears in the add form
- [ ] Ideas added from the per-area view are visible in the global Ideas view

### Bug regressions

- [ ] Skip action (recurring commitment) fires NO Whitaker/Briggs dialogue (regression: NEW-2)
- [ ] Menu → "Report a Neighbor": menu closes immediately; share sheet appears (or link is copied) (regression: NEW-3)
- [ ] Patriot score header shows streak when streak is 0 — e.g. "0d · SUSPECTED COMMUNIST" (regression: Bug #8)
- [ ] Daily view: expand BACKLOG band → previously-expanded time-of-day slots within other bands stay expanded (regression: NEW-4)
- [ ] Area detail: Goals section header reads "GOALS" (or skin's goalPlural), not "OBJECTIVES" (regression: issue #7)
- [ ] Area detail: Ideas section header reads "IDEAS" (or skin's ideaPlural), not "INTELLIGENCE" (regression: issue #7)
- [ ] BCR skin: editing a goal shows "AMEND GOAL" / "SAVE GOAL", not "AMEND OBJECTIVE" (regression: issue #8)
- [ ] BCR skin: delete goal shows "DELETE GOAL" / "PERMANENTLY DELETE THIS GOAL?" (regression: issue #8)
- [ ] Linked goal selector stays visible in the commitment dialog even when the selected area has no goals (regression: issue #28)
- [ ] Monthly multi-dom task (e.g. 1st + 15th): completing on the 1st hides the task until the 15th (regression: issue #3)
- [ ] Quarterly multi-dom task: same hide-until-next-dom behavior (regression: issue #3)

### Persistence

- [ ] Hard refresh: state survives
- [ ] Close tab + reopen: state survives
- [ ] DevTools → Application → Local Storage → key `bureau_v1` is JSON

### PWA / install

- [ ] `/manifest.webmanifest` returns 200
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] Install button shows in browser address bar
- [ ] Installed app launches standalone
- [ ] Offline (DevTools → Network → Offline): app still loads + works
- [ ] Home screen icon: white eagle on navy, no halo (uninstall + reinstall after icon changes)
- [ ] Install dialog text: "BCR Clear" / Home screen label: "BCR Clear"
