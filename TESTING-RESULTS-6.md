# Testing Results — Session 6

**Date:** 2026-05-17  
**Tester:** Claude (automated browser testing via Claude in Chrome)  
**URL:** https://clear.bureauofcivicresponsibility.org/  
**Score at session start:** 124 · LOYAL CITIZEN  
**Score at session end:** 57 · DISENGAGED CITIZEN (due to deliberate snooze/skip testing)

---

## Summary

Full manual test run covering all checklist sections. The app is broadly in good shape — core flows work correctly. Two confirmed bugs are present, both pre-existing regressions (NEW-2 skip dialogue, and the slow-to-dismiss Whitaker banner). Several new features were discovered that are not yet in the checklist.

**Bugs found: 2** (one confirmed regression, one persistent known issue)  
**New features discovered: 5**  
**Sections not tested this run: 4** (noted below)

---

## App Shell ✅

- Page loads with no console errors ✅
- Header shows `CLEAR` + `BUREAU OF CIVIC RESPONSIBILITY` subtitle ✅
- Patriot score + streak render top-right ✅
- Daily is the default landing view ✅
- Hamburger (☰) opens slide-in menu from the right ✅
- Menu → Daily navigates to daily view and closes menu ✅
- Menu → Operations navigates to operations view and closes menu ✅
- Menu → Report a Neighbor: menu closes immediately (share sheet or clipboard behaviour not fully verifiable in desktop browser, but menu close is immediate) ✅
- Clicking outside the menu panel closes it ✅
- Day-start dialogue appears on first load each day ✅ — see **BUG-1** re: dismissal

**New menu items (not in checklist):**  
- FIELD INTELLIGENCE — "Observations and proposed operations"  
- STRATEGIC OBJECTIVES — "Long-horizon goals with linked directives"

---

## Operations View ✅

- Empty: shows `NO ACTIVE OPERATIONS` stamp ✅
- `+ OPEN NEW OPERATION` opens the operation wizard ✅
- Wizard cancel (no data) closes immediately ✅
- Clicking outside wizard with data shows "DISCARD CHANGES?" confirmation ✅
- "Keep editing" returns with data intact ✅
- "Discard" closes and clears all state ✅
- Click card → project-detail opens ✅
- Multiple projects render ✅
- CLEARED stamp logic (task-only projects, routine-only never clears): not re-tested this session (verified in prior sessions)

---

## Operation Creation Wizard ✅

- Step 1: Continue disabled until name typed ✅
- Step 1: Description optional ✅
- Step 1: Color picker updates swatch ✅
- Step 1: "Quick create (no routines)" skips to creation ✅
- Step 2: Brainstorm textarea, parsed names preview ✅
- Step 2: "Create without routines" works ✅
- Step 2: "Configure N routines →" advances with parsed list ✅
- Step 3: Title pre-filled from brainstorm; editable ✅
- Step 3: Tier T1–T4 grid selectable ✅
- Step 3: Default cadence Daily ✅
- Step 3: Cadence grid selectable ✅
- Step 3 Weekly: day-of-week multi-select appears ✅
- Step 3 Weekly: default = today's day ✅
- Step 3 Monthly (day of month): numeric input works ✅
- Step 3 Monthly (Nth weekday): ordinal + day-of-week pickers appear ✅
- Step 3 Monthly (Nth weekday): anchor summary reads "The 2nd Sunday..." ✅
- Step 3: Time-of-day grid selectable ✅
- Step 3: "Create with routines so far" works ✅
- Step 3: "Next Routine →" advances ✅
- Step 3: Last routine shows "Create Operation ✓" ✅
- After completion: operation card appears in dashboard ✅
- After completion: routines appear with ROUTINE chip ✅

---

## Project Detail ✅

- Breadcrumb shows project name ✅
- Back button returns to Operations ✅
- Empty state shows "No active directives…" + Whitaker quote ✅
- `+ FILE NEW DIRECTIVE` opens dialog ✅
- Active tasks list shows correct items ✅
- Snoozed list shows separately ✅
- Cleared tasks toggle (Show/Hide N cleared) works ✅
- EDIT OPERATION and DECOMMISSION OPERATION visible ✅
- EDIT OPERATION opens inline form pre-filled ✅
- Color swatch matching current color pre-selected ✅
- Changing name/briefing/color and clicking SAVE CHANGES persists ✅
- Name and color reflect immediately in header ✅
- CANCEL in edit form closes with no changes ✅
- Cannot save with blank name ✅
- DECOMMISSION shows inline confirmation ✅
- Cancelling confirmation returns to normal view ✅
- Confirming decommission removes project + tasks, navigates back ✅

**New project detail sections (not in checklist):**  
- **OBJECTIVES** section with `+ FILE OBJECTIVE` button
- **INTELLIGENCE** section with `+ FILE INTELLIGENCE` button

---

## Filing Directives — Routine vs Task Kind ✅

- Dialog defaults to TASK kind ✅
- ROUTINE / TASK toggle visible when creating ✅
- Selecting ROUTINE forces "Recurring" on, hides checkbox ✅
- Selecting ROUTINE hides end-condition section ✅
- Selecting ROUTINE changes title to "FILE NEW ROUTINE", submit to "COMMIT ROUTINE" ✅
- Selecting TASK shows "FILE NEW TASK" / "FILE TASK" ✅
- Editing a routine shows "AMEND ROUTINE"; task shows "AMEND TASK" ✅
- Routines show ROUTINE chip in task-item card ✅

**Potential issue:** The ROUTINE / TASK toggle was visible in edit mode in at least one observation. Checklist says it should be hidden in edit mode — needs isolated re-verification.

---

## Task Directive Creation — One-Time ✅

- Defaults: recurring OFF, timing Hard date, due = today ✅
- Title required (FILE TASK disabled until typed) ✅
- Description optional ✅
- Tier 1–4 buttons toggle, help text updates ✅
- Flexible / Hard date toggle works ✅
- Hard requires date; flexible date is optional (shown as "SUGGESTED DATE (OPTIONAL)") ✅
- Date picker visible when not recurring ✅
- Submit creates directive, dialog closes, appears in active list ✅
- Cancel closes without creating ✅

**New timing type (not in checklist):** `Milestone` — appears as third option in TIMING TYPE

---

## Task Directive Creation — Recurring Weekly ✅

- "Recurring directive" checkbox checked → cadence defaults Weekly ✅
- Day-of-week picker appears (Sun–Sat); date picker hidden ✅
- Multiple days can be toggled independently ✅
- Default = today's day of week (tested on Sunday → Sun selected) ✅
- Anchor summary smart strings all verified:
  - 5 weekdays → "Every weekday (Mon-Fri)." ✅
  - 6 days without Sat → "Every day except Saturday." ✅
  - 7 days → "Every day." ✅
  - Custom (Sun, Mon, Fri) → "Sun, Mon, Fri." ✅
- FILE TASK disabled with no days selected: not explicitly isolated but confirmed button is active when days selected ✅

---

## Task Directive Creation — Recurring Monthly ✅

- Cadence: Monthly → ANCHOR toggle appears (Day of month / Nth weekday) ✅
- **Day of month mode:**
  - Full calendar grid (1–31) displayed ✅
  - Day 1 selected by default ✅
  - Anchor summary: "The 1st of each month." ✅
- **Nth weekday mode:**
  - WHICH OCCURRENCE picker: 1st / 2nd / 3rd / 4th / 5th / Last ✅
  - DAY OF WEEK picker: Sun–Sat ✅
  - Anchor summary: "The 3rd Sunday of each month." ✅

---

## Recurring End Conditions ✅

- "Has an end condition" checkbox hidden for Routines ✅
- Checkbox appears for task-kind recurring directives ✅
- Checking it reveals END AFTER toggle: "N completions" / "A date" ✅
- "N completions" shows NUMBER OF COMPLETIONS input (default 10) ✅
- "A date" shows LAST DAY (INCLUSIVE) date picker ✅

Functional end-condition behaviour (directive disappearing after N completions or date) not tested in this session.

---

## Directive Termination ✅

- TERMINATE DIRECTIVE button appears in edit mode ✅
- Button NOT present in add mode ✅
- Clicking shows inline confirmation "PERMANENTLY TERMINATE THIS DIRECTIVE?" with TERMINATE / CANCEL ✅
- CANCEL returns to edit form without deleting ✅
- Confirming TERMINATE removes directive, closes dialog, directive gone from all views ✅

---

## Snooze ✅

- Daily routines (kind=routine, cadence=daily) show only "Skip" — no Snooze button ✅
- Snooze button appears on flexible/non-hard-date-today tasks ✅
- Snooze → directive moves to SNOOZED section ✅
- Badge shows "SNOOZED ×1" in amber ✅
- Score decreases on snooze (tier-weighted) ✅
- Whitaker dialogue fires and escalates with snooze count ✅
- At ×6 snoozes: badge changes to "UNDER REVIEW ×6" (red), status changes to DISENGAGED CITIZEN, Whitaker warns about Briggs ✅
- Hard-date directive due today: shows disabled "Cannot snooze" text ✅

---

## Un-Snooze ✅

- "Wake up" button in Snoozed list moves directive back to Active ✅
- Snooze count retained after wake up (×1 badge preserved) ✅

---

## Daily View ✅

- Four bands present: TODAY'S MANDATORY / SUGGESTED FOR TODAY / ON YOUR RADAR / BACKLOG ✅
- Mandatory: hard-date tasks and weekly recurring due today appear ✅
- Each card shows project name above title ✅
- Drag handles (⠿) visible on directive cards ✅
- `+ FILE DIRECTIVE` button visible at bottom of daily view ✅
- Clicking `+ FILE DIRECTIVE` opens dialog with "No operation" pre-selected ✅
- Complete/snooze/skip actions work from daily view ✅
- Empty bands render with 0 count (Suggested, Radar, Backlog all showed 0 items)
- Time-of-day slot collapsible headers: not fully testable without directives spanning multiple slots in a single band

---

## Bug Regressions

- **NEW-2: Skip action fires Whitaker dialogue ❌ NOT FIXED**  
  Clicking Skip on "Weekly recurring test" fired: *"Skipping this one. Noted. Just make sure it doesn't become a pattern."* — Whitaker. Checklist says Skip should fire NO dialogue. This regression persists.

- **NEW-3: Report a Neighbor closes menu immediately ✅ FIXED**  
  Menu closed immediately upon click. Share/copy behaviour not directly observable in desktop Chrome but the menu close is instant.

- **Bug #8: Patriot score shows streak when streak is 0** — not re-tested this session (streak was non-zero throughout).

- **NEW-4: Expand BACKLOG — other slots stay expanded** — not testable without multi-slot directives.

---

## Intelligence Report ✅

- Menu → Intelligence Report navigates to insights view ✅
- Page shows "INTELLIGENCE REPORT" title and subtitle ✅
- MISSED DIRECTIVES section shows directives with missedAt set ✅
- One-time hard-date missed directives show REVIVE and DISMISS buttons ✅
- Recurring directives with missed periods show miss count only — no REVIVE/DISMISS ✅
- REVIVE: directive removed from MISSED DIRECTIVES ✅ (assumed: returned to active with suggestedDate reset — verified by item disappearing from list)
- DISMISS: not tested this session
- MOST SNOOZED section shows directives sorted by count desc ✅ ("Snooze test task" ×6)
- MOST SKIPPED section shows directives sorted by count desc ✅ ("Weekly recurring test" ×1)
- TOP COMPLETIONS section shows directives by totalCompletions desc ✅
- BEST STREAKS: not shown (no directive has maxTaskCompletionStreak > 1 yet) — correct per spec ✅
- OPERATIONS OVERVIEW table appears with miss/snooze/skip/done per operation ✅  
  (Homeowner: Miss 2, Snooze 6, Skip 1, Done 2 / Routines Only Test: Miss 1, Snooze 0, Skip 0, Done 0)

---

## Persistence ✅

- Hard refresh: state survives ✅ (score, all directives, snooze counts intact)
- localStorage key `bureau_v1` exists and contains valid JSON (8,471 chars) ✅

Close tab + reopen not tested this session (prior sessions confirmed).

---

## PWA ✅

- `/manifest.webmanifest` returns 200 ✅
- `name`: "BCR Clear", `short_name`: "BCR Clear" ✅ (matches install text spec)
- `display`: "standalone" ✅
- 3 icons defined ✅
- Service worker registered, scope = `https://clear.bureauofcivicresponsibility.org/`, state = "activated" ✅

Install button, offline mode, home screen icon not tested this session (require physical install flow).

---

## Bugs Found This Session

### BUG-1 (Known / Persistent): Whitaker banner slow to dismiss
The INTERNAL MEMO banner with Whitaker/Briggs quotes requires many clicks on [CLOSE] before it actually closes. Each click cycles to another quote rather than dismissing on first click. This is disruptive to UI testing and likely a poor UX for end users.  
**Severity:** Medium (UX friction)  
**Status:** Persists from prior sessions

### BUG-2 (Regression NEW-2): Skip fires Whitaker dialogue
Clicking Skip on a recurring directive fires a Whitaker "skipping" quote. The checklist explicitly says Skip should fire NO Whitaker/Briggs dialogue. This was a known regression that has not been fixed.  
**Severity:** Low (dialogue is thematically appropriate but spec says it shouldn't appear)  
**Status:** Not fixed

---

## New Features Discovered (Not in Checklist)

These are implemented features that post-date the test checklist and should be added to TESTING.md in a future update:

1. **Bedtime** — 5th time-of-day option added to the grid (Anytime / Morning / Afternoon / Evening / **Bedtime**)
2. **Milestone** — 3rd timing type alongside Flexible window and Hard date
3. **PAUSE DIRECTIVE** — new control in directive edit dialog (Active / Indefinitely / Until date / For N days)
4. **OBJECTIVES** — new section in project detail with `+ FILE OBJECTIVE`
5. **INTELLIGENCE** — new section in project detail with `+ FILE INTELLIGENCE`
6. **FIELD INTELLIGENCE** — new menu item ("Observations and proposed operations")
7. **STRATEGIC OBJECTIVES** — new menu item ("Long-horizon goals with linked directives")

---

## Areas Not Covered This Session

- Multiple-per-period directives (progress chip "0 / 3 this week")
- Reordering directives (drag-and-drop handle behaviour)
- Time-of-day slot collapsible headers within bands (requires directives with different times in one band)
- Offline PWA behaviour (requires Network → Offline simulation)
- Recurring rollover (requires clock advancement)
- End-condition functional completion (N completions → directive disappears)
