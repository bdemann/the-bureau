# Open Design Questions

> Unresolved questions that need decisions before finalizing the vision docs or implementing changes.
> When a question is resolved, move it to the relevant vision doc with the decision recorded.

---

## UNRESOLVED

### Multi-DOM Flexible Tasks

**Q: How do multi-DOM flexible tasks (hardDaysOfMonth: [1, 15]) work with flexible windows?**

Example: monthly task due the 1st and the 15th.
- First occurrence: period is 1st–14th; suggestedDate = 1st; deadline = 14th?
- Second occurrence: period is 15th–last day; suggestedDate = 15th; deadline = last day?

This needs to be verified in code and documented. The behavior here is not well-understood.

---

### All-Tasks Sorting / Grouping

**Feature request:** The all-tasks view should allow sorting and grouping by:
- Window type (hard / flexible / milestone)
- Consequence tier (T1–T4)
- Time of day (morning / afternoon / evening / bedtime / anytime)
- Cadence (daily / weekly / monthly / etc.)
- Snoozable (yes / no / disabled)
- Lead time setting

Not blocking current implementation work.

---

### T2 Per-Task Escalation Threshold

**Q: Should the `skipEscalationThreshold` field be added to Task now or later?**

The default is 5 (`SKIP_ESCALATION_THRESHOLD` const). Some T2 tasks may warrant different thresholds. Implement the default first; add per-task configurability as a follow-on.

---

## RESOLVED

### Authorized Leave (GitHub #60, decided 2026-11-13)

**Use case:** illness or travel, when no commitment can be met. Per-commitment pause (`pausedUntil` / `pausedIndefinitely`) exists, but pausing ~90 commitments one by one and restoring them afterwards is impractical.

**Philosophy check:** this is not a new commitment type, tier, window type or cadence, and it adds no field to any commitment. It is an **app-level state** layered over the existing pause behaviour: while on leave, every commitment is treated as paused, and no commitment is written to.

**Resolved rules:**
- State: `AppState.leaveUntil` (last app day of leave, `YYYY-MM-DD`, or `null`) and `AppState.leaveHistory` (`{start, end}` spans, pruned after 90 days). Schema v7.
- While active, rollover, bands, daily load and the daily view all treat every commitment as paused (`isCurrentlyPaused(task, onLeave)`). No penalties, no rewards, and no change to miss/skip/snooze/remediation counts or streaks.
- Periods that end during a leave are forgiven when rollover next runs, through the same path a skip day uses (period advances, no miss, no streak change).
- Limits: presets of 3 and 7 days; at most 7 days per leave; at most 14 leave days in any rolling 90-day window. A preset larger than the remaining allowance is disabled and the dialog states how many days are left.
- Leave starts today (the current app day, respecting `dayResetHour`). **No retroactive leave.**
- "End now" ends leave immediately. The leave then covers the days before today, so only days actually taken count; ending on the day it started removes the leave entirely and uses 0 days.
- The app-day streak (`completionStreak`) is held during leave, and a gap fully covered by leave does not reset it.

**Existing per-commitment pause behaviour that leave inherits unchanged (not new rules):**
- A **one-time hard-date task** whose date passes while paused is still marked missed by the startup check (`bootstrap`), because that check does not look at pause. If the app is open on leave, the miss carries no score penalty (the band is `hidden`); if the app is first opened after leave ended, the task is charged as an ordinary mandatory miss. Leave does not forgive this.
- A commitment already paused individually stays paused after leave ends (leave never touches `pausedUntil` / `pausedIndefinitely`).
- Tasks whose period did NOT end during leave simply resume where they were (a weekly task keeps its current week).

---

### Flexible Windows & Snooze → "Not Today" Model

**Resolved:** "Not Today" exists only for tasks in backlog/radar (before suggestedDate). It hides the card for the day with zero score consequence. Once the task enters suggested band, "Not Today" is gone — replaced by Snooze (loss ratio 0.5 suggested / 1 mandatory) and Skip (loss ratio 2.5).

Non-interaction before suggestedDate is free (same as "Not Today"). Non-interaction after suggestedDate is a miss (loss ratio 2.5 in suggested, 5 in mandatory).

See `scoring-redesign.md` for full penalty table.

---

### Scoring: Band-Aware Penalties

**Resolved:**
- Miss: 0 in backlog/radar, loss ratio 2.5 in suggested, 5 in mandatory
- Snooze: not available pre-suggestedDate, loss ratio 0.5 in suggested, 1 in mandatory
- Skip: **loss ratio 2.5 always**, regardless of band — skip is a period-level forfeit
- Complete from radar/backlog: 1.5× gain bonus
- The old `SUGGESTED_BAND_PENALTY_FACTOR` const is gone; the band picks the loss ratio directly (settling score, #58)

See `scoring-redesign.md`.

---

### T3 Snooze Escalation Ceiling

**Resolved:** T3 stays in suggested permanently. Never reaches mandatory. "Quality consequence" doesn't meet the bar for mandatory — things degrade but nothing breaks. T3 consequences still apply (loss ratios halved in suggested, full in mandatory if deadline arrives).

---

### T4 at Window Deadline

**Resolved:** T4 stays in suggested even at windowDeadline. Never mandatory. T4 is aspirational — no external consequence, no score impact in any direction.

---

### T4 on Daily / Daily-Like Cadences

**Resolved:** T4 daily and T4 multi-day-weekly tasks stay in suggested always. Daily cadence does not force mandatory for T4.

---

### Daily Task Band Placement by Tier

**Resolved:** T1 mandatory always. T2 starts suggested, escalates to mandatory at skipStreak ≥ 5. T3 stays suggested. T4 stays suggested. Same rules apply to multi-day weekly tasks (hardDaysOfWeek.length ≥ 2).

Escalation threshold = 5. Remediation cap = 5. Symmetric: 5 periods to reach mandatory, 5 completions to earn back.

See `daily-view-band-rules.md`.

---

### Multi-Day Weekly Tasks Should Behave Like Daily Tasks

**Resolved:** Multi-day weekly tasks (hardDaysOfWeek.length ≥ 2) follow the same band rules as daily tasks. Each committed day is its own occurrence with no grace period. Same T1/T2/T3/T4 rules, same escalation threshold.

Water Tomatoes (Mon/Wed/Fri) and Mon–Sat workaround tasks both apply.

Snooze already auto-blocked by `isNextOccurrenceTomorrow` when tomorrow is a committed day. Band placement is the fix needed.

---

### The "Disable Snooze" Toggle

**Resolved: Remove it.** Only one task ever used it (Collect library books — a completed one-time task). All hard committed-day cases are already auto-handled by `isNextOccurrenceTomorrow`. The toggle is dead code.

---

### Schedule Mode and Window Type on Daily Tasks

**Resolved:** Both are inert for daily cadence. Hide both selectors in the task form when cadence is daily or multiple_per_day. No migration needed.

---

### Hard Date + Snooze + Lead Time vs. Flexible Window

**Resolved:** Genuinely different concepts. Test: "If I miss my preferred day, is the opportunity gone?" Yes → hard. No → flexible. See `flexible-windows.md`.

---

### Lead Time = Window Start?

**Resolved:** Same intent ("when do I want to know about this?"), different implementations. No code change needed. Docs should make the connection explicit so users aren't confused.
