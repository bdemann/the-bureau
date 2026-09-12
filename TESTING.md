# Testing — BCR Clear

Three layers:

1. **Automated (data)** — pure data-layer tests via `node:test` + `@augment-vir/assert`.
   Run: `npm test` (no browser, no DOM).
2. **Automated (e2e)** — real-browser tests via Playwright. Run: `npm run test:e2e`
   (spins up the Vite dev server itself). Covers rendering/layout concerns that
   can't be expressed as pure functions — currently: horizontal-overflow
   regressions in the make/amend commitment dialog and area wizard at mobile
   viewport width (see `e2e/dialog-overflow.spec.ts`, `e2e/helpers.ts`).
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

Converting the rest of the manual checklist below into Playwright specs
(section by section, highest-churn areas first) is in progress — sections
above have been removed as they were converted. `page.clock` (Playwright's
clock-mocking API) is the intended approach for the date/rollover-dependent
checks; true OS-level PWA-install chrome and subjective visual-design
judgment calls are expected to stay manual permanently.

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
- [ ] Bar shows four tabs: Daily · Areas · Ideas · Goals, each with an SVG icon above its label
- [ ] SVG icons render at consistent size (~22px), filled with current color (amber when active, muted when inactive)
- [ ] Icons: calendar (Daily), grid (Areas), lightbulb (Ideas), flag (Goals)
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

- [ ] Daily routine: complete it, advance device clock 1 day, reload — back, fresh
- [ ] Weekly fixed (anchored Thursday): complete it, next-week reload — suggestedDate is next Thursday
- [ ] Weekly rolling: complete on a different day — next due = completion + 7 days
- [ ] Multi-per-week: complete 1× this week, advance week — completionsThisPeriod resets to 0

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

### Preferences — hide score

- [ ] Preferences view shows a SCORE section with a "Hide score" toggle and a flavor note beneath it (BCR skin: text mentions reporting to BCR officials / becoming a true patriot)
- [ ] Toggle "Hide score" on → header score number, rank/streak label, and progress bar all disappear; wordmark stays centered and layout is not broken
- [ ] Toggle "Hide score" off → score number, rank/streak label, and progress bar reappear with the current score
- [ ] Complete or skip a commitment while score is hidden, then toggle off → header score reflects the change (confirms score is still tracked while hidden)
- [ ] Reload the page with "Hide score" on → header score stays hidden (DevTools → Local Storage key `bureau-hide-score` is `true`)
- [ ] Switch skins with the toggle on → the SCORE section label and flavor note follow the active skin; score stays hidden

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
