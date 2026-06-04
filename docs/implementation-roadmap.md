# Implementation Roadmap

> Sessions: 2026-06-01/02/03
> Context: Large design-review session. Discovered bugs and vision drift. Planning order of work.

---

## Background

This session started because of confusion about how lead time, window types, and daily sections interact. Through the review we:

1. Found a scoring bug (miss penalties applied to non-mandatory tasks)
2. Clarified the intended band rules (with some revisions to earlier proposals)
3. Documented flexible windows properly for the first time
4. Identified that snooze on flexible tasks is probably wrong
5. Decided we need better task-audit tools before making sweeping band/scoring changes

---

## Current Plan (ordered)

### Phase 0 — Data Quality (unblocks everything)

1. **Fix CSV export** (GitHub #34) — add `hardDaysOfWeek`, `hardDaysOfMonth`, anchor days; include goals and ideas. Must happen before re-export so audit data is complete.
2. **Re-export** — after fixing the CSV and after finishing the in-app task audit/cleanup.
3. **Audit new export against current philosophy** — go through every task and verify window type, tier, cadence, lead time, and snoozeability are correctly set. Flag anything that doesn't fit.

### Phase 1 — Answer Open Design Questions

Use the clean export data to answer the remaining questions in `open-design-questions.md`. Key ones:

- Can T3 daily/multi-day-weekly tasks reach mandatory via skip escalation, or are they capped at suggested?
- What skip thresholds trigger T2 → mandatory and T3 → mandatory (if applicable)?
- Skip-of-suggested penalty: zero or a small amount?
- Backlog completion bonus: confirm 1.5× or adjust?
- Flexible snooze replacement: option A (remove), B (not-today button), or C (no escalation)?
- `disableSnooze` toggle: keep as user setting, or remove and infer from task type?

### Phase 2 — Harden Philosophy Docs

Once the design questions are answered:
- Update `docs/daily-view-band-rules.md` with final T2/T3 escalation rules and thresholds
- Update `docs/scoring-redesign.md` with confirmed bonus/penalty values
- Resolve all open questions in `docs/open-design-questions.md` (move answers to relevant docs)
- Update `VISION.md` daily view section with clean final rules
- Update `CLAUDE.md` if any new doc references are needed

### Phase 3 — Plan + Prune

Before writing code, identify:
- What to **remove**: fields/features that don't match the philosophy (e.g. `disableSnooze` toggle if inferrable, window type selector for daily tasks, schedule mode selector for daily tasks)
- What to **change**: urgency rules (T4 never mandatory, T2/T3 daily escalation, T3 snooze ceiling), scoring (band-aware penalties, bonus rewards)
- What to **add**: "not today" action for flexible tasks, `skipDays` for daily tasks, daily band-rules UI behavior (auto-collapse mandatory)
- **Order** changes from lowest risk (UI hiding fields) to highest risk (scoring changes) — see numbered implementation items below

### Phase 4 — Implementation (with tests)

Each item gets automated tests (urgency.test.ts, scoring.test.ts, scoring-scenarios.test.ts) and/or TESTING.md manual entries before or alongside the code change. No exceptions.

#### Group A — Pure additions, zero behavior change

**A1. Add constants to `src/data/scoring.ts`**
```typescript
const SUGGESTED_BAND_PENALTY_FACTOR = 0.5;
const SKIP_ESCALATION_THRESHOLD = 5;
const REMEDIATION_CAP = 5;
```

**A2. Add `skipEscalationThreshold?: number` to Task type in `src/data/types.ts`**
Optional field. `undefined` = use `SKIP_ESCALATION_THRESHOLD`. No migration needed.

---

#### Group B — UI only, no behavior change

**B1. Hide window type + schedule mode selectors when cadence is `daily` or `multiple_per_day`**
File: `src/components/add-task-dialog.element.ts`
Tests: TESTING.md entry

**B2. Remove `disableSnooze` toggle from task form UI**
File: `src/components/add-task-dialog.element.ts`
Keep field in `types.ts` for now (data exists, keep backward compat). Remove field from types + migration in a follow-up after verifying no active tasks use it.
Tests: TESTING.md entry

---

#### Group C — Band logic changes (affects display, not score)

**C1. T4 never mandatory — fix `step1HardMandatory` in `src/data/urgency.ts`**
Add early return: if `task.consequenceTier === 4`, return `'unresolved'` from Step 1 so it falls through to Step 2 → `suggested`.
Affects: daily T4, weekly committed-day T4, hard-date T4 on due date, flexible deadline T4.
Tests: new cases in `urgency.test.ts`

**C2. T2/T3/T4 daily and daily-like → start in `suggested`, T2 escalates via skipStreak**
"Daily-like" = daily cadence OR (`weekly` AND `hardDaysOfWeek.length >= 2`).
- Step 1: only return `mandatory` for T1 daily/daily-like. T2/T3 return `'unresolved'`.
- Step 2: add path for daily/daily-like tasks returning `'suggested'`.
- New step before snooze escalation: if T2 daily-like AND `task.skipStreak >= (task.skipEscalationThreshold ?? SKIP_ESCALATION_THRESHOLD)` → `mandatory`.
Files: `src/data/urgency.ts`
Tests: new cases in `urgency.test.ts` for T1/T2/T3/T4 daily, T2 at threshold

---

#### Group D — Scoring changes (affects patriot score)

**D1. Remediation rewrite — `src/data/remediation.ts`**
Three changes (see `scoring-redesign.md` for full spec):
- `computeRemediationOnComplete`: set remediationCount = min(CAP, max(skip, snooze)) but do NOT reset streaks. Only clear streaks when remediationCount hits 0.
- `computeRemediationOnSkip`: if in remediation, `skipStreak++` normally, `remediationCount = 0`. Remove the `skipStreak = remediationCount` behavior.
- `computeRemediationOnSnooze`: same — `snoozeCount++` normally, `remediationCount = 0`.
Tests: update `remediation.test.ts`

**D2. Backlog/radar completion bonus — `src/components/bureau-app.element.ts`**
In completion handler: check `getDailyBand(task, today)` before marking complete. If `radar` or `backlog`, multiply reward by 1.5.
Tests: new scenario in `scoring-scenarios.test.ts`

**D3. Band-aware snooze penalty**
In snooze handler: check `getDailyBand(task, today)`. If `suggested`, multiply penalty by `SUGGESTED_BAND_PENALTY_FACTOR`.
File: `src/components/bureau-app.element.ts`
Tests: new unit test in `scoring.test.ts`

**D4. Band-aware miss penalty — the scoring bug fix**
In `bootstrap()`: before applying miss penalty, compute what band the task was in for the day it rolled over from. If `suggested` → multiply by `SUGGESTED_BAND_PENALTY_FACTOR`. If `radar` or `backlog` → no penalty.
File: `src/components/bureau-app.element.ts`
Tests: new scenario in `scoring-scenarios.test.ts` — "cleared mandatory, ignored suggested → healthy score"

---

#### Group E — New UI features

**E1. Auto-collapse mandatory when cleared**
When mandatory band becomes empty, auto-collapse and auto-expand suggested.
File: `src/components/daily-view.element.ts`
Tests: TESTING.md entry

**E2. "Not Today" action**
Add button to task-item for tasks in `radar` or `backlog` band only. Hides the card for the day using `snoozedUntil` set to tomorrow midnight — but does NOT increment `snoozeCount`. Zero score impact.
Files: `src/components/task-item.element.ts`, `src/components/bureau-app.element.ts`
Tests: TESTING.md entry

---

#### Not in this phase (tracked separately)

- `skipDays` for daily tasks — new feature, significant complexity
- Yearly ordinal weekday — GitHub #35
- Ordinal offset — GitHub #36
- Remove `disableSnooze` from `types.ts` — follow-up after confirming zero active usage

### Phase 5 — Website Update

Transfer hardened docs to website pages:
- `bureau-site/how-clear-works.html` — rewrite urgency bands section
- `bureau-site/commitment-field-guide.html` — rewrite band, flexible window, milestone sections; add hard-vs-flexible distinction

---

## Decisions Made This Session

**Confirmed / accepted:**
- Band-aware scoring: miss/skip penalties only when the task was in mandatory at rollover time
- Completing from radar/backlog: 1.5× tier reward bonus
- T4 is never mandatory (daily cadence, deadline, or snooze)
- T3 snooze escalation should eventually reach mandatory (threshold TBD)
- Flexible window snooze is probably wrong; "not today" (hide-for-day, no count) is better
- Hard date and flexible window are genuinely different concepts (not conflatable)
- The daily view sections are "two today + two upcoming," not a linear progression

**Rejected (proposed then walked back):**
- T1 flexible tasks → mandatory at suggestedDate (rejected: pay rent example shows this is wrong)

**Pending (need decisions before implementing):**
- Skip-of-suggested: zero penalty or small penalty?
- Backlog bonus multiplier: 1.5× confirmed?
- T3 mandatory snooze threshold: what count?
- Flexible task snooze: option A (remove), B (not-today), or C (no escalation)?

---

## Planned Work (In Order)

### 1. Import / Export

**Priority: next.** Before changing band or scoring rules, we want to be able to audit the real task list. Export (CSV or JSON) lets us inspect what's actually configured and reason through edge cases with real data.

Why first:
- Lets us find misconfigured tasks (hard date when should be flexible, wrong tier, etc.)
- Gives 100 real-world examples to test band-rule changes against
- If we implement band changes first, we might be fixing the wrong things

Scope:
- Export tasks to CSV (at minimum): title, tier, windowType, cadence, scheduleMode, suggestedDate, windowDeadline, leadTimeDays, snoozable, timeOfDay
- Import from that same CSV (or JSON) to restore or transfer data

---

### 2. All-Tasks Sorting / Grouping (tied to or after export)

The all-tasks page should allow grouping by:
- Window type (hard / flexible / milestone)
- Consequence tier (T1–T4)
- Time of day
- Cadence
- Snoozable
- Lead time setting

This gives in-app audit capability. Export gives offline audit capability. Both are useful.

---

### 3. Scoring Fix (band-aware penalties)

Fix the miss-penalty bug:
- Miss penalty only when task was in mandatory at rollover time
- Skip penalty only when task was in mandatory when skipped
- Backlog/radar completion → 1.5× tier reward

Files: `src/components/bureau-app.element.ts` (bootstrap + skip handler + completion handler), `src/data/scoring.ts` (new bonus function)

Tests: new scenarios in `scoring-scenarios.test.ts`, new unit tests in `scoring.test.ts`

---

### 4. Band Rule Changes

- T4 daily/deadline → suggested (not mandatory)
- T3 snooze escalation → fix ceiling to eventually reach mandatory
- (T1 at suggestedDate → stays suggested — this is already how it works; no change needed)

Files: `src/data/urgency.ts`

Tests: update `urgency.test.ts`

---

### 5. Flexible Task Snooze → "Not Today"

- Remove snooze button from flexible tasks
- Add "not today" action that hides the task for the day without incrementing snooze count
- Keep snooze on hard-date tasks

Files: task-item UI, bureau-app handler, urgency.ts (canSnooze logic)

Tests: TESTING.md manual entries

---

### 6. UI: Auto-Collapse Mandatory When Cleared

When mandatory band becomes empty, auto-collapse and expand suggested.

Files: `src/components/daily-view.element.ts`

Tests: TESTING.md

---

### 7. Days Off for Daily Tasks

**Problem:** There is no way to say "daily except Sunday" or "weekdays only." Users are currently working around this by creating weekly tasks with specific days selected (e.g. Mon–Sat), but that's a hack — those tasks behave like weekly tasks, not daily tasks, and they don't belong in the weekly cadence bucket philosophically.

**Solution:** Add an optional `skipDays` field to the Task type — an array of day-of-week numbers (0=Sun … 6=Sat) that are excluded from the daily recurrence.

**Use cases:**
- Sabbath observance: skip Sunday (or Saturday)
- Work-only tasks: skip Saturday and Sunday
- Tasks that conflict with a weekly commitment: skip Wednesday (young men's activity night)
- Shift workers: skip whatever days are their "weekend"

**Behavior:**
- On a skip day: task is hidden, period does not advance, no miss counted — same as paused for the day
- Rollover: skip days are not counted as misses
- Next suggestedDate computation: skips over excluded days to the next active day
- UI: day-of-week toggle in the task form, only visible when cadence is daily

**Migration:** Existing multi-day weekly tasks that are really "daily except X" should be reclassified to daily + skipDays once this feature exists. The current data is a workaround for a missing feature.

**Dependency:** Implement after the daily band-rules fix (T1/T2/T3/T4 daily band placement), since daily tasks are getting a rules overhaul anyway.

---

### 8. Hide Window Type and Schedule Mode Selectors for Daily Tasks

Daily tasks are hard windows by definition — the period is the day, so hard vs. flexible makes no difference anywhere in the system. The selector is confusing and inert for daily cadence.

Hide (or remove) the window type AND schedule mode fields in the task creation/edit form when cadence is `daily` or `multiple_per_day`. No data migration needed — existing values are inert, tasks behave correctly regardless of what those fields are set to.

---

### 9. Lead Time UI: Show Default Values

Pre-fill lead time input with the numeric default (3 for hard-date) instead of leaving it blank. User can see and edit the default without it being a hidden behavior.

Files: task creation/edit form

---

### 10. Yearly Cadence: Nth Weekday of a Month (GitHub #35)

**Problem:** Yearly tasks only support `hardMonthOfYear` + `hardDayOfMonth` (e.g. November 15). There is no way to anchor to an ordinal weekday within a month for yearly tasks, even though monthly cadence already supports this.

**Use cases:**
- Thanksgiving turkey — 4th Thursday of November. Milestone window, ~30 days lead time for planning and sourcing ingredients.
- Election Day / Voting — first Tuesday of November. Hard window, 14+ days lead time to register and find polling location.
- Mother's Day — 2nd Sunday of May. Father's Day — 3rd Sunday of June.
- Labor Day — 1st Monday of September. Memorial Day — last Monday of May.

**What's needed:**
- `getNextSuggestedDate` for yearly: if `ordinalWeek` + `hardDayOfWeek` + `hardMonthOfYear` are all set, compute via `nthWeekdayOfMonth(year, month, ordinalWeek, hardDayOfWeek)` instead of fixed DOM
- `deriveInitialSuggested` for yearly: same
- UI form: expose ordinal weekday picker for yearly tasks (currently only shown for monthly)

**Current workaround:** Set `hardMonthOfYear` + `hardDayOfMonth` to approximately the right date and accept it's off by a few days.

---

### 11. Ordinal Offset Days — "Sunday Before the 3rd Monday" (GitHub #36)

**Problem:** Some tasks are naturally anchored relative to a recurring event, not to a fixed calendar position. "The Sunday before the 3rd Monday" cannot be expressed because the 3rd Sunday can fall *after* the 3rd Monday depending on the month.

**Use cases:**
- Lodge presentation prep — the Sunday before the 3rd Monday meetup
- Thanksgiving grocery run — 2 days before the 4th Thursday of November
- Pre-meeting review — the Friday before the 2nd Tuesday of the month

**Current workaround:** Set due date to the anchor event (e.g. 3rd Monday) with enough lead time to surface the task beforehand. Semantically off ("due on Monday" when it's really "due before Monday") but functionally acceptable.

**Proposed solution:** Add `ordinalOffset?: number` to `RecurrenceConfig`. After computing the ordinal date, shift by this many days (negative = before, positive = after).

- `ordinalWeek: 3, hardDayOfWeek: Monday, ordinalOffset: -1` → Sunday before 3rd Monday
- `ordinalWeek: 4, hardDayOfWeek: Thursday, ordinalOffset: -2` → Tuesday before Thanksgiving

**Dependency:** Implement after #35 (yearly ordinal weekday), since both touch the same code paths in `getNextSuggestedDate` and `deriveInitialSuggested`.

---

### 12. Vision Docs + Website Update

Once the above is implemented and verified:
- Update `VISION.md` with the clean band/scoring decisions
- Update `bureau-site/how-clear-works.html` — rewrite the urgency bands card
- Update `bureau-site/commitment-field-guide.html` — rewrite band descriptions and add flexible window section
- Add CLAUDE.md note to consult VISION.md before changing band/scoring logic

Transfer the `docs/` rough drafts into the appropriate website pages. `docs/` folder can remain as an internal working area.

---

## Files Involved (Summary)

| File | Change |
|------|--------|
| `src/data/urgency.ts` | T4 daily/deadline stays suggested; T3 snooze ceiling fix |
| `src/data/scoring.ts` | Add backlog bonus function |
| `src/components/bureau-app.element.ts` | Band-aware miss/skip; bonus on completion from backlog |
| `src/components/daily-view.element.ts` | Auto-collapse mandatory; "not today" action |
| `src/data/urgency.test.ts` | New T4 cases; T3 snooze cases |
| `src/data/scoring.test.ts` | Backlog bonus unit test |
| `src/data/scoring-scenarios.test.ts` | New band-aware scenarios |
| `TESTING.md` | Manual entries for auto-collapse, not-today, UI band behavior |
| `CLAUDE.md` | Add: consult VISION.md before band/scoring changes |
| `VISION.md` | Update daily view section with clean rules |
| `bureau-site/how-clear-works.html` | Update urgency bands description |
| `bureau-site/commitment-field-guide.html` | Update band + flexible window sections |

---

## Docs Written This Session (rough drafts in `docs/`)

| File | Status |
|------|--------|
| `docs/flexible-windows.md` | Draft — good shape, open questions noted |
| `docs/open-design-questions.md` | Active — add resolved questions back to relevant docs |
| `docs/daily-view-band-rules.md` | Draft — decisions captured, ready for VISION.md |
| `docs/scoring-redesign.md` | Draft — bug documented, fix specified |
| `docs/implementation-roadmap.md` | This file |
