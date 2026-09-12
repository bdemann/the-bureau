# Testing — BCR Clear

Three layers:

1. **Automated (data)** — pure data-layer tests via `node:test` + `@augment-vir/assert`.
   Run: `npm test` (no browser, no DOM).
2. **Automated (e2e)** — real-browser tests via Playwright. Run: `npm run test:e2e`
   (spins up the Vite dev server itself). Covers rendering/layout/interaction
   concerns that can't be expressed as pure functions: mobile overflow,
   dialog field wiring, view-specific behavior (status transitions, linking,
   drag-and-drop reordering), and UI wiring around already-unit-tested pure
   logic. See the full spec list below.
3. **Manual** — UI/UX flows that still need a human in a real browser. Use the
   checklist below.

When you find a bug during manual testing, the goal is to add a regression
test for it in one of the automated layers where possible, then fix.

---

## Automated coverage (current)

Data layer:
- `recurrence.ts` — period boundaries, day-of-week / Nth-weekday math, fixed
  vs rolling advance, rollover semantics.
- `urgency.ts` — every band-decision path including snooze escalation.
- `storage.ts` — date helpers, visibility/overdue, Phase 1 → Phase 2 migration.
- `dialogues.ts` — trigger coverage, character preference, defensive fallback.

E2E (Playwright, `e2e/`):
- `dialog-overflow.spec.ts` — asserts no element's box extends past the mobile
  viewport in every make/amend-commitment mode (Routine/Task/Goal/Idea),
  every recurrence cadence, flexible deadline, milestone toggle, the amend
  flow, and both area-wizard steps that have their own layout. Add a new case
  here whenever a new dialog field/section/grid is introduced.
- `type-switcher.spec.ts` — type picker defaults/titles/submit labels for all
  four kinds, title preservation across a kind switch, routine-forces-recurring
  behavior, task→goal cross-type conversion, and the goal dissociation-warning
  flow (warning text, Save disabled while pending, Cancel reverts, Proceed
  completes the switch and actually dissociates the linked commitment).
- `cadence-picker.spec.ts` — one-time task defaults/validation; per-cadence
  field wiring and anchor-summary text for Daily (skip days), Weekly,
  Monthly (day-of-month and Nth-weekday, including the ordinal offset field),
  Quarterly, and Annually; milestone progress-cadence toggle; recurring
  start-date and end-condition gating (both live behind "Recurring
  commitment," end-condition additionally hidden for Routine kind); and
  edit-mode round-trip pre-fill for each cadence. Deliberately out of scope:
  the underlying date *math* (already covered by `recurrence.test.ts`) and
  clock-dependent rollover behavior (advancing a day/week/etc. and reloading)
  — a good candidate for Playwright's `page.clock` API in a future pass.
- `commitment-fields.spec.ts` — Area of Responsibility assignment (default,
  listing, assigning, reassigning), the full commitment-termination flow,
  and pausing (all 3 modes, edit-mode-only + recurring-only gating, PAUSED
  section in area-detail).
- `lead-time.spec.ts` — the Default/None/Custom lead-time picker (successor
  to the old "Radar lead days" number field): per-mode/per-kind help text
  (rigid/flexible/milestone/none/custom, singular vs plural day wording),
  hidden for daily-like cadences, and edit-mode round-trip.
- `commitment-lifecycle.spec.ts` — completion (one-time + recurring), snooze/
  un-snooze, skip-indicator and remediation badge wiring (using localStorage
  patches to reach states many real days would otherwise be needed for), and
  the UNDO toast.
- `daily-view.spec.ts` — band collapse/expand persistence (including the E1
  auto-collapse quirk documented below), empty states, area name tags,
  "Not Today", band-placement wiring for C1/C2 rules, and the
  docket-cleared bonus.
- `goals-ideas.spec.ts` — Goals status transitions, per-area filtering/
  linking, goal-detail commitment linking/unlinking, area decommission
  cascade; Ideas creation/deletion (both delete paths), idea→task
  conversion, and promotion to a commitment.
- `insights.spec.ts` — navigation, all empty states, missed-commitment
  Revive/Dismiss (and the recurring-miss count-only variant), and the
  activity sections (snoozed/skipped/completed/streaks/per-area overview)
  reflecting stored task counts.
- `preferences-persistence.spec.ts` — hide-score toggle (on/off, keeps
  tracking while hidden, persists across reload) and basic persistence
  (survives reload, `bureau_v1` shape).
- `app-shell-nav.spec.ts` — header/default-view/no-console-errors, hamburger
  menu open/backdrop-close/navigation, all four bottom-nav tabs and their
  detail-view highlight persistence, and the UNDO toast's z-order relative
  to the nav bar.
- `areas.spec.ts` — area list empty state, wizard cancel with/without data,
  the "✓ CLEARED" all-clear flag rules, area-detail (empty state, cleared-
  tasks toggle, EDIT/DELETE AREA), and the wizard's step 2/3 multi-routine
  brainstorm-to-configuration loop.
- `bug-regressions.spec.ts` — skip fires no dialogue change; the streak=0
  header text.
- `reordering.spec.ts` — drag-and-drop reordering of commitments (daily
  view and area-detail) and areas (dashboard), via Playwright's native
  `dragTo()`: drag-onto-target, the bottom drop-zone, persistence across
  reload, and area-scoped isolation — verified against actual stored
  array order.

The manual-checklist conversion (section by section, highest-churn areas
first) is essentially complete — every section below has either been
converted (and removed, replaced with a short pointer + any corrections
found) or explicitly marked as staying manual with a reason. The only
sections left below are ones that genuinely can't be Playwright specs yet:
PWA/install (OS-level chrome) and a handful of individually-noted "still
manual" items scattered through the converted sections' notes (mostly
clock-dependent behavior — `page.clock` is the intended approach for a
future pass — or purely cosmetic/visual judgment calls).

---

## Manual checklist

Mark each row as you verify in the browser. Reset the localStorage entry
`bureau_v1` between phases when you want a clean state.

### App shell / Bottom navigation bar

Converted to `e2e/app-shell-nav.spec.ts` (9 tests): header text, default
landing view, no console errors, hamburger open + backdrop-close, Menu →
Insights, all four tabs' visibility and switching, Areas/Goals tabs staying
highlighted in their detail views (and returning to the list when tapped
from there), and the UNDO toast rendering above (not behind) the nav bar.

**Correction to this doc:** "menu shows Insights and Report a Neighbor
only" is well out of date — the hamburger menu now has five sections
(Filed Records: All Tasks/Routines/Commitments; Performance: Insights;
Community Duty: Report a Neighbor; Shopping List; Preferences; Your Data:
Export Spreadsheet/Export Your Records/Restore Records).

Still manual / not yet automated: SVG icon rendering specifics (size,
per-tab icon shape, color-by-state) — visual, not worth e2e-asserting on
markup structure; "Menu → Report a Neighbor triggers share sheet" (native
share-sheet/clipboard behavior isn't something Playwright can observe
directly); day-start dialogue appearance/dismiss (already incidentally
visible in every screenshot throughout this whole conversion effort, but
not explicitly asserted); iOS PWA safe-area inset (needs a real device or
PWA-specific viewport simulation, out of scope for regular Playwright).

### Areas of Responsibility view (area list)

Converted to `e2e/areas.spec.ts` (9 tests, shared with Area-detail below):
empty state, wizard cancel with/without data (DISCARD CHANGES?, Keep
editing, Discard), and the "✓ CLEARED" all-clear flag (only when every
`kind=task` commitment is done, regardless of routines; never for
routine-only areas).

**Bug found and fixed while writing these tests:** the wizard's discard-
confirmation mini-dialog ("DISCARD CHANGES? / Keep editing / Discard")
explicitly overrode its bottom padding to a plain `24px`, discarding the
nav-bar clearance (`64px` + safe-area) the main wizard sheet uses. Since
it and the fixed bottom nav share the same z-index (200) and nav wins
DOM-order stacking, its buttons were genuinely covered by the nav bar on
mobile — a real, reproducible instance of the "buttons hang off/under the
edge" class of bug this whole conversion effort started from. Fixed in
`area-wizard-dialog.element.ts`; confirmed by writing the test against the
broken version first (real click failed, occlusion error), then against
the fix (real click succeeds).

Note: "CLEARED" as a bare word always appears in the per-card stat row too
(`N CLEARED`, the completed-count) — the all-clear flag specifically reads
"✓ CLEARED", and tests must match that exact string to avoid a false
positive.

### Area of Responsibility creation wizard

Step 3's tier/cadence/time-of-day pickers are the same `<cadence-picker>`
element already exhaustively covered by `cadence-picker.spec.ts` against
the main commitment dialog — not re-tested per cadence/season/ordinal here,
since it's identical shared-component behavior. What's unique to the
wizard — brainstorm-text parsing into multiple routines and the per-routine
Next Commitment → / Create Area ✓ loop — is converted to `e2e/areas.spec.ts`
("Area creation wizard — steps 2 and 3"): one routine created per
brainstorm line, each configured and advanced in turn, and "Create without
commitments" from step 2.

Also converted (`e2e/areas.spec.ts` / `e2e/dialog-overflow.spec.ts`): step 1
required-name gating (via the "wizard cancel with no data" test's implicit
path), Quick create, and mobile overflow / nav-bar clearance (issue #10) —
including a real bug found and fixed in this pass (see the note under
"Areas of Responsibility view" above).

Still manual / not yet automated: step 1's color picker (visual swatch
selection); step 2's textarea comma-splitting specifically (only newline-
splitting is exercised); step 3's "Create with commitments so far" (partial
completion mid-loop) — the two ends of that loop (finish immediately, or
go all the way through) are covered, but not stopping partway through.

### Area-detail

Converted to `e2e/areas.spec.ts`: header/back button/empty state, the
cleared-tasks Show/Hide toggle, EDIT AREA (pre-filled, save persists,
cancel discards), the blank-name no-op behavior, and DELETE AREA (confirm/
cancel/confirm-deletes-with-commitments).

**Corrections to this doc:** the buttons are "EDIT AREA" / "DELETE AREA",
not "DECOMMISSION AREA" — and its confirmation reads "PERMANENTLY DELETE
THIS AREA AND ALL ITS COMMITMENTS?" / "DELETE" / "CANCEL", not
"DECOMMISSION" / "CANCEL". Also, "Cannot save with blank area name" isn't
an actual disabled state on the SAVE CHANGES button — the click handler
itself no-ops when the trimmed name is empty.

Still manual / not yet automated: color swatch pre-selection and saved-
color reflecting in the header (cosmetic); "Active tasks list shows
incomplete + un-snoozed regardless of due date" and "Snoozed list shows
separately" specifically for area-detail's own rendering (snooze mechanics
are covered elsewhere, in `commitment-lifecycle.spec.ts`, via a different
view).

### Filing commitments — type switcher, cross-type conversion, dissociation warning

Converted to `e2e/type-switcher.spec.ts` (see Automated coverage above). Two
things worth knowing if you're touching this area again:

- The old "type picker" bottom sheet (backdrop dismiss, per-kind titles like
  "FILE NEW GOAL") no longer exists — `+ MAKE COMMITMENT` / `+ MAKE NEW
  COMMITMENT` opens the unified dialog directly (defaults to Task kind), with
  the ROUTINE/TASK/GOAL/IDEA toggle inside it.
- The goal dissociation warning ("switching a goal with linked commitments
  shows a confirmation") had regressed to dead code (CSS defined, never
  wired into the template) — it's been restored in `add-task-dialog.element.ts`
  (`pendingKindSwitch` state + `linkedCommitmentCount` input computed in
  `bureau-app.element.ts`) and is covered by the new spec.

Not yet automated: "removing the linked goal in edit mode removes the task
from the old goal's linked list" and "changing the linked goal rewires
linkages correctly" — both plausible from the code but not yet asserted
end-to-end.

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

### Task commitment creation — recurring cadences (daily/weekly/monthly/quarterly/annually), milestone progress cadence

Field wiring, anchor-summary text, and edit-mode round-trip pre-fill are
converted to `e2e/cadence-picker.spec.ts` (see Automated coverage above).
Still manual / not yet automated (all date-math-over-time, needs either the
existing data-layer coverage or a future `page.clock`-based e2e pass):

- Skip-day rollover behavior (Sunday skip → no miss, Monday → miss counted) —
  covered at the data layer already (`urgency.test.ts` — "skipDays (GitHub #37)").
- Next-occurrence date math for weekly/monthly/quarterly/annually (which date
  is next, month-end edge cases, 5th-weekday skip) — covered at the data
  layer already (`recurrence.test.ts`).
- Milestone progress-cadence operational behavior: hides after logging
  progress, reappears next period, blocks double-logging same day, frequency
  input range validation (2–99).
- "Card shows `Day N of each month · next {date}`" style card-label text —
  not asserted by the new spec; worth adding if that label changes often.

The old "Task commitment creation — multiple-per-period" checklist section
(a "Times per period" input, "Multiple per week" cadence) was removed: that
UI doesn't exist in the current dialog — `frequencyPerPeriod` is hardcoded
to 1 at creation time. Treated as intentionally deprecated (like the
`multiple_per_day` cadence, explicitly commented "legacy" in `types.ts`),
not a regression to fix.

### Commitment completion

Converted to `e2e/commitment-lifecycle.spec.ts`: one-time task completion
(hides, score increases) and recurring task completion (hides today,
taskCompletionStreak increments).

Still manual / not yet automated: multi-per-period progress chip increment
and target-reached hiding (the `multiple-per-period` UI itself was removed
as a stale doc section — see above — so this can't currently be exercised
via the dialog at all); the dialogue-line easter egg (unfalsifiable, low
value to automate).

### Reordering commitments / Reordering areas (dashboard)

Converted to `e2e/reordering.spec.ts` (6 tests) using Playwright's native
`dragTo()` (real HTML5 drag-and-drop events — these components use
`draggable="true"` + dragstart/dragover/drop, not pointer-based dragging,
so plain mouse-move simulation wouldn't trigger them). Covers: drag handle
presence, drag-onto-another-card reordering (persists after reload), the
bottom drop-zone moving an item to last position, and reordering in one
area not disturbing another area's commitments — all verified by reading
the actual `commitments`/`areas` array order in `bureau_v1`, not just
visual position.

Still manual / not yet automated: the reduced-opacity dragging visual and
the blue drop-target indicator line (purely cosmetic feedback); reordering
scoped to one daily-view band or one time-of-day slot group specifically
not disturbing others (the area-scoping case is covered as the
representative example of "reorder handler only touches its own subset";
same underlying `onCommitmentsReordered`/`onTasksReordered` pattern, not
worth re-testing per band/slot).

### Filing commitments from the daily view / Area of Responsibility assignment / Commitment termination

Converted to `e2e/commitment-fields.spec.ts`: "No area" default when filed
from Daily, submitting with no area, the area dropdown listing/assigning/
reassigning areas, and the full termination flow (absent in add mode,
present in edit mode, confirm/cancel, actually deletes).

Still manual / not yet automated:
- Area pre-selection when opened via an area's own "+ MAKE NEW COMMITMENT"
  button (only the Daily-view "no area default" path is covered).
- "Commitments with no area do not appear in any area-detail view" and
  "terminated commitment no longer appears in area-detail" specifically
  (covered more loosely as "disappears from search by title" globally, not
  asserted against an area-detail view directly).

### Snooze / Un-snooze / Skip indicator / Remediation

Converted to `e2e/commitment-lifecycle.spec.ts`. The exact severity-text
thresholds (skipStreak → badge copy, remediationCount → badge copy,
computeRemediationOnComplete's grace period) were already fully unit-tested
in `scoring.test.ts` / `remediation.test.ts`, so these e2e tests check the
*wiring* — does the app actually reflect stored task state in what renders —
using direct localStorage patches (`patchCommitmentByTitle`) to reach states
that would otherwise need many real days to simulate:
- Skip badge escalation (1 → 3 → 5 → 8), in both the daily view and area-detail.
- Remediation entering (skipStreak at/above threshold + complete), NOT
  entering (below threshold + complete → clean reset), badge escalation
  (1/3/5), and relapse mid-remediation (skip while remediating restarts
  skipStreak at the remediation level, not 1).
- Snooze shows a "Wake up" button and SNOOZED-section membership; Wake Up
  removes it while `totalSnoozes` stays incremented (retained, not reset);
  a rigid task due today shows a disabled "Cannot snooze".
- Also fixed a real regression found while writing these tests: skipping a
  task no longer hid it (see git history) — the prior fix for the
  isCompletedForPeriod bug had over-corrected.

**Correction to this doc:** "Basic remediation flow" said skipStreak ≥ 1
triggers remediation on completion — the actual grace-period threshold is
`SKIP_ESCALATION_THRESHOLD` (5), confirmed in `remediation.ts` and by the
new tests. Below 5, completing resets cleanly with no remediation.

Still manual / not yet automated: snooze/skip score-penalty *amounts*
(tier-weighted, N-scaled by active task count) — this is `scoring.ts`
territory and would fit better as data-layer tests than e2e; the
auto-skip-on-reopen penalty path (needs simulating app reopen after time
passes); Mon–Sat multi-day routine dismissal specifics (card hides Monday,
reappears Tuesday, hidden Sunday) — same-day-only e2e can't exercise this
without clock mocking, though the underlying date logic is in
`recurrence.test.ts`; Whitaker/Briggs dialogue escalation (cosmetic,
low-value to assert exact copy).

### Daily view

Band-assignment *rules* (which band a task lands in given tier/date/skip
state/etc.) are exhaustively unit-tested in `urgency.test.ts` already. The
surrounding UI (collapse/expand, empty states, "Not Today", docket bonus) is
converted to `e2e/daily-view.spec.ts`.

**Correction to this doc — real behavior found while writing these tests:**
"Mandatory and Suggested start expanded" is not quite right. E1's
auto-collapse ("if Mandatory is empty and currently expanded, collapse it")
fires on *any* render where Mandatory is empty, not just "after clearing
it" — including a brand-new session with zero tasks, and again immediately
if you manually re-expand it while it's still empty. Net effect: **the
"No mandatory tasks today. Agent Whitaker approves." empty-state message is
currently unreachable** — the section that would show it collapses itself
first. Nothing re-expands Mandatory automatically when it goes from empty
to non-empty either; a manual expand only *sticks* once there's something
in it. This is a real, current bug/design-gap worth a product decision, not
fixed here per the project's guard on changing daily-view behavior without
consulting the vision docs first. `e2e/daily-view.spec.ts`'s
"empty Mandatory auto-collapses instead of showing the approval message"
test documents current behavior precisely so it flags itself if anyone
changes this later.

Covered by the new spec: Radar/Backlog default collapsed; a manual expand
of Mandatory sticks once non-empty; toggle state persists across reload;
area name tag on cards; "Not Today" absent on Mandatory, hides a Radar/
Backlog card for today with no score or snoozeCount change; T1 daily →
Mandatory and T4 → never Mandatory (C1); T2 skipStreak ≥ 5 escalation to
Mandatory (C2); docket-cleared bonus produces a bigger score jump than a
non-clearing completion, and Mandatory auto-collapses once cleared (E1).

Still manual / not yet automated: exact band boundary rules restated above
(redundant with `urgency.test.ts`, intentionally not re-tested here);
time-of-day sub-slot collapse/expand behavior and its "resets on
background/return" nuance (needs control over the current time of day —
would need `page.clock` or a similar override, not attempted here);
"docket bonus doesn't fire when Mandatory was already empty before the
completion" (only the positive case — clearing it — is tested).

### Pausing commitments

Converted to `e2e/commitment-fields.spec.ts`: the row appears in edit mode
and disappears in add mode, each of the 3 pause modes (Indefinitely/Until
date/For N days) hides the commitment, and it shows up in its area's PAUSED
section.

**Correction to this doc:** "Edit any commitment" was wrong — Pause
Commitment only renders for **recurring** commitments (it's nested inside
`state.isRecurring` in `add-task-dialog.element.ts`); a one-time task has no
Pause row at all, in add or edit mode.

Still manual / not yet automated: score-impact assertion is spot-checked
only for Indefinitely (not Until-date/For-N-days); "Until date reappears
automatically" and "does not accrue misses during rollover" are clock-
dependent; "clicking the task card for a paused commitment opens edit mode
where pause can be removed" isn't separately asserted (implied by the fact
every pause test above reopens the dialog to set the pause, but removing an
existing pause isn't explicitly tested).

### Monthly/quarterly/annually anchors, ordinal offset, start date, end conditions

Field wiring, anchor-summary text (see the exact abbreviated-day-name wording
note below), and edit-mode round-trip pre-fill are covered by
`e2e/cadence-picker.spec.ts`. Two things worth knowing:

- Day-of-week abbreviations in anchor summaries are 3-letter ("Thu", not
  "Thursday") — this doc previously said "Thursday" full-name, which never
  matched the actual UI.
- The Quarterly anchor is rendered as **two separate** summary lines (a
  month-group summary like "Feb · May · Aug · Nov" and a days-of-month
  summary like "The 15th of each month.") — not the single combined sentence
  ("The 15th of the 2nd month of each quarter.") this doc previously implied.

Still manual / not yet automated:
- Area wizard's monthly/quarterly pickers (only the main commitment dialog's
  pickers are covered so far — the area wizard reuses the same
  `cadence-picker` component, so this is likely fine, but hasn't been
  explicitly asserted).
- Annually **day-of-month** mode's own anchor-summary text (only Annually's
  **Nth-weekday** mode is asserted; the plain "Every Sep 1st."-style summary
  for day-of-month mode is not).
- All next-occurrence/period-advance date math (completing on the 1st
  advances to the 15th, year-over-year Thanksgiving/Mother's-Day dates, zero
  offset omitted from export, etc.) — covered at the data layer already
  (`recurrence.test.ts`).
- A commitment with a future start date not appearing in the daily view /
  not accruing misses, and end-condition retirement after N completions or
  past a date — all clock-dependent; would need `page.clock` to assert in
  e2e. The create-time field wiring is covered; this rollover/retirement
  *behavior* is not.

**Bug found and fixed during this conversion:** a freshly-created (never
completed) monthly/quarterly commitment whose first occurrence lands beyond
the current calendar period — e.g. created after this month's/quarter's
anchor day already passed — was being permanently hidden from every daily
band, mistaken for "already completed for this period." Root cause and fix
in `urgency.ts`'s `isCompletedForPeriod` (see git history); regression tests
in `urgency.test.ts` and `e2e/cadence-picker.spec.ts`'s round-trip tests.

### Recurrence rollover

All genuinely covered already at the data layer (`recurrence.test.ts` —
period boundaries, fixed vs rolling advance, rollover semantics). Exercising
these specific scenarios through the UI would need real days to pass or
Playwright's `page.clock` API — not attempted in this conversion pass;
worth a dedicated future pass if UI-level rollover regressions ever turn
up that the data-layer tests don't catch.

### Insights

Converted to `e2e/insights.spec.ts` (8 tests): hamburger navigation, all four
empty states, a missed one-time commitment's Revive (restores it, reappears
in Daily) and Dismiss (permanently deletes it), recurring-miss rows showing
count-only with no action buttons, activity sections (snoozed/skipped/
completed/streaks) reflecting stored counts, and RESPONSIBILITIES OVERVIEW
appearing once an area exists. missedAt/totalMisses/totalSnoozes/etc. are
patched directly via `patchCommitmentByTitle` rather than simulated through
real rollover, same technique as `commitment-lifecycle.spec.ts`.

**Correction to this doc:** the buttons are "Revive" / "Dismiss" (title
case) — this doc's ALL-CAPS "REVIVE" / "DISMISS" doesn't match any actual
button text (though they render visually uppercase via CSS
`text-transform`, so this was easy to miss just by looking).

Still manual / not yet automated: "bottom nav has no active tab" (a cosmetic
nav-state check); sort order within MOST SNOOZED/SKIPPED/TOP COMPLETIONS;
"Revive resets a past suggestedDate to today" specifically (only "it
reappears in Daily" is checked, not the exact date logic); the actual
rollover-at-startup path that produces these counts organically (covered
at the data layer already, in `recurrence.test.ts`); skipStreak/
taskCompletionStreak reset-on-opposite-action, which is really `urgency.ts`/
`bureau-app.element.ts` logic better suited to a unit test than this view.

### Lead Time (per-commitment; formerly "Radar lead days")

Converted to `e2e/lead-time.spec.ts`. **This whole section was stale** — the
plain "Radar lead (days)" number field it described no longer exists.
Current UI: a Default/None/Custom picker (`state.leadTimeMode`), hidden for
daily-like cadences same as Milestone and Deadline Type. Help text differs
by mode/kind: "Appears in radar 3 days before due date (default)" (rigid),
"Visibility scales with window % remaining (default)" (flexible), "Appears
in radar 30 days before deadline (default)" (milestone — **not absent as
the old doc claimed**), "Hidden until due..." (None), "Shows up N day(s)
before due" (Custom, singular/plural wording). Custom mode's day count and
edit-mode round-trip are covered.

Still manual / not yet automated: the actual band-placement behavior driven
by the lead value (appears in Radar N days out, 0 skips Radar entirely) —
that's `urgency.ts` band logic and would need either new `urgency.test.ts`
cases or clock-based e2e; "no saved value behaves as if set to 3" (default
back-compat for existing data).

### Goals / Ideas

Converted to `e2e/goals-ideas.spec.ts` (13 tests). Commitment-dialog field
wiring for Goal/Idea kind is already covered by `type-switcher.spec.ts` /
`cadence-picker.spec.ts` — this spec covers the views' own behavior: status
transitions (ACTIVE/ACHIEVED/ABANDONED), per-area filtering and auto-linking,
LINK/unlink COMMITMENT, EDIT/DELETE OBJECTIVE, decommissioning an area
cascading to its goals, idea deletion, idea→task conversion, and
PROMOTE TO COMMITMENT.

**Corrections to this doc, found while writing the spec:**
- The "Global view" Ideas description of an inline add-form (Title/Notes/
  Linked Area/Linked Objective fields directly in the ideas view) is stale —
  "+ MAKE IDEA" opens the same unified commitment dialog used everywhere
  else, already covered elsewhere. Its "FILE INTELLIGENCE" button name is
  also stale (see the type-switcher doc note above).
- "AREA detail page shows an INTELLIGENCE section" is stale — it renders
  `skin.types.ideaPlural.toUpperCase()`, which is "IDEAS" for every current
  skin. This mirrors the already-noted Goals-section fix under
  "Bug regressions" (issue #7); this section just hadn't been updated to
  match.
- Area-detail's delete button/confirmation is "DELETE AREA" /
  "PERMANENTLY DELETE THIS AREA AND ALL ITS COMMITMENTS?" / "DELETE" — not
  "DECOMMISSION AREA" / "DECOMMISSION" as previously documented.
- Ideas have **two separate delete paths**: the idea card's own inline
  DELETE button (→ "Permanently delete this intelligence?" / CONFIRM /
  CANCEL — what this doc originally described) and, separately, opening the
  card into the unified edit dialog and using *its* generic "DELETE IDEA"
  flow (→ "PERMANENTLY DELETE THIS IDEA?" / DELETE / CANCEL, same pattern as
  commitment termination). Both work; they weren't previously distinguished.
- LINK COMMITMENT only renders on goal-detail when there's at least one
  unlinked commitment available to link — not unconditionally.
- PROMOTE TO COMMITMENT appears to inherit whichever kind (Task/Routine/
  Goal/Idea) was last active in the dialog rather than always resetting to
  Task — a minor pre-existing quirk, not filed as an issue, worth knowing
  if the redesign touches dialog-open state handling.

Still manual / not yet automated: 2-line description clamp, target-date
sort order, "OVERDUE" styling, linked-commitment-chip rendering on goal
cards, idea-card metadata badges, and the Linked Area/Objective dropdown
options specifically from the per-area idea-filing path (only the global
path is exercised here) — all cosmetic/low-risk for the upcoming redesign.

### Bug regressions

Most of these are now covered as side effects of other specs; two were
added directly to `e2e/bug-regressions.spec.ts`. Status per item:

- [x] Skip fires no dialogue — `bug-regressions.spec.ts` (compares the memo
  quote before/after; must be unchanged)
- [ ] Menu → "Report a Neighbor" share sheet — still manual (native share/
  clipboard behavior isn't something Playwright observes directly)
- [x] Streak=0 header text — `bug-regressions.spec.ts` (patched via
  localStorage; a fresh session actually starts at streak=1, not 0)
- [ ] BACKLOG expand preserving other bands' time-of-day slot state — still
  manual (same time-of-day-slot territory flagged manual under Daily view)
- [x] Area-detail Ideas section reads "IDEAS" not "INTELLIGENCE" —
  `goals-ideas.spec.ts`
- [x] BCR skin goal edit reads "AMEND GOAL" / "SAVE GOAL" — `type-switcher.spec.ts` / `goals-ideas.spec.ts`
- [ ] Area-detail Goals section header text and BCR delete-goal confirm
  text ("DELETE GOAL" / "PERMANENTLY DELETE THIS GOAL?") specifically via
  the *unified dialog's* delete flow (as opposed to goal-detail's own
  separate "DELETE OBJECTIVE" flow, which intentionally uses generic
  bureaucratic terminology regardless of skin — confirmed not a bug, just
  a different, deliberate label for that specific admin action) — not
  explicitly asserted with its own test
- [x] Linked goal picker visible with no goals for the selected area —
  `type-switcher.spec.ts`
- [x] Monthly/quarterly multi-dom hide-until-next-dom — covered at the data
  layer in `recurrence.test.ts` (this is date-math, not UI)

### Preferences — hide score

Converted to `e2e/preferences-persistence.spec.ts`: toggling on/off hides/
shows `.score-number`, score keeps updating while hidden (toggle off after
completing a task to confirm), and the hidden state persists across reload
(`bureau-hide-score` in localStorage is `"true"`). Note the toggle itself is
a zero-size, opacity:0 checkbox behind a visible `.toggle-track` — clicking
the input directly fails Playwright's actionability check; click the
wrapping `<label class="toggle">` instead (there are two `.dark-mode-row`
elements on the page — dark mode and hide-score both reuse the class — so
scope by the row's text, not the bare class).

Still manual / not yet automated: rank/streak label and progress bar
hiding specifically (only the score number is asserted); wordmark staying
centered / layout not breaking (visual); the flavor-note copy following
the active skin.

### Persistence

Converted to `e2e/preferences-persistence.spec.ts`: state survives a hard
reload, and `bureau_v1` is well-formed JSON containing what was created.
"Close tab + reopen" specifically isn't distinguished from reload in
Playwright (both exercise the same load-from-localStorage path).

### PWA / install

- [ ] `/manifest.webmanifest` returns 200
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] Install button shows in browser address bar
- [ ] Installed app launches standalone
- [ ] Offline (DevTools → Network → Offline): app still loads + works
- [ ] Home screen icon: white eagle on navy, no halo (uninstall + reinstall after icon changes)
- [ ] Install dialog text: "BCR Clear" / Home screen label: "BCR Clear"
