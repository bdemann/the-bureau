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

### Flexible Windows & Snooze → "Not Today" Model

**Resolved:** "Not Today" exists only for tasks in backlog/radar (before suggestedDate). It hides the card for the day with zero score consequence. Once the task enters suggested band, "Not Today" is gone — replaced by Snooze (50% penalty) and Skip (full penalty).

Non-interaction before suggestedDate is free (same as "Not Today"). Non-interaction after suggestedDate is a miss (50% penalty in suggested, full in mandatory).

See `scoring-redesign.md` for full penalty table.

---

### Scoring: Band-Aware Penalties

**Resolved:**
- Miss: 0 in backlog/radar, 50% in suggested, 100% in mandatory
- Snooze: not available pre-suggestedDate, 50% in suggested, 100% in mandatory
- Skip: **full penalty always**, regardless of band — skip is a period-level forfeit
- Complete from radar/backlog: 1.5× tier reward bonus
- `SUGGESTED_BAND_PENALTY_FACTOR = 0.5` as a named const

See `scoring-redesign.md`.

---

### T3 Snooze Escalation Ceiling

**Resolved:** T3 stays in suggested permanently. Never reaches mandatory. "Quality consequence" doesn't meet the bar for mandatory — things degrade but nothing breaks. T3 consequences still apply (50% penalties in suggested, full in mandatory if deadline arrives).

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
