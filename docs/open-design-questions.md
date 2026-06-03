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
