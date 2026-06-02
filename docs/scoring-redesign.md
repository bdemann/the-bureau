# Scoring Redesign

> Draft doc. Decisions from the 2026-06-01/02 design session.
> Describes the bug found and the proposed fix.

---

## The Bug: Miss Penalties Applied Regardless of Band

**Current behavior:** When the app starts and detects that a recurring task's period ended without completion, it applies a miss penalty to the patriot score — for every such task, regardless of which band it was in.

**The problem:** A task sitting in `suggested`, `radar`, or `backlog` that you never touched gets the same miss penalty as a task that was in `mandatory` and you ignored. This violates the intended experience.

VISION.md says: *"A successful day means completing everything in the top band, even if nothing else gets touched."* If completing the top band constitutes success, tasks in other bands must not penalize you for going untouched.

**Observed symptom:** Clearing the mandatory section entirely still resulted in a score deduction the next morning. The deduction came from suggested/backlog tasks that rolled over without completion.

---

## The Fix: Band-Aware Scoring

### Miss penalty (auto-rollover without completion)

| Band at time of rollover | Current | Proposed |
|--------------------------|---------|----------|
| Mandatory | full miss penalty | **same** |
| Suggested | full miss penalty (bug) | **no penalty** |
| Radar | full miss penalty (bug) | **no penalty** |
| Backlog | full miss penalty (bug) | **no penalty** |

**Implementation:** In `bootstrap()` in `bureau-app.element.ts`, before applying a miss penalty, compute what band the task was in for the day it rolled over from. If the band was not mandatory, skip the penalty.

### Skip penalty (explicit user action)

| Band when skipped | Current | Proposed |
|-------------------|---------|----------|
| Mandatory | full skip penalty | **same** |
| Suggested | full skip penalty | **no penalty** (it was optional) |
| Radar / Backlog | full skip penalty | **no penalty** |

**Implementation:** In the skip handler in `bureau-app.element.ts`, check `getDailyBand(task, today)` before applying the skip penalty.

### Completion reward

| Band when completed | Current | Proposed |
|--------------------|---------|----------|
| Mandatory | tier reward | **same** |
| Suggested | tier reward | **same** |
| Radar | tier reward | **1.5× tier reward** ("patriot gets ahead" bonus) |
| Backlog | tier reward | **1.5× tier reward** ("patriot gets ahead" bonus) |

**Rationale:** Completing work ahead of schedule — before it's even in your suggested or radar window — shows proactive follow-through. This should be rewarded more than completing something that was already pressing. The bonus amount (1.5×) is a starting point; may need tuning after testing against real usage.

**Important constraint:** The backlog bonus must remain smaller than the miss penalty for the same tier. Otherwise the incentive to avoid missing mandatory work would be undermined by farming backlog completions.

### Snooze penalty

No change proposed. Snooze still costs points. Snooze is a conscious deferral action regardless of band.

*However:* if the decision on flexible-window snooze (see open questions) resolves to "no snooze on flexible tasks," then flexible task snoozePenalty becomes moot.

---

## T4 Scoring (No Change)

T4 (aspirational) tasks are already consequence-free in all directions:
- No miss penalty
- No skip penalty
- No snooze penalty
- No completion reward

This is intentional and correct. No change.

---

## Tier Base Values (Current — No Change to Values)

| Tier | Reward | Miss | Skip | Snooze/each |
|------|--------|------|------|-------------|
| 1 | 1.5 | 22.5 | 9.0 | 4.5 |
| 2 | 1.0 | 15.0 | 6.0 | 3.0 |
| 3 | 0.5 | 7.5 | 3.0 | 1.5 |
| 4 | 0 | 0 | 0 | 0 |

With the N-scaling multiplier (`max(0.5, 10 / activeTasks)`), these values apply at N=10. The values themselves are not changing — only when and whether they're applied.

---

## Score Ranges (No Change)

| Score | Label |
|-------|-------|
| 130+ | Patriot |
| 100–129 | Loyal Citizen |
| 70–99 | Citizen |
| 40–69 | Disengaged |
| 0–39 | Suspected Communist (rock bottom) |

---

## Impact on Existing Tests

`scoring-scenarios.test.ts` currently tests whole-day scenarios (all tasks complete, all miss, half/half). After this change:

- "Day of nothing" (all miss) still results in rock bottom IF all tasks were in mandatory band
- If tasks were in suggested/backlog, "doing nothing" no longer crashes the score
- New scenarios needed: "cleared mandatory, ignored suggested → healthy score"

`scoring.test.ts` tests the pure scoring functions — those don't change.

New tests needed:
- Band-aware miss: task in mandatory → penalty applied; task in suggested → no penalty
- Band-aware skip: same
- Backlog completion bonus: completing from backlog gives 1.5× reward

---

## Open Questions

- [ ] Is zero penalty for skipping a suggested item the right call? Or a small penalty (e.g., 25% of normal skip penalty)?
- [ ] Is 1.5× the right backlog bonus multiplier? Should radar and backlog have different multipliers?
- [ ] Does the N-scaling (`countActiveTasks`) need to change? Currently counts all non-completed, non-missed, non-paused tasks. Should it only count mandatory + suggested tasks?
