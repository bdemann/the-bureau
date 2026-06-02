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
| Daily cadence (T1–T3) | Daily medication, morning run, brushing teeth |
| Weekly cadence with committed day (T1–T3) | Trash to curb (Wednesday), weekly meeting |
| Hard-date task on/past its due date (all tiers T1–T3) | Bill due today, appointment today |
| Flexible window deadline has arrived (T1–T3) | Monthly budget review, last day of the month |
| Snooze escalation (T2/T3 reaching mandatory threshold) | A T2 task snoozed 8+ times |

**T4 (aspirational) tasks are NEVER mandatory,** regardless of cadence, deadline, or snooze count. Forcing aspirational work mandatory contradicts the purpose of the tier.

### Suggested

Tasks recommended for today but not compulsory:

| Trigger | Example |
|---------|---------|
| Flexible window task whose suggestedDate has arrived (all tiers) | Budget review on the 1st (still has the rest of the month) |
| T4 tasks at/past their suggestedDate or deadline | Morning stretching, bookbinding project |
| Daily T4 tasks | Meditation, gratitude journal |
| Snooze escalation for T2/T3 below mandatory threshold | T3 task snoozed 5–14 times |

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

**Step 3 — Snooze escalation:**
- Overrides timing band upward (never downward)
- T1: 1 snooze → radar, 3 → suggested, 5 → mandatory
- T2: 2 snoozes → radar, 5 → suggested, 8 → mandatory
- T3: 5 snoozes → radar, 15 → suggested, [TBD threshold] → mandatory *(currently broken: T3 caps at suggested, never reaches mandatory — fix needed)*
- T4: never escalates beyond backlog

**Step 4 — Final band = max(timing, snooze escalation)**

---

## Key Decisions Made (2026-06-01/02)

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

### T3 snooze escalation must reach mandatory
T3 (quality consequence) tasks currently max out at suggested (never mandatory via snooze). This is a bug. A quality-consequence task snoozed 15+ times is a real neglect pattern and deserves mandatory status.

T3 threshold for mandatory: TBD (needs to be higher than T2's 8 snoozes, probably 20+).

### UI: Auto-collapse mandatory when cleared, expand suggested
When the mandatory band becomes empty (all items done for the current time-of-day slot), the UI should auto-collapse mandatory and auto-expand suggested. This makes the intended flow clear: mandatory first, then suggested once mandatory is clear.

---

## What the Bands Are NOT

- **Not a single priority queue.** Mandatory is not "most important work." It is "work with real consequences if skipped today."
- **Not a progression** from backlog to mandatory over time (though time does cause escalation via % logic and snooze count). A task can stay in backlog for weeks and then jump directly to mandatory on its deadline.
- **Not static.** A task's band changes every day as time passes and snooze counts change.
