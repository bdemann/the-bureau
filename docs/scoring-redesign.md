# Scoring Redesign

> Decisions from the 2026-06-01/03 design sessions (band-aware rules, remediation)
> and the 2026-11-13 decision to adopt the **settling score** model (GitHub #58).
> Describes the bug found, the band-aware rules, and the scoring model.

---

## The Bug: Miss Penalties Applied Regardless of Band

**Current behavior:** When the app starts and detects that a recurring task's period ended without completion, it applies a miss penalty to the patriot score — for every such task, regardless of which band it was in.

**The problem:** A task sitting in `suggested`, `radar`, or `backlog` that you never touched gets the same miss penalty as a task that was in `mandatory` and you ignored. This violates the intended experience.

VISION.md says: *"A successful day means completing everything in the top band, even if nothing else gets touched."* If completing the top band constitutes success, tasks in other bands must not penalize you for going untouched.

**Observed symptom:** Clearing the mandatory section entirely still resulted in a score deduction the next morning. The deduction came from suggested/backlog tasks that rolled over without completion.

---

## Terminology

- **Miss** — the task's period ended with no interaction. No complete, snooze, or skip.
- **Skip** — the user explicitly chose not to complete this period. Advances to the next period.
- **Snooze** — the user deferred to tomorrow within the same period.
- **Not Today** — a free UI action (pre-suggestedDate only) that hides the task card for the day with no score consequence.
- **Complete** — the task was done.

---

## Action Availability by Band

| Band | Complete | Snooze | Skip | Not Today |
|------|----------|--------|------|-----------|
| Backlog / Radar (before suggestedDate) | ✓ (bonus) | — | ✓ | ✓ free |
| Suggested (after suggestedDate) | ✓ | ✓ | ✓ | — gone |
| Mandatory | ✓ | ✓ | ✓ | — gone |

"Not Today" disappears once the task enters suggested or mandatory. The free zone is before the suggestedDate.

---

## Settling Score Model (GitHub #58)

The old model accumulated points: every miss cost about 15x what a completion earned, so the score only held above roughly 94% completion and fell to 0 below it. Real data (90 active commitments, about 24 scored occurrences a day, 52% completion) sat at 7 points; a perfect day earned about +15 and a day away cost about -149. The rank carried no information, and recovery was slower than a habit forms.

The settling model replaces it. The score `S` stays in 0-200 and **converges to a level set by how consistently commitments are met**. Rank thresholds (130 / 100 / 70 / 40) do not change.

### Share

Every scored event is weighted by the commitment's share of a normal day's load.

- `tierWeight`: T1 = 3, T2 = 2, T3 = 1, T4 = 0. T4 stays consequence-free in every direction.
- `occurrencesPerDay(task)`: how often the commitment comes due, per day.
  - daily / multiple-per-day: `frequencyPerPeriod` per day, scaled by `(7 - skipDays) / 7` when skip days are set
  - weekly: occurrences per week / 7 (a multi-day weekly counts each committed day)
  - monthly: occurrences per month / 30 (multi-day-of-month counts each selected day)
  - quarterly: occurrences per quarter / 91
  - annually: occurrences per year / 365
  - one-time tasks: 0
- `dailyLoad` = sum over active, unpaused tasks of `tierWeight x occurrencesPerDay`.
- `share(task) = tierWeight / max(dailyLoad, tierWeight)`. A single event can never count for more than a whole day, and a full day's completions always sum to about one day, whatever the list size.

This replaces `taskScaleMultiplier`, `REFERENCE_TASK_COUNT` and the 0.5 floor.

### Gains pull toward 200, losses pull toward 0

- `DAILY_RATE = 0.07`: a perfect day closes 7% of the gap to 200.
- Complete: `S += DAILY_RATE x share x (200 - S) x earlyBonus`. `earlyBonus` is 1.5 when completed from radar or backlog, otherwise 1.
- Docket cleared (once a day): `S += DAILY_RATE x 0.2 x (200 - S)`.
- Milestone progress: one quarter of a completion.
- Penalty: `S -= DAILY_RATE x share x lossRatio x streakMultiplier x S`.

Gains shrink as the score nears 200 and losses shrink as it nears 0, so the score cannot run off either end.

### Loss ratios

| Action | Backlog / Radar | Suggested | Mandatory |
|--------|----------------|-----------|-----------|
| Miss (rollover, no interaction) | **0** | **2.5** | **5** |
| Snooze | - (not available) | **0.5** | **1** |
| Skip | **2.5** | **2.5** | **2.5** |
| Not Today | **0** | - | - |

**Skip carries the same loss ratio regardless of band.** Skip is a period-level decision: forfeiting the whole commitment for this period. It does not matter whether you decide on day 1 or day 25.

**Miss scales with band**: the penalty reflects where the task was when you did not show up. **Snooze scales with band**: deferring in the suggested window is less serious than deferring a mandatory task.

`streakMultiplier = 1 + 0.1 x min(depth, 5)` (at most x1.5), where `depth` is the skip streak or snooze count after the action. Snooze is no longer also multiplied by the snooze count, and the old "minimum 1 point" floors and 30-point snooze cap are gone (artifacts of the old scale).

### Absence cap

At startup rollover, at most **2 missed periods per task** are charged, however many elapsed. Penalties are applied one at a time in a stable (task-list) order, since each depends on the running score.

### Intended equilibria

With completion rate `p` and blended loss ratio `k`, the score settles at `200p / (p + k(1 - p))`.

For a typical mix of misses and skips, `k` is about 3: about 85% completion holds Patriot, 75% Loyal Citizen, 62% Citizen, 43% Disengaged Citizen. Someone whose failures are all mandatory misses (`k = 5`) needs about 90% for Patriot.

No migration: the stored score carries over as is and starts settling from there.

### Judgement calls on cases the spec did not list

- Daily with `skipDays`: scaled by the fraction of days the task is actually scheduled.
- Weekly with one selected day or none: `frequencyPerPeriod` per week; with 2+ selected days: the number of selected days.
- Monthly / quarterly with 2+ `hardDaysOfMonth`: the number of selected days per period; otherwise `frequencyPerPeriod`.
- Rolling schedule mode counts the same as fixed (the same cadence length).
- A milestone with no recurrence but a `progressCadence` comes due at the progress cadence's rate (`frequencyPerPeriod` over its period) rather than 0, because it asks for sessions on that rhythm. A one-time task without one is 0.
- The rollover detects one missed period per task per launch, so the absence cap of 2 is a ceiling that is not currently reached; it is enforced by a pure function (`capMissedPeriods`) at the call site.

---

## Score Constants

All in `src/data/scoring.ts`, all exported so they can be tuned.

```typescript
export const MIN_SCORE = 0;
export const MAX_SCORE = 200;
export const DAILY_RATE = 0.07;
export const DOCKET_CLEARED_FRACTION = 0.2;
export const EARLY_COMPLETION_BONUS = 1.5;
export const MILESTONE_PROGRESS_FRACTION = 0.25;
export const STREAK_MULTIPLIER_STEP = 0.1;
export const STREAK_MULTIPLIER_MAX_DEPTH = 5;
export const MAX_MISSED_PERIODS_CHARGED = 2;
export const TIER_WEIGHTS = {1: 3, 2: 2, 3: 1, 4: 0};
export const LOSS_RATIOS = {
    missMandatory: 5, missSuggested: 2.5, skip: 2.5,
    snoozeMandatory: 1, snoozeSuggested: 0.5,
};
export const SKIP_ESCALATION_THRESHOLD = 5;
export const REMEDIATION_CAP = 5;
```

`SKIP_ESCALATION_THRESHOLD` and `REMEDIATION_CAP` are intentionally the same value: you avoided for 5 periods to reach mandatory, so you need 5 consecutive completions to earn your way back. Symmetric and predictable.

The escalation threshold is also configurable per task via a `skipEscalationThreshold` field (optional; defaults to `SKIP_ESCALATION_THRESHOLD` when absent).

---

## Remediation Model

Remediation tracks how many consecutive completions are needed before a skip/snooze streak is forgiven.

### Key rule: streaks are never reset on remediation entry

The current code resets `skipStreak` and `snoozeCount` to 0 when remediation starts. **This is wrong.** A snoozeCount of 20 that gets reset to 0 after one completion means 2 days of remediation followed by a snooze lands at snoozeCount=3 — not 20 or 18 as expected.

### Correct behavior

| Event | remediationCount | snoozeCount / skipStreak |
|-------|-----------------|--------------------------|
| First completion after a streak | `min(REMEDIATION_CAP, max(skip, snooze))` | **unchanged** — stays live |
| Each completion during remediation | decrements by 1 | unchanged |
| remediationCount hits 0 | cleared | **cleared to 0** — fully forgiven |
| Skip or snooze during remediation | cleared (fail) | increments normally |

The streaks remain live throughout remediation. Urgency bands still reflect the real pattern while you're earning your way out. The only reward for completing all 5 is a clean slate.

**Example:** snoozeCount=20, REMEDIATION_CAP=5
- Complete → remediationCount=5, snoozeCount=20
- Complete again → remediationCount=4, snoozeCount=20
- Snooze (fail) → remediationCount=0, snoozeCount=21
- Back to normal with snoozeCount=21

**Success path:** 5 consecutive completions → remediationCount=0 → snoozeCount=0, skipStreak=0.

---

## Completion Rewards

| Band when completed | Gain multiplier |
|--------------------|-----------------|
| Mandatory | 1x |
| Suggested | 1x |
| Radar | 1.5x ("patriot gets ahead" bonus) |
| Backlog | 1.5x ("patriot gets ahead" bonus) |

Completing work before it becomes urgent is rewarded. T4 earns nothing (weight 0). A one-time task contributes 0 to the daily load but its completion still earns its `share`.

---

## T4 Scoring

T4 (aspirational) tasks are consequence-free in all directions regardless of band. No miss, skip, snooze, or completion reward. `tierWeight(4) = 0` makes this fall out of the formulas.

---

## Implementation Notes

### Band-aware miss (the bug fix)
In `bootstrap()` in `bureau-app.element.ts`: before applying a miss penalty, compute what band the task was in for the day it rolled over from. The band picks the loss ratio (5 mandatory, 2.5 suggested, 0 radar/backlog). Penalties are applied one at a time, capped at 2 missed periods per task.

### Band-aware snooze
In the snooze handler: check `getDailyBand(task, today)` at snooze time. Loss ratio 1 mandatory, 0.5 suggested.

### Skip penalty
Skip always applies loss ratio 2.5 regardless of band.

### Backlog/radar completion bonus
In the completion handler: check band at completion time. If radar or backlog, the gain is multiplied by 1.5.

### Remediation rewrite (`remediation.ts`)
Three changes from current behavior:
1. `computeRemediationOnComplete` — on first completion after a streak, set `remediationCount = min(REMEDIATION_CAP, max(skipStreak, snoozeCount))` but do **not** reset `skipStreak` or `snoozeCount`. Only clear them when `remediationCount` reaches 0.
2. `computeRemediationOnSkip` — if in remediation, `skipStreak++` normally and `remediationCount = 0`. Do not set `skipStreak = remediationCount`.
3. `computeRemediationOnSnooze` — same: `snoozeCount++` normally and `remediationCount = 0`. Do not set `snoozeCount = remediationCount`.

### Remove disableSnooze
The `disableSnooze` field and its UI toggle should be removed. All cases it was meant to handle are covered by:
- `isNextOccurrenceTomorrow` (auto-blocks snooze on hard committed-day tasks)
- "Not today" replacing snooze for pre-suggestedDate tasks
- T4 having no snooze consequences anyway

---

## Tests

- `scoring.test.ts` covers every pure function (share, gains, penalties, bounds, absence cap).
- `scoring-scenarios.test.ts` simulates 120 days at 50/62/75/85/95% completion for all-mandatory-miss, all-skip and mixed failures, asserting the final score is within 8 of `200p / (p + k(1 - p))`; plus 14 perfect days from 0, one fully missed day from 130, and a 10-day vs 2-day absence.
