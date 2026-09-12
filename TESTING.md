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
- [ ] Completing the last mandatory task: score jumps by the docket-cleared bonus (5 pts at N=10) on top of the normal task reward (#39)
- [ ] Docket-cleared bonus only fires when mandatory band was non-empty before the completion
- [ ] Days with no mandatory tasks: completing suggested/radar/backlog tasks does NOT trigger the docket bonus
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
