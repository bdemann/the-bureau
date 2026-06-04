# Daily View — Band Rules

> Draft doc. Decisions from the 2026-06-01/02 design session.
> To be transferred to VISION.md and the website when finalized.

---

## The Four Bands

The daily view is NOT a linear progression from low to high urgency. It is two categories:

**"Things to do today"**
- **Mandatory** — must be addressed today; high negative consequence if ignored
- **Suggested** — recommended today; positive reward if done, little/no negative if not

**"Upcoming work"**
- **Radar** — awareness only; deadline approaching but no action required today
- **Backlog** — scheduled future work; not on the clock yet

The visual order (mandatory → suggested → radar → backlog) can look like a progression, which is confusing. It isn't. Mandatory and suggested are two flavors of "today." Radar and backlog are "not today."

**A successful day = completing everything in mandatory,** even if nothing else gets touched. That is the intended experience. Suggested/radar/backlog not done = not a failure.

---

## What Goes in Each Band

### Mandatory

Tasks that MUST be addressed today:

| Trigger | Example |
|---------|---------|
| T1 daily/daily-like tasks | Morning prayer, medication, brush teeth |
| T2 daily/daily-like after skipStreak ≥ 5 | Bedtime routine skipped 5+ nights in a row |
| Hard-date task on/past its due date (T1–T3) | Bill due today, appointment today |
| Flexible window deadline has arrived (T1–T3) | Budget review, last day of the month |
| Snooze escalation reaching mandatory threshold (T1/T2) | A T2 task snoozed 8+ times |

**T4 (aspirational) tasks are NEVER mandatory** under any circumstance.

### Suggested

Tasks recommended today — has real but reduced consequences:

| Trigger | Example |
|---------|---------|
| T2/T3/T4 daily/daily-like tasks | Shave, shower, make bed, practice piano |
| Flexible window task whose suggestedDate has arrived (all tiers) | Budget review on the 1st (window runs to the 30th) |
| T4 tasks at/past their suggestedDate or deadline | Bookbinding project, morning stretching |
| Snooze escalation below mandatory threshold | T2 task snoozed 5–7 times; T3 task snoozed 5–14 times |

### Radar

Tasks coming up soon — awareness, not action:

| Trigger | Example |
|---------|---------|
| Hard-date task within lead time (default: 3 days before due) | Trash day in 2 days |
| Flexible window ~75% used (≤25% of window remaining) | Budget review; 7 days left in the month |
| Flexible window T1–T2: ~50% used (≤50% remaining for T2) | Higher-consequence tasks escalate to radar sooner |

### Backlog

Not due yet; no pressure today:

| Trigger | Example |
|---------|---------|
| Hard-date task beyond lead time window | Annual physical scheduled for August; it's June |
| Flexible window task before suggestedDate | Budget review; it's June 28th and the window starts July 1st |

---

## The Band Calculation Algorithm

Bands are computed at render time from task state + today's date. They are never stored. The calculation runs four steps:

**Step 0 — Hidden check (never shown):**
- Completed for this period
- Currently snoozed
- Currently paused
- Marked as missed (`missedAt` is set)
- Start date hasn't arrived yet

**Step 1 — Hard mandatory cases:**
- Daily or multiple-per-day cadence + tier ≤ 3 → mandatory
- Weekly with committed days (hardDaysOfWeek), today is one of those days, tier ≤ 3 → mandatory
- Hard-date task whose due date has arrived, tier ≤ 3 → mandatory
- Flexible window whose deadline has arrived, tier ≤ 3 → mandatory

(T4 skips all Step 1 mandatory assignments — it falls through to Step 2.)

**Step 2 — Timing band (runs if Step 1 didn't assign mandatory):**
- Hard-date: within lead time → radar; beyond lead time → backlog
- Flexible window: suggestedDate arrived → suggested; approaching deadline → radar; otherwise → backlog
- Milestone: deadline-proximity logic → radar/backlog

**Step 3 — Snooze escalation (for hard-date and window tasks, not daily-like):**
- Overrides timing band upward (never downward)
- T1: 1 snooze → radar, 3 → suggested, 5 → mandatory
- T2: 2 snoozes → radar, 5 → suggested, 8 → mandatory
- T3: 5 snoozes → radar, 15 → suggested *(caps at suggested — never reaches mandatory)*
- T4: never escalates beyond backlog

*Note: daily and daily-like tasks use skip escalation (see Band Placement by Tier section), not snooze escalation.*

**Step 4 — Final band = max(timing, snooze escalation)**

---

## Band Placement by Tier — Daily and Daily-Like Tasks

"Daily-like" includes: daily cadence, multiple-per-day cadence, and multi-day weekly tasks (`hardDaysOfWeek.length >= 2`). All follow the same tier rules because each committed day is its own occurrence with no grace period.

| Tier | Starting band | Escalation |
|------|--------------|------------|
| T1 | **Mandatory** always | — |
| T2 | Suggested | → Mandatory after `skipStreak >= SKIP_ESCALATION_THRESHOLD` (default 5, configurable per task) |
| T3 | Suggested | Stays suggested — never reaches mandatory |
| T4 | Suggested | Stays suggested — never reaches mandatory |

**Why T3 stays suggested:** T3 is "quality consequence" — nothing breaks, things just degrade. Mandatory should be reserved for things genuinely worth making sacrifices to complete. T3 doesn't meet that bar even when repeatedly deferred.

**Why T2 escalates:** T2 is "soft consequence — things degrade over time." Consistently missing T2 tasks is a real neglect pattern. After 5 consecutive missed periods, it deserves mandatory attention.

**Why the threshold is 5:** Symmetric with `REMEDIATION_CAP = 5`. You avoided for 5 periods to reach mandatory; you need 5 consecutive completions to earn back to suggested.

---

## Key Decisions Made (2026-06-01/03)

### T4 is always consequence-free and never mandatory
T4 (aspirational) tasks never reach mandatory band under any circumstance:
- Not from daily cadence
- Not from window deadline arriving
- Not from snooze count
- This is consistent with T4's score rules: T4 has zero consequence in any direction

### T1 flexible tasks at suggestedDate → suggested (NOT mandatory)
**Proposed then rejected:** T1 flexible tasks should jump straight to mandatory when their suggestedDate arrives.

**Why rejected:** "Pay rent on the 15th" is T1 flexible monthly. If the suggestedDate = 15th, you don't want it blaring mandatory from the 15th to the 30th. The whole point of the flexible window is that any day in the window is acceptable. T1's urgency comes from heavier penalties and faster snooze escalation — not from premature mandatory band placement.

**Correct rule:** All tiers enter suggested when their flexible suggestedDate arrives. They reach mandatory when the windowDeadline arrives (T1–T3) or from snooze escalation.

### T3 snooze escalation caps at suggested — intentional
T3 (quality consequence) tasks cap at suggested via snooze escalation and never reach mandatory. This is intentional: "quality consequence" means things degrade but nothing breaks. Mandatory is reserved for tasks genuinely worth making sacrifices to complete; T3 doesn't meet that bar.

### UI: Auto-collapse mandatory when cleared, expand suggested
When the mandatory band becomes empty (all items done for the current time-of-day slot), the UI should auto-collapse mandatory and auto-expand suggested. This makes the intended flow clear: mandatory first, then suggested once mandatory is clear.

---

## The Mandatory Band Philosophy

**Mandatory should be short, honest, and achievable even on a hard day.**

The mandatory band only works if a person can look at it and say: *"Whatever else happens today, these get done."* That requires the list to be genuinely achievable and every item on it to be genuinely non-negotiable.

An inflated mandatory band — full of things that are merely important rather than truly required — defeats the purpose. If everything is mandatory, nothing is. The value of mandatory comes from its selectivity.

**If you can't do it all today, do your mandatory. Everything else is a bonus.**

This principle governs:
- How tiers are assigned (T1 should be rare and honest — real consequences, not just "important")
- How escalation thresholds are set (don't escalate T2/T3 into mandatory too fast)
- How mandatory is presented in the UI (visually distinct, weighted differently than suggested)

---

## What the Bands Are NOT

- **Not a single priority queue.** Mandatory is not "most important work." It is "work with real consequences if skipped today."
- **Not a progression** from backlog to mandatory over time (though time does cause escalation via % logic and snooze count). A task can stay in backlog for weeks and then jump directly to mandatory on its deadline.
- **Not static.** A task's band changes every day as time passes and snooze counts change.
