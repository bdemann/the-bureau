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
- [ ] Hamburger (☰) opens slide-in menu from the right
- [ ] Menu → Daily navigates to daily view and closes menu
- [ ] Menu → Operations navigates to operations view and closes menu
- [ ] Menu → Report a Neighbor triggers share sheet (or copies link)
- [ ] Clicking outside the menu panel closes it
- [ ] Day-start dialogue appears on first load each day; dismiss closes it

### Operations view (project list)

- [ ] Empty: shows `NO ACTIVE OPERATIONS` stamp
- [ ] `+ OPEN NEW OPERATION` opens the operation wizard
- [ ] Wizard cancel (with no data entered) closes immediately without creating anything
- [ ] Clicking outside the wizard with data entered shows "DISCARD CHANGES?" confirmation
- [ ] Confirmation "Keep editing" returns to the wizard with all data intact
- [ ] Confirmation "Discard" closes the wizard and clears all state
- [ ] Click card → project-detail opens
- [ ] Multiple projects render
- [ ] A project where all `kind=task` directives are completed shows "CLEARED" (regardless of routines)
- [ ] A project with only routines (no tasks) never shows "CLEARED"
- [ ] A project with a mix: CLEARED only when the task directives are all done

### Operation creation wizard

- [ ] Step 1: Continue disabled until operation name is typed
- [ ] Step 1: Description is optional (Continue works with empty description)
- [ ] Step 1: Color picker selects a highlight color; swatch updates visually
- [ ] Step 1: "Quick create (no routines)" skips to project creation with no routines
- [ ] Step 2: Brainstorm textarea accepts free text; parsed names preview below (split on newlines and commas, empties stripped)
- [ ] Step 2: "Create without routines" creates the project immediately with no routines
- [ ] Step 2: "Configure N routines →" advances to step 3 with the parsed list
- [ ] Step 3: Routine title pre-filled from brainstorm text; editable
- [ ] Step 3: Tier T1–T4 grid selects consequence tier
- [ ] Step 3: Default cadence is Daily
- [ ] Step 3: Cadence grid (Daily / Weekly / Monthly / Quarterly / Yearly) is selectable
- [ ] Step 3 Weekly: day-of-week multi-select appears; multiple days can be toggled
- [ ] Step 3 Weekly: default day selected is today's day of the week
- [ ] Step 3 Monthly: "Day of month" / "Nth weekday" toggle appears
- [ ] Step 3 Monthly (day of month): numeric input accepts 1–31
- [ ] Step 3 Monthly (Nth weekday): 1st/2nd/3rd/4th/Last picker + day-of-week picker appear
- [ ] Step 3 Monthly (Nth weekday): anchor summary reads "The 2nd Sunday of each month" etc.
- [ ] Step 3: Time-of-day grid (Anytime / Morning / Afternoon / Evening) is selectable
- [ ] Step 3: "Create with routines so far" creates the operation using only configured routines up to this point
- [ ] Step 3: "Next Routine →" advances to the next routine without creating yet
- [ ] Step 3: Last routine shows "Create Operation ✓" instead of Next
- [ ] After wizard completes: operation card appears in dashboard
- [ ] After wizard completes: routines appear with ROUTINE chip in project detail

### Project-detail

- [ ] Header breadcrumb shows project name
- [ ] Back button returns to Operations
- [ ] Empty state shows "No active directives…" + Whitaker quote
- [ ] `+ FILE NEW DIRECTIVE` opens dialog
- [ ] Active tasks list shows incomplete + un-snoozed (regardless of due date)
- [ ] Snoozed list shows separately when applicable
- [ ] Cleared tasks toggle (Show/Hide N cleared) works
- [ ] EDIT OPERATION and DECOMMISSION OPERATION buttons visible at bottom of project detail
- [ ] Clicking EDIT OPERATION opens inline form pre-filled with current name, briefing, and color
- [ ] Color swatch matching current project color is pre-selected
- [ ] Changing name/description/color and clicking SAVE CHANGES persists the updates
- [ ] Saved operation name and color reflect immediately in the project-detail header
- [ ] CANCEL in edit form closes the form with no changes
- [ ] Cannot save with blank operation name (SAVE CHANGES does nothing until name is non-empty)
- [ ] Clicking DECOMMISSION OPERATION shows inline confirmation ("DECOMMISSION" / "CANCEL")
- [ ] Cancelling confirmation returns to normal view with no changes
- [ ] Confirming decommission removes the project and all its tasks, then navigates back to Operations

### Filing directives — routine vs directive kind

- [ ] Add-task dialog defaults to DIRECTIVE kind selected
- [ ] ROUTINE / DIRECTIVE segmented toggle visible when creating (hidden in edit mode)
- [ ] Selecting ROUTINE forces "Recurring" on and hides the recurring checkbox
- [ ] Selecting ROUTINE hides the end-condition section entirely
- [ ] Selecting ROUTINE changes sheet title to "FILE NEW ROUTINE" and submit button to "COMMIT ROUTINE"
- [ ] Selecting DIRECTIVE shows sheet title "FILE NEW DIRECTIVE" and submit button "FILE DIRECTIVE"
- [ ] Editing an existing routine shows "AMEND ROUTINE"; editing a directive shows "AMEND DIRECTIVE"
- [ ] Directives with `kind=routine` show a ROUTINE chip in the task-item card

### Task creation — one-time

- [ ] New directive form defaults: recurring OFF, window type Hard, due date = today
- [ ] Title required (FILE DIRECTIVE disabled until typed)
- [ ] Description optional
- [ ] Tier 1–4 buttons toggle; help text updates per tier
- [ ] Flexible / Hard date toggle works
- [ ] Hard requires a date; flexible date is optional
- [ ] Date picker visible (not recurring)
- [ ] Submit creates task; dialog closes; task appears in active list
- [ ] Cancel closes without creating

### Task creation — recurring (weekly day-of-week, multi-select)

- [ ] Toggle "Recurring task" on
- [ ] Cadence: Weekly
- [ ] Day-of-week picker appears (Sun–Sat); date picker hidden
- [ ] Multiple days can be toggled on/off independently
- [ ] Default is Mon–Fri selected
- [ ] Anchor summary updates with readable description:
  - 5 weekdays → "Every weekday (Mon–Fri)."
  - 6 days without Sun → "Every day except Sunday."
  - 6 days without Sat → "Every day except Saturday."
  - 7 days → "Every day."
  - Custom → "Mon, Wed, Fri." style list
- [ ] FILE DIRECTIVE disabled when no days selected
- [ ] **Single day selected, today matches**: first occurrence = today
- [ ] **Single day selected, today doesn't match**: first occurrence = next occurrence
- [ ] **Multi-day, complete on Wed (Mon/Wed/Fri)**: next occurrence = Fri (same week)
- [ ] **Multi-day, complete on Fri (Mon/Wed/Fri)**: next occurrence = Mon (next week)
- [ ] Existing task with multi-day schedule pre-fills correctly in edit dialog

### Task creation — recurring (monthly, day-of-month)

- [ ] Cadence: Monthly → "Anchor" toggle appears
- [ ] Day-of-month input accepts 1–31; rejects out-of-range
- [ ] Anchor summary shows "The Nth of each month"
- [ ] Submit creates task; first occurrence is this month's that-day if it
      hasn't passed, else next month's
- [ ] Card label `Day N of each month · next {date}`

### Task creation — recurring (monthly, Nth weekday)

- [ ] Switch to "Nth weekday" mode
- [ ] Ordinal (1st/2nd/3rd/4th/Last) and day-of-week pickers appear
- [ ] Anchor summary shows "The 3rd Thursday of each month"
- [ ] **This month's Nth-dow already passed**: first occurrence = next month's
- [ ] **Not yet passed**: first occurrence = this month's
- [ ] **Last weekday**: works in both 4-Thursday and 5-Thursday months
- [ ] Card label `3rd Thursday of each month · next {date}`

### Task creation — multiple-per-period

- [ ] Cadence: Multiple per week (or per-day/month/quarter/year)
- [ ] "Times per period" input appears; accepts 2–99
- [ ] Date picker still visible (multi-per uses dates, not anchors)
- [ ] Submit creates task with `frequencyPerPeriod`
- [ ] Card shows `0 / 3 this week` progress chip

### Task completion

- [ ] One-time: ✓ → task moves to "cleared" (collapsed)
- [ ] Standard recurring: ✓ → suggestedDate updates to next period
- [ ] Multi-per-period: ✓ → progress chip increments
- [ ] When multi-per count reaches target: task hides until next period
- [ ] Score goes up by tier-weighted amount
- [ ] Streak increments
- [ ] Sometimes Whitaker (or Briggs) speaks

### Task deletion

- [ ] In edit mode (click any task card), "TERMINATE DIRECTIVE" button appears at the bottom of the dialog
- [ ] Clicking TERMINATE DIRECTIVE shows inline confirmation: "PERMANENTLY TERMINATE THIS DIRECTIVE?" with TERMINATE and CANCEL buttons
- [ ] CANCEL in confirmation returns to the edit form without deleting
- [ ] Confirming TERMINATE removes the task and closes the dialog
- [ ] Deleted task no longer appears in project-detail or daily view
- [ ] TERMINATE DIRECTIVE button is NOT present when creating a new directive (add mode)

### Task snooze

- [ ] Snooze button → snoozedUntil = +24h, badge appears
- [ ] Task moves to Snoozed section
- [ ] Snooze count escalates color (yellow → orange → red)
- [ ] Score decreases (tier-weighted)
- [ ] Hard-date task whose date is today: button reads "Cannot snooze" and is disabled
- [ ] At 6 snoozes (any tier), Briggs takes over
- [ ] Whitaker dialogue escalates with count

### Un-snooze

- [ ] In Snoozed list → "Wake up" moves task back to Active
- [ ] Snooze count *retained* (un-snooze ≠ reset)

### Daily view

- [ ] Mandatory: tasks due today / hard-overdue / cadence=daily
- [ ] Suggested: flexible tasks past suggestedDate but inside window (regression: suggestedDate = today shows "Due today", not "Suggested [date]")
- [ ] Radar: tasks ≤ 3 days from hard date, or window % low
- [ ] Backlog: everything else (collapsed by default — count visible)
- [ ] Empty Mandatory: "No mandatory tasks today. Agent Whitaker approves."
- [ ] Each card shows project name above title (cross-project context)
- [ ] When tasks span multiple time-of-day slots within a band, each slot has a collapsible header (label · count · chevron)
- [ ] The slot matching the current time of day starts expanded; others start collapsed
- [ ] Tapping a slot header toggles it open/closed
- [ ] Switching to background and returning after the time slot changes resets the default to the new slot
- [ ] Active use (app stays open through a slot transition) does NOT collapse open sections
- [ ] Complete/snooze actions work from daily view

### Recurring end conditions

- [ ] "Task has an end condition" checkbox is hidden for one-time tasks
- [ ] Checkbox appears inside the recurring section
- [ ] Checking it reveals "N completions" / "A date" toggle
- [ ] "N completions" shows a number input; "A date" shows a date picker
- [ ] After N completions: task disappears permanently (no more periods)
- [ ] After date: completing on the end date permanently closes the task
- [ ] After date: task is retired on next app load after end date passes (even if not completed)
- [ ] Edit dialog pre-fills end condition from an existing task with one set

### Recurrence rollover

- [ ] Daily task: complete it, advance device clock 1 day, reload — task back, fresh
- [ ] Weekly fixed (anchored Thursday): complete it, next-week reload — suggestedDate is next Thursday
- [ ] Weekly rolling: complete on a different day — next due = completion + 7 days
- [ ] Multi-per-week: complete 1× this week, advance week — completionsThisPeriod resets to 0

### Bug regressions

- [ ] Skip action (recurring task) fires NO Whitaker/Briggs dialogue (regression: NEW-2)
- [ ] Menu → "Report a Neighbor": menu closes immediately; share sheet appears (or link is copied) (regression: NEW-3)
- [ ] Patriot score header shows streak when streak is 0 — e.g. "0d · SUSPECTED COMMUNIST" (regression: Bug #8)
- [ ] Daily view: expand BACKLOG band → previously-expanded time-of-day slots within other bands stay expanded (regression: NEW-4)

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
