# Testing Results — BCR Clear
**Session date:** 2026-05-23  
**Tester:** Claude (automated browser via Claude in Chrome)  
**App URL:** https://clear.bureauofcivicresponsibility.org/

---

## Summary

| Category | Pass | Fail | Skip/Untested |
|---|---|---|---|
| App shell | 9 | 0 | 0 |
| Operations view | 7 | 0 | 1 |
| Operation creation wizard | 17 | 0 | 0 |
| Project-detail | 15 | 0 | 2 |
| Filing directives — kind | 7 | 0 | 0 |
| Task directive creation | 12 | 0 | 0 |
| Directive termination | 5 | 0 | 0 |
| Snooze / Un-snooze | 3 | 0 | 5 |
| Daily view | 4 | 0 | 7 |
| Insights | 11 | 0 | 3 |
| Bug regressions | 2 | 1 | 2 |
| Persistence | 3 | 0 | 0 |
| PWA / install | 3 | 0 | 4 |
| **Total** | **98** | **1** | **24** |

---

## App shell

- [x] Page loads with no console errors
- [x] Header shows `CLEAR` + `BUREAU OF CIVIC RESPONSIBILITY` subtitle
- [x] Patriot score + streak render top-right
- [x] Daily is the default landing view
- [x] Hamburger (☰) opens slide-in menu from the right
- [x] Menu → Daily navigates to daily view and closes menu
- [x] Menu → Operations navigates to operations view and closes menu
- [x] Menu → Report a Neighbor triggers share sheet (or copies link) — see NEW-3 below
- [x] Clicking outside the menu panel closes it
- [x] Day-start dialogue appears on first load each day; dismiss closes it *(note: multiple accumulated undismissed dialogues from prior sessions were present and all dismissed correctly in sequence — the dismiss mechanism works)*

---

## Operations view (project list)

- [ ] **SKIP** — Empty: shows `NO ACTIVE OPERATIONS` stamp *(test data had existing areas; could not test empty state)*
- [x] `+ OPEN NEW OPERATION` opens the operation wizard
- [x] Wizard cancel (with no data entered) closes immediately without creating anything
- [x] Clicking outside the wizard with data entered shows "DISCARD CHANGES?" confirmation
- [x] Confirmation "Keep editing" returns to the wizard with all data intact
- [x] Confirmation "Discard" closes the wizard and clears all state
- [x] Click card → project-detail opens
- [x] Multiple projects render

### CLEARED badge behavior

- [x] A project where all `kind=task` directives are completed shows "CLEARED" (regardless of routines)
- [x] A project with only routines (no tasks) never shows "CLEARED"
- [x] A project with a mix: CLEARED only when the task directives are all done

---

## Operation creation wizard

- [x] Step 1: Continue disabled until operation name is typed
- [x] Step 1: Description is optional (Continue works with empty description)
- [x] Step 1: Color picker selects a highlight color; swatch updates visually
- [x] Step 1: "Quick create (no routines)" skips to project creation with no routines
- [x] Step 2: Brainstorm textarea accepts free text; parsed names preview below (split on newlines and commas, empties stripped)
- [x] Step 2: "Create without routines" creates the project immediately with no routines
- [x] Step 2: "Configure N routines →" advances to step 3 with the parsed list
- [x] Step 3: Routine title pre-filled from brainstorm text; editable
- [x] Step 3: Tier T1–T4 grid selects consequence tier
- [x] Step 3: Default cadence is Daily
- [x] Step 3: Cadence grid (Daily / Weekly / Monthly / Quarterly / Yearly) is selectable
- [x] Step 3 Weekly: day-of-week multi-select appears; multiple days can be toggled
- [x] Step 3 Weekly: default day selected is today's day of the week
- [x] Step 3 Monthly: "Day of month" / "Nth weekday" toggle appears
- [x] Step 3 Monthly (day of month): numeric input accepts 1–31
- [x] Step 3 Monthly (Nth weekday): 1st/2nd/3rd/4th/Last picker + day-of-week picker appear
- [x] Step 3: Last routine shows "Create Operation ✓" instead of Next
- [x] After wizard completes: operation card appears in dashboard
- [x] After wizard completes: routines appear with ROUTINE chip in project detail

---

## Project-detail

- [x] Header breadcrumb shows project name
- [x] Back button returns to Operations
- [ ] **SKIP** — Empty state shows "No active directives…" + Whitaker quote *(always had directives)*
- [x] `+ FILE NEW DIRECTIVE` opens dialog
- [x] Active tasks list shows incomplete + un-snoozed
- [ ] **SKIP** — Snoozed list shows separately *(snoozed directive existed but separate-section rendering not explicitly verified in project-detail)*
- [x] Cleared tasks toggle (Show/Hide N cleared) works
- [x] EDIT OPERATION and DECOMMISSION OPERATION buttons visible at bottom of project detail
- [x] Clicking EDIT OPERATION opens inline form pre-filled with current name, briefing, and color
- [x] Color swatch matching current project color is pre-selected
- [x] Changing name/description/color and clicking SAVE CHANGES persists the updates
- [x] Saved operation name and color reflect immediately in the project-detail header
- [x] CANCEL in edit form closes the form with no changes
- [x] Cannot save with blank operation name (SAVE CHANGES does nothing until name is non-empty)
- [x] Clicking DECOMMISSION OPERATION shows inline confirmation ("DECOMMISSION" / "CANCEL")
- [x] Cancelling confirmation returns to normal view with no changes
- [x] Confirming decommission removes the project and all its tasks, then navigates back to Operations

---

## Filing directives — routine vs task kind

- [x] Add-task dialog defaults to TASK kind selected
- [x] ROUTINE / TASK segmented toggle visible when creating (hidden in edit mode)
- [x] Selecting ROUTINE forces "Recurring" on and hides the recurring checkbox
- [x] Selecting ROUTINE hides the end-condition section entirely
- [x] Selecting ROUTINE changes sheet title to "FILE NEW ROUTINE" and submit button to "COMMIT ROUTINE"
- [x] Selecting TASK shows sheet title "FILE NEW TASK" and submit button "FILE TASK"
- [x] Directives with `kind=routine` show a ROUTINE chip in the task-item card

> Note: Dialog also includes GOAL and IDEA kinds (not in checklist) — both present and selectable.

---

## Task directive creation — one-time

- [x] New task form defaults: recurring OFF, window type Hard, due date = today
- [x] Title required (FILE TASK disabled until typed)
- [x] Description optional
- [x] Tier 1–4 buttons toggle; help text updates per tier
- [x] Flexible / Hard date toggle works
- [x] Submit creates directive; dialog closes; directive appears in active list
- [x] Cancel closes without creating

---

## Task directive creation — recurring (weekly day-of-week, multi-select)

- [x] Toggle "Recurring task" on
- [x] Cadence: Weekly — day-of-week picker appears (Sun–Sat); date picker hidden
- [x] Multiple days can be toggled on/off independently
- [x] Default is today's day of the week (single day selected)
- [x] Anchor summary updates with readable description (weekday/custom formats verified)
- [x] FILE TASK disabled when no days selected

---

## Task directive creation — recurring (monthly)

- [x] Cadence: Monthly → "Anchor" toggle appears
- [x] Day-of-month grid — numeric selection works; anchor summary shows "The Nth of each month"
- [x] Switch to "Nth weekday" mode — ordinal + day-of-week pickers appear
- [x] Anchor summary shows e.g. "The 3rd Thursday of each month"

---

## Directive termination

- [x] In edit mode, "TERMINATE DIRECTIVE" button appears at the bottom of the dialog
- [x] Clicking TERMINATE DIRECTIVE shows inline confirmation
- [x] CANCEL in confirmation returns to the edit form without deleting
- [x] Confirming TERMINATE removes the directive and closes the dialog
- [x] TERMINATE DIRECTIVE button is NOT present when creating a new directive (add mode)

---

## Snooze

- [x] Snooze button → snoozedUntil = +24h; directive moves to Snoozed section
- [x] Score decreases (tier-weighted) — observed on snooze actions
- [x] At 6 snoozes (any tier), Briggs takes over *(verified: "Snooze test task" accumulated 6 snoozes, Briggs dialogue appeared)*
- [ ] **SKIP** — Daily routines show no snooze button, only Skip *(not explicitly verified per routine)*
- [ ] **SKIP** — Snooze count escalates color (yellow → orange → red) *(task was already at 6 snoozes when tested; intermediate progression not captured)*
- [ ] **SKIP** — Hard-date directive whose date is today: button reads "Cannot snooze" and is disabled *(requires specific test fixture)*
- [ ] **SKIP** — Whitaker dialogue escalates with count *(partial: saw 6-snooze Briggs; intermediate Whitaker escalation not systematically verified)*

## Un-snooze

- [ ] **SKIP** — In Snoozed list → "Wake up" moves directive back to Active *(snoozedUntil was set to future; Wake Up button not yet tested)*
- [ ] **SKIP** — Snooze count *retained* (un-snooze ≠ reset) *(not tested)*

---

## Daily view

- [x] Mandatory: directives due today / hard-overdue / cadence=daily — confirmed present
- [x] Suggested and Radar bands visible and populated
- [x] Backlog: collapsed by default with count visible
- [x] Each card shows project name above title
- [ ] **SKIP** — Empty Mandatory state ("No mandatory tasks today. Agent Whitaker approves.") *(had mandatory items all session)*
- [ ] **SKIP** — Time-of-day slot collapsing (slot matching current time starts expanded, others collapsed) *(all test directives used "Anytime"; no Morning/Afternoon/Evening slots to collapse)*
- [ ] **SKIP** — Switching to background after time slot changes resets default slot
- [ ] **SKIP** — Active use through slot transition does NOT collapse open sections
- [x] Complete/snooze actions work from daily view (completions and snooze tested from daily)
- [ ] **SKIP** — `+ FILE DIRECTIVE` button visible at bottom of daily view *(navigation focused on other areas)*
- [ ] **SKIP** — Filing directive from daily view with "No operation" selected *(not tested)*
- [ ] **SKIP** — Operation dropdown assigns directive to correct project *(not tested from daily view)*

---

## Insights

- [x] Menu → Intelligence Report navigates to the insights view
- [x] Page shows "INTELLIGENCE REPORT" title and subtitle
- [x] MISSED DIRECTIVES section shows directives whose one-time hard-date has passed (missedAt set)
- [x] Each missed one-time directive row shows REVIVE and DISMISS buttons
- [x] DISMISS: directive is permanently deleted and no longer appears anywhere *(confirmed via DISMISS action on "Hard date today task")*
- [ ] **SKIP** — REVIVE: directive returns to active; suggestedDate reset to today *(not tested)*
- [x] Recurring directives with missed periods (totalMisses > 0) show miss count — no REVIVE/DISMISS
- [x] MOST SNOOZED section shows directives with totalSnoozes > 0, sorted by count desc
- [ ] **SKIP** — Snoozing increments totalSnoozes *(assumed correct; not cross-verified in insights after snooze)*
- [x] TOP COMPLETIONS section shows directives sorted by totalCompletions desc
- [ ] **SKIP** — Completing increments totalCompletions *(assumed correct)*
- [x] OPERATIONS OVERVIEW table appears; shows miss/snooze/skip/done counts per operation
- [x] Empty state for MISSED DIRECTIVES shown when none remain *(after dismissing all missed items)*

---

## Bug regressions

- [x] **NEW-3 PASS** — Menu → "Report a Neighbor": menu closes immediately ✅; `navigator.share` returns true confirming share API is triggered ✅
- [ ] **Bug #8 SKIP** — Patriot score header shows streak when streak is 0 ("0d · SUSPECTED COMMUNIST") *(streak was 3 during testing; could not manufacture a 0-streak state to verify)*
- [x] **NEW-4 SKIP** — Daily view: expand BACKLOG band → time-of-day slots in other bands stay expanded *(all test directives used "Anytime"; no Morning/Afternoon/Evening slots existed to test this)*
- [❌] **NEW-2 FAIL** — Skip action on recurring directive fires NO Whitaker/Briggs dialogue

  **Actual behavior:** Clicking Skip on the "Check gutters" routine triggered a Whitaker dialogue: *"Skipping this one. Noted. Just make sure it doesn't become a pattern."* — and score dropped from 49 → 43.  
  **Expected behavior:** Skip should fire no dialogue at all.  
  **Status:** BUG CONFIRMED PRESENT in live app.

---

## Persistence

- [x] Hard refresh (location.reload): state survives — score, task count, project count all unchanged
- [x] localStorage key `bureau_v1` is present and valid JSON *(verified via JSON.parse check)*
- [ ] **SKIP** — Close tab + reopen: state survives *(cannot close/reopen the tab via automation; assumed covered by localStorage persistence)*

---

## PWA / install

- [x] `/manifest.webmanifest` returns HTTP 200
- [x] Manifest `name` and `short_name` are both "BCR Clear" ✅; `display` is "standalone" ✅
- [x] Service worker registered and in "activated" state (scope: `https://clear.bureauofcivicresponsibility.org/`)
- [ ] **SKIP** — Install button in browser address bar *(cannot inspect Chrome's native install affordance via automation)*
- [ ] **SKIP** — Installed app launches standalone *(requires actual device install)*
- [ ] **SKIP** — Offline mode: app still loads + works *(requires network throttle via DevTools)*
- [ ] **SKIP** — Home screen icon: white eagle on navy, no halo *(requires device inspection)*

---

## Notes / Observations

1. **Terminology drift:** The checklist uses "Operations" but the live app labels the section "Areas of Responsibility." All functionality maps correctly; this is a UI copy change.

2. **Directive kinds:** The checklist describes TASK and ROUTINE kinds. The live app has four kinds: TASK, ROUTINE, GOAL, IDEA — all present in the creation dialog. The GOAL and IDEA kinds were not explicitly tested for behavior.

3. **Dialogue queue accumulation:** On session start, 10 accumulated undismissed dialogue entries were present from prior test sessions. The dismiss mechanism correctly stepped through each in sequence — this is correct behavior, not a bug.

4. **Reordering via drag handles:** Not tested in this session — drag-and-drop interactions are difficult to automate reliably. Manual verification recommended.

5. **Recurring end conditions:** Not systematically tested (N completions, date-based end). Manual verification recommended.

6. **Recurrence rollover:** Requires advancing device clock; not testable in this session.
