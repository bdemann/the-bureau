# Open Design Questions

> Unresolved questions that need decisions before finalizing the vision docs or implementing changes.
> When a question is resolved, move it to the relevant vision doc with the decision recorded.

---

## Flexible Windows & Snooze

**Q: Should flexible tasks be snoozable?**

Current behavior: yes, snooze pushes suggestedDate forward 24h and increments snooze count.

Problem: consciously saying "not today" (snoozing) escalates urgency faster than simply ignoring the task. That's backwards — the window is supposed to be the flexibility.

Options:
- A) Remove snooze from flexible tasks entirely. The window is the snooze. You just don't do it today.
- B) "Not today" button that hides the task for the day without incrementing snooze count. Useful if you want to clear it from your view without penalty.
- C) Keep snooze but disable urgency escalation for flexible tasks (snooze count doesn't feed into band calculation).

Leading candidate: **B** — "not today" with no count increment. Gives the user the hide-it UX without the escalation side effect.

---

## Scoring: Band-Aware Penalties

**Q: Should miss/skip penalties depend on which band the task was in?**

Current behavior: any recurring task that rolls over without completion charges a full miss penalty, regardless of whether it was in mandatory, suggested, or backlog.

Problem: if you clear your mandatory section but have suggested/backlog tasks untouched, you still get penalized. VISION.md says "a successful day means completing everything in the top band" — which implies lower bands shouldn't penalize.

Proposed:
- Miss penalty only applies if the task was in mandatory at rollover time
- Suggested/radar/backlog rollover: no penalty
- Skip of mandatory: full skip penalty
- Skip of suggested: no penalty (it was optional)
- Completing from radar/backlog: bonus reward (1.5× tier reward) — "true patriot gets ahead"

**Needs confirmation:** Is zero penalty for skipping a suggested item correct, or should there be a small penalty?

---

## T3 Snooze Escalation Ceiling

**Q: Should T3 snooze escalation be able to reach mandatory?**

Current behavior: T3 snooze escalation maxes out at *suggested* (never reaches mandatory).

T2 reaches mandatory at 8 snoozes. T3 reaches suggested at 15, full stop.

Proposed: T3 should eventually reach mandatory (at a higher snooze count than T2), because a quality-consequence task that has been deferred 15+ times is a real problem, not just "suggested."

T4 should never reach mandatory (aspirational — no external consequence).

---

## T4 at Window Deadline

**Q: Should T4 tasks become mandatory when their window deadline arrives?**

Current behavior: yes, all tiers become mandatory at windowDeadline.

Proposed: T4 stays in suggested even at deadline. T4 is aspirational — there is no external consequence, and forcing mandatory contradicts the tier's purpose.

**Decision leaning:** Yes, T4 stays suggested at deadline. Needs implementation.

---

## T4 on Daily/Hard-Day Cadences

**Q: Should T4 daily tasks be mandatory?**

Current behavior: daily cadence → always mandatory, regardless of tier.

Proposed: T4 daily → suggested. A daily aspirational task (morning stretching, meditation) should never be mandatory.

**Decision leaning:** T4 stays suggested for daily cadence too. Needs implementation.

---

## All-Tasks Sorting / Grouping

**Feature request:** The all-tasks view should allow sorting and grouping by:
- Window type (hard / flexible / milestone)
- Consequence tier (T1–T4)
- Time of day (morning / afternoon / evening / bedtime / anytime)
- Cadence (daily / weekly / monthly / etc.)
- Snoozable (yes / no / disabled)
- Lead time setting

**Why:** Gives the user a way to audit their task list and understand what's configured how. Would surface misconfigured tasks (e.g., something set as hard when it should be flexible).

**Also related:** Export (CSV or JSON) would let the user do this analysis outside the app. Export is already on the roadmap.

---

## The "Disable Snooze" Toggle — Was It a Mistake?

**Q: Should `disableSnooze` exist as a user-facing setting, or should snoozeability be determined entirely by task type?**

**Context:** The toggle was likely added to handle "this hard task shouldn't be snoozable" cases (trash to the curb — the truck comes Thursday, snoozing is meaningless). But that case is already handled automatically by `isNextOccurrenceTomorrow`. The toggle may have been added out of confusion about what flexible windows were for.

**Review needed:** Go through all hard-window tasks in the export and ask: is there any hard task that *should* be snoozable? Under the revised philosophy:
- Flexible tasks: no snooze (the window is the flexibility)
- Daily hard: snooze already blocked automatically
- Hard weekly on committed day: snooze already blocked automatically
- Hard one-time tasks: snooze probably makes sense (pushing the date)
- Hard monthly/quarterly/yearly: snooze probably makes sense

If the only case for `disableSnooze` is "hard task on committed day," that's already handled by the system. The toggle may be redundant and confusing.

**Action:** Re-export after the current audit and review every hard-window task's snoozeability. Decide whether the toggle should be removed, kept as an advanced option, or replaced by system-inferred rules.

---

## Multi-Day Weekly Tasks Should Behave Like Daily Tasks

**Q: Should multi-day weekly tasks (hardDaysOfWeek with 2+ days) follow daily band rules rather than weekly band rules?**

**Context:** A task set to repeat Mon–Sat is functionally a daily task with the Sabbath off. Each committed day is its own occurrence. Snoozing to tomorrow is pointless (tomorrow is a committed day). The weekly cadence label is a scheduling mechanism, not a meaningful signal about how often the task fires.

Compare:
- **1-day weekly** (date night on Friday, lodge meeting on Tuesday) — genuinely weekly. One occurrence per week. Flexible window logic applies — if Friday slips, you have the weekend.
- **Multi-day weekly** (dishes Mon–Sat, tidy Mon–Sat) — functionally daily with a rest day. Every committed day is mandatory-or-not on its own merits.

**Proposed rules for multi-day weekly tasks:** same as daily —
- T1 → mandatory on each committed day
- T2 → suggested; escalates to mandatory after N skips
- T3 → suggested; open question whether it reaches mandatory
- T4 → always suggested

**What's already handled in code:**
- `isNextOccurrenceTomorrow` already blocks snooze when tomorrow is a committed day — so the snooze behavior is correct.

**What's NOT handled:**
- Band placement. Multi-day weekly tasks currently get treated like 1-day weekly tasks for urgency purposes. A Mon–Sat T3 task is hard-weekly, so it shows up mandatory on each of those days regardless of tier. Under the new philosophy it should start in suggested and escalate.

**Implementation note:** The threshold between "multi-day weekly = daily-like" and "1-day weekly = genuinely weekly" is `hardDaysOfWeek.length > 1`. Existing code already uses this boundary for snooze logic — band logic should use the same boundary.

**Open sub-questions:**
- [ ] Same T2/T3 skip thresholds as daily, or different? (Probably same — the behavior is the same.)
- [ ] Does this extend to multi-DOM monthly tasks (hardDaysOfMonth with 2+ days)? e.g., a task due the 1st and 15th — each occurrence is its own window, similar logic may apply.

---

## Daily Task Band Placement by Tier

**Q: Should T2 and T3 daily tasks start in mandatory, or in suggested with escalation?**

**Context:** Daily tasks have no window — today is the only day. So the tier question is genuinely: *does missing today matter enough to call it mandatory from the start?*

Tier descriptions answer this directly:
- T1 "Something bad happens" → mandatory from day one
- T2 "Things degrade over time" → important, but one miss isn't catastrophic → start in suggested, escalate
- T3 "Nothing breaks, quality drops" → start in suggested, maybe escalate
- T4 "Aspirational" → always suggested, never mandatory

**Proposed rules for daily tasks:**
- T1 → mandatory always
- T2 → suggested; escalates to mandatory after N skips (threshold TBD)
- T3 → suggested; open question whether it can reach mandatory (see below)
- T4 → suggested always

**Open sub-question: can T3 daily tasks reach mandatory via skip escalation?**

Options:
- A) T3 escalates to mandatory, but at a higher skip count than T2 (T2 faster, T3 slower)
- B) T3 caps at suggested (never mandatory — quality consequence doesn't rise to must-do)

**Open sub-question: what skip thresholds trigger escalation?**

T2 escalates faster than T3. Specific counts TBD — use real skip data from the task audit to calibrate. A task with skipStreak=12 (Start bedtime routine) should probably be in mandatory. A task with skipStreak=2 probably shouldn't be yet.

**Note:** This logic applies specifically to daily tasks. For weekly/monthly tasks, hard-date and window-deadline rules govern mandatory placement separately.

---

## The Mandatory Band Philosophy

**Mandatory should be short, honest, and achievable even on a hard day.**

The whole purpose of the mandatory band is to surface the things that genuinely MUST happen today — items worth making sacrifices to complete. This only works if the list is actually achievable and the items are genuinely non-negotiable.

If mandatory is 25 items long, it stops meaning anything. A person should be able to look at their mandatory band and say: "Whatever else happens today, these get done." That requires honest tiering and a system that doesn't inflate mandatory with things that are merely important.

**The guiding principle:** if you can't do it all today, do your mandatory. That's what makes the band worth having.

This principle should inform:
- Tier assignment (don't overtier — T1 should be rare and honest)
- Band escalation thresholds (don't escalate too fast or mandatory inflates)
- How mandatory is presented in the UI (prominent, distinct from suggested)

---

## Schedule Mode and Window Type on Daily Tasks

**Q: Do window type or schedule mode make any difference for daily cadence tasks?**

**Resolved: No. Both are inert for daily. Hide both selectors when cadence is daily or multiple_per_day.**

**Window type:** For a daily task the cadence period IS the day (midnight to midnight). Whether hard or flexible, both become mandatory immediately via Step 1, both snooze to tomorrow (the next period), and both charge a miss penalty on rollover identically. "Flexible daily" is a contradiction.

**Schedule mode:** For daily cadence, fixed and rolling both produce the same result — tomorrow. Fixed anchors to the next calendar day (tomorrow midnight). Rolling adds 1 day to completion time, which also resolves to tomorrow. No meaningful difference.

**Decision:** Daily tasks are always hard + fixed. Hide both the window type and schedule mode selectors in the task form when cadence is daily or multiple_per_day. Existing data needs no migration — both fields are inert and the task behaves correctly regardless of what they're set to.

**Implementation:** Hide window type AND schedule mode fields in the task creation/edit form when cadence = daily or multiple_per_day.

---

## Window Type on Daily Tasks

*(Merged into the entry above.)*

---

## Lead Time = Window Start?

**Q: Does hard vs. flexible window type make any difference for daily cadence tasks?**

**Resolved: No. Daily tasks are always hard windows. Hide the window type selector for daily cadence.**

For a daily task the cadence period IS the day (midnight to midnight). Whether hard or flexible:
- Both become mandatory immediately via Step 1 (hard: suggestedDate ≤ today; flexible: windowDeadline ≤ today)
- Both snooze to tomorrow, which is the next period anyway
- Both charge a miss penalty on rollover identically
- The window % radar logic never fires because Step 1 fires first

"Flexible daily" is a contradiction — there is no grace period when the period is the day.

**Decision:** Daily tasks are hard windows by definition. The window type selector should be hidden when cadence is daily (or multiple per day). Existing flexible daily tasks behave correctly — no migration needed; the field is just inert.

**Implementation:** Hide window type field in the task creation/edit form when cadence = daily or multiple_per_day.

---

## Lead Time = Window Start?

**Q: Are "lead time" and "when the window starts" the same concept?**

They're different implementations of the same intent: "when do I want to know about this?"

- Hard-date lead time: N days before THE date → shows in radar
- Flexible suggestedDate: the day it first shows as "due today" in suggested band
- Flexible window % logic: shows in backlog/radar before suggestedDate

They're not unified in the UI or the data model but serve similar purposes. Worth noting in docs so users aren't confused.

No code change needed, but the docs should make this connection explicit.

---

## Multi-DOM Flexible Tasks

**Q: How do multi-DOM flexible tasks (hardDaysOfMonth: [1, 15]) work with flexible windows?**

Example: monthly task due the 1st and the 15th.
- First occurrence: period is 1st–14th; suggestedDate = 1st; deadline = 14th?
- Second occurrence: period is 15th–last day; suggestedDate = 15th; deadline = last day?

This needs to be verified in code and documented. The behavior here is not well-understood.

---

## Hard Date + Snooze + Lead Time vs. Flexible Window

**Q: Is a hard-date task with snooze enabled and a custom lead time just a flexible window?**

**Resolved: they are genuinely different. Do not conflate.**

The test: **"If I miss my preferred day, is the opportunity gone?"**
- Yes → Hard
- No → Flexible (with a meaningful suggestedDate if you have a preferred day)

Key insight from real-world data audit: users often choose Hard when they have a preferred day (e.g., replace air filter on the 1st of the month) without realizing that Flexible windows also have meaningful suggested dates. The distinction isn't "do I have a preferred day" — it's "does missing that day forfeit the commitment."

After the suggested date:
- Hard → mandatory → then missed if still undone
- Flexible → still in suggested → works until deadline

Two flavors of flexible exist (both use `windowType: flexible`):
- **Anchored flexible**: meaningful preferred day (air filter on the 1st, budget review at month start, pay tithing early in the month) — set suggestedDate to the preferred day
- **Open flexible**: any day in the period equally valid (workout this week, work on project this month) — suggestedDate is arbitrary period-start

See `flexible-windows.md` for full treatment.
