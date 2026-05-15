# Testing pass — 2026-05-15 (Round 5)

Tested against `https://clear.bureauofcivicresponsibility.org/` (Netlify deploy)
in a Chrome session via Claude in Chrome automation. This pass focused on:

1. **Operation creation wizard** — new section in TESTING.md (all 3 steps)
2. **Routine vs Directive kind system** — new section in TESTING.md
3. **CLEARED badge logic** — updated Operations view checks
4. **Bug regressions** — four explicit regression checks (NEW-2, NEW-3, Bug #8, NEW-4)

---

## SCOPE OF THIS PASS

TESTING.md items added or changed since Round 4:

- Operations view: CLEARED logic (routines-only, directives-only, mixed)
- Operations view: discard confirmation when clicking outside wizard with data
- Operation creation wizard: full 3-step flow
- Filing directives: Routine vs Directive kind toggle and mode-switching behaviour
- Edit dialogs: AMEND ROUTINE vs AMEND DIRECTIVE label, toggle hidden in edit mode
- Bug regressions section: NEW-2, NEW-3, Bug #8, NEW-4 (explicit regression checks)

---

## BUG REGRESSIONS — STATUS

### NEW-2: Skip action fires NO Whitaker/Briggs dialogue — FIXED ✅

**Verified:** Clicked Skip on "Mow the lawn" (routine in TODAY'S MANDATORY).
The task was removed from the list silently. The existing INTERNAL MEMO in the
header was the same message from before the Skip — no new dialogue was
triggered. The snooze_1 regression (Skip firing a Whitaker quote) is resolved.

### NEW-3: Report a Neighbor closes menu immediately — PARTIALLY VERIFIED

**Verified (partial):** Opened BUREAU MENU → clicked REPORT A NEIGHBOR. The
menu dismissed immediately ✅. The Web Share API share dialog cannot be
confirmed via desktop Chrome automation (it triggers a native OS dialog not
captured by screenshot). The stub-with-no-close behaviour from Round 4 is
resolved — at minimum the menu closes on click. Full verification of share
sheet / link-copy requires manual device testing.

### Bug #8: Streak 0 shows "SUSPECTED COMMUNIST" — STILL BROKEN ❌

**Observed at session start** (state freshly loaded, streak = 0): header
displayed `0D · LOYAL CITIZEN` instead of the expected `0D · SUSPECTED
COMMUNIST`. The streak counter renders when streak is 0 (that part works), but
the label text is wrong. Bug #8 remains open.

### NEW-4: Current-time slot auto-expands on Daily view load — FIXED ✅

**Verified:** Edited "Take out trash" to time-of-day = Morning and "Check
gutters" to time-of-day = Afternoon. Hard-reloaded the page. Navigated to
Daily view (TODAY'S MANDATORY band with all three time-of-day slots present):

- MORNING · 1 → collapsed ✅
- AFTERNOON · 1 → **auto-expanded** (task card visible) ✅
- ANYTIME · 1 → collapsed ✅

The slot matching the current time of day (afternoon) was correctly
pre-expanded on page load. The Round 4 bug (no slot auto-expanded) is fixed.

**Regression check (expand BACKLOG → other slots stay open):** CANNOT TEST
this pass — BACKLOG contained 0 items and had no expand trigger.

### Bug #3: Manifest content-type — STILL BROKEN ❌

**Verified via `fetch('/manifest.webmanifest')`:** response content-type is
still `application/octet-stream`. Still needs the `netlify.toml` header rule
(`Content-Type: application/manifest+json`) documented in Round 3.

---

## VERIFIED PASSING THIS PASS

### Operations view — CLEARED badge logic

- [x] A project where all `kind=task` directives are completed shows CLEARED
  (regardless of pending routines) ✅  
  Homeowner: 3 routines pending, 1 directive cleared → card shows ✓ CLEARED.

- [x] A project with only routines (no tasks) never shows CLEARED ✅  
  "Routines Only Test" project: 1 routine pending, 0 directives → no CLEARED
  badge. Card shows `1 pending · 0 cleared` only.

- [x] A project with a mix: CLEARED only when the task directives are all done ✅  
  Confirmed by the Homeowner card above (routines still pending, but CLEARED
  shows because the sole directive is done).

- [x] Multiple projects render ✅  
  Both Homeowner and Routines Only Test rendered on the Operations page
  simultaneously.

### Operation creation wizard

Full 3-step flow tested this pass (including pre-compaction coverage):

- [x] Step 1: Continue disabled until operation name typed ✅
- [x] Step 1: Description optional (Continue works with empty description) ✅
- [x] Step 1: Color picker selects highlight colour; swatch updates ✅
- [x] Step 1: "Quick create (no routines)" skips to project creation with no
  routines ✅
- [x] Step 2: Brainstorm textarea accepts free text; parsed names preview below
  (split on newlines and commas, empties stripped) ✅
- [x] Step 2: "Create without routines" creates project immediately ✅
- [x] Step 2: "Configure N routines →" advances to Step 3 with parsed list ✅
- [x] Step 3: Routine title pre-filled from brainstorm text; editable ✅
- [x] Step 3: Tier T1–T4 grid selects consequence tier ✅
- [x] Step 3: Default cadence is Daily ✅
- [x] Step 3: Cadence grid (Daily / Weekly / Monthly / Quarterly / Yearly)
  selectable ✅
- [x] Step 3 Weekly: day-of-week multi-select; default day = today (Friday
  highlighted) ✅
- [x] Step 3 Monthly: "Day of month" / "Nth weekday" toggle appears ✅
- [x] Step 3 Monthly (day of month): numeric input visible ✅
- [x] Step 3 Monthly (Nth weekday): 1st/2nd/3rd/4th/Last + day-of-week
  pickers appear ✅
- [x] Step 3 Monthly (Nth weekday): anchor summary reads "The Nth Weekday of
  each month" ✅
- [x] Step 3: Time-of-day grid (Anytime / Morning / Afternoon / Evening)
  selectable ✅
- [x] Step 3: "Next Routine →" advances to next routine ✅
- [x] Step 3: Last routine shows "Create Operation ✓" ✅
- [x] After wizard completes: operation card appears in dashboard ✅
- [x] After wizard completes: routines appear with ROUTINE chip in project
  detail ✅
- [x] Wizard: clicking outside with data entered shows "DISCARD CHANGES?"
  confirmation ✅
- [x] Confirmation "Keep editing" returns to wizard with all data intact ✅
- [x] Confirmation "Discard" closes wizard and clears state ✅
- [x] Cancel with no data entered closes immediately without confirmation ✅

### Filing directives — Routine vs Directive kind system

- [x] Add-task dialog defaults to DIRECTIVE kind selected ✅
- [x] ROUTINE / DIRECTIVE segmented toggle visible when creating ✅
- [x] Selecting ROUTINE forces "Recurring" on and hides recurring checkbox ✅
- [x] Selecting ROUTINE hides the end-condition section entirely ✅
- [x] Selecting ROUTINE changes sheet title to "FILE NEW ROUTINE" and submit
  button to "COMMIT ROUTINE" ✅
- [x] Selecting DIRECTIVE shows sheet title "FILE NEW DIRECTIVE" and submit
  button "FILE DIRECTIVE" ✅
- [x] Editing an existing routine shows "AMEND ROUTINE"; kind toggle hidden ✅
- [x] Editing an existing directive shows "AMEND DIRECTIVE"; kind toggle
  hidden ✅
- [x] Directives with `kind=routine` show a ROUTINE chip in the task-item
  card ✅

### Task creation — one-time (observation)

- [x] Hard-date task whose due date is today shows "Cannot snooze" (greyed
  out, disabled) ✅  
  Confirmed when "Test directive alpha" was created with a Hard date of today.

---

## STILL COULDN'T TEST — needs clock manipulation or device

Carried forward from prior rounds:

- **Recurrence rollover** — requires device clock manipulation.
- **Slot transition timing** — current-time slot resets after background/
  foreground transition; active session does not collapse open sections.
- **NEW-3 share sheet** — native OS Web Share dialog not capturable in desktop
  Chrome automation.
- **Bug #3 fix** — one `netlify.toml` stanza (fix is known; needs deploy).
- **PWA install button, standalone launch, offline mode.**
- **Home screen icon + install dialog text.**
- **`npm test`** — run locally.
- **Multi-per-period tasks end-to-end.**
- **End condition enforcement** — N completions expiry, date-based retirement.
- **Edit dialog pre-fills end condition** from an existing task.
- **Single-day weekly first occurrence** — today-matches vs. not-today.
- **Multi-day completion rollover** (Wed/Fri next-occurrence sequencing).
- **NEW-4 regression: expand BACKLOG doesn't collapse other slots** — BACKLOG
  was empty this pass; needs content to test.

---

## NEW BUGS FOUND THIS PASS

None. All open bugs from prior rounds were either fixed (NEW-2, NEW-4) or
remain unchanged (Bug #3, Bug #8).

---

## Suggested fix order (updated)

1. **Bug #3** (manifest content-type) — one `netlify.toml` stanza; trivial.
2. **Bug #8** (zero-streak label) — product call: should 0D show "SUSPECTED
   COMMUNIST"? If yes, one-liner in the label/rank function.
3. **NEW-3 share sheet** — manual verification on a mobile device to confirm
   Web Share API fires and surfaces the share sheet.
