# Scoring Redesign

> Draft doc. Decisions from the 2026-06-01/03 design sessions.
> Describes the bug found and the fully redesigned scoring model.

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

## Penalty Table

| Action | Backlog / Radar | Suggested | Mandatory |
|--------|----------------|-----------|-----------|
| Miss (rollover, no interaction) | **0** | **50%** | **100%** |
| Snooze | — (not available) | **50%** | **100%** |
| Skip | **100%** | **100%** | **100%** |
| Not Today | **0** | — | — |

**Skip always carries the full penalty regardless of band.** Skip is a period-level decision — forfeiting the whole commitment for this period. It doesn't matter whether you make that decision on day 1 or day 25 of the window; the consequence of not completing the period is the same.

**Miss scales with band** — the penalty reflects where the task was when you didn't show up.

**Snooze scales with band** — deferring a task during its suggested window is less serious than deferring a mandatory task.

---

## Score Constants

```typescript
/** Multiplier applied to miss and snooze penalties when the task was in suggested band. */
const SUGGESTED_BAND_PENALTY_FACTOR = 0.5;

/** Skip streak threshold at which a T2 daily/daily-like task escalates from suggested to mandatory. */
const SKIP_ESCALATION_THRESHOLD = 5;

/** Maximum remediation completions required to exit mandatory band after escalation. */
const REMEDIATION_CAP = 5;
```

`SKIP_ESCALATION_THRESHOLD` and `REMEDIATION_CAP` are intentionally the same value: you avoided for 5 periods to reach mandatory, so you need 5 consecutive completions to earn your way back to suggested. This is symmetric and predictable.

The escalation threshold is also configurable per task via a `skipEscalationThreshold` field (optional; defaults to `SKIP_ESCALATION_THRESHOLD` when absent).

---

## Completion Rewards

| Band when completed | Reward |
|--------------------|--------|
| Mandatory | tier reward (1×) |
| Suggested | tier reward (1×) |
| Radar | 1.5× tier reward ("patriot gets ahead" bonus) |
| Backlog | 1.5× tier reward ("patriot gets ahead" bonus) |

Completing work before it becomes urgent is rewarded. Completing from radar or backlog earns the early-completion bonus.

---

## Tier Base Values (No Change)

| Tier | Reward | Miss | Skip | Snooze/each |
|------|--------|------|------|-------------|
| 1 | 1.5 | 22.5 | 9.0 | 4.5 |
| 2 | 1.0 | 15.0 | 6.0 | 3.0 |
| 3 | 0.5 | 7.5 | 3.0 | 1.5 |
| 4 | 0 | 0 | 0 | 0 |

T4 remains consequence-free in all directions. The values above are for mandatory band. Multiply by `SUGGESTED_BAND_PENALTY_FACTOR` for suggested-band miss and snooze.

---

## T4 Scoring (No Change)

T4 (aspirational) tasks are consequence-free in all directions regardless of band. No miss, skip, snooze, or completion reward. This is unchanged.

---

## N-Scaling (No Change)

Formula: `max(0.5, 10 / max(1, activeTasks))`. Applied to all score changes.

---

## Implementation Notes

### Band-aware miss (the bug fix)
In `bootstrap()` in `bureau-app.element.ts`: before applying a miss penalty, compute what band the task was in for the day it rolled over from. Apply `SUGGESTED_BAND_PENALTY_FACTOR` if suggested, 0 if radar/backlog, full if mandatory.

### Band-aware snooze
In the snooze handler: check `getDailyBand(task, today)` at snooze time. Apply `SUGGESTED_BAND_PENALTY_FACTOR` if suggested.

### Skip penalty (unchanged logic, unchanged amount)
Skip always applies the full tier skip penalty regardless of band. No change needed to skip handler beyond keeping it full.

### Backlog/radar completion bonus
In the completion handler: check band at completion time. If radar or backlog, multiply reward by 1.5.

### Remediation cap
When setting `remediationCount` after a streak, cap at `REMEDIATION_CAP` (5) instead of using the full streak value.

### Remove disableSnooze
The `disableSnooze` field and its UI toggle should be removed. All cases it was meant to handle are covered by:
- `isNextOccurrenceTomorrow` (auto-blocks snooze on hard committed-day tasks)
- "Not today" replacing snooze for pre-suggestedDate tasks
- T4 having no snooze consequences anyway

---

## Impact on Existing Tests

`scoring-scenarios.test.ts` currently tests whole-day scenarios assuming every miss is a full penalty. After this change:
- New scenarios needed: "cleared mandatory, ignored suggested → healthy score"
- New scenarios needed: "skipped suggested task → full skip penalty"
- New scenarios needed: "snoozed suggested task → 50% snooze penalty"
- New scenarios needed: "completed from backlog → 1.5× reward"

`scoring.test.ts` will need the new constants tested directly.
