# Implementation Roadmap

> Session: 2026-06-01/02
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

### 7. Lead Time UI: Show Default Values

Pre-fill lead time input with the numeric default (3 for hard-date) instead of leaving it blank. User can see and edit the default without it being a hidden behavior.

Files: task creation/edit form

---

### 8. Vision Docs + Website Update

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
