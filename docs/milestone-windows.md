# Milestone Windows

> Draft doc — to be refined and transferred to the website.

---

## What a Milestone Is

A milestone is a multi-session project you work toward until it is genuinely finished. Each time you log progress, the app hides the item for the rest of the day and brings it back tomorrow. When you're done, you mark it complete — permanently.

The defining feature: **a single checkmark doesn't mean you're done.** It means you did the work today. You'll be back.

---

## The Core Question: Milestone, Flexible, or Goal?

Three types handle long-horizon work, and they're easy to confuse.

### Is it one session or many?

> "Bake a loaf of sourdough this month."

If you can do this in one sitting — gather ingredients, bake, done — it's a **flexible window task**, not a milestone. You need to do it once before the month ends. Any day works. Set it as flexible with a suggestedDate and a window deadline.

> "Learn to bake sourdough."

If this involves research, purchasing supplies, failed attempts, learning technique, and a final success — that's many sessions across weeks. That's a **milestone**.

The test: *Will one checkmark finish this?* If yes → flexible or hard window. If no → milestone.

### Is it scheduled or aspirational?

> "Write a novel." *(someday)*

If there's no real deadline and you're not committing to sessions, it's a **goal** — context and direction, with no urgency band and no score impact. Goals don't show up in the daily view.

> "Write a novel." *(I'm actively working on it, aiming for December)*

If you're committing to regular sessions and tracking progress toward an actual finish line, that's a **milestone** — it lives in your daily view, expects work, and creates urgency as the deadline approaches.

The test: *Am I scheduling sessions and expecting accountability?* If yes → milestone. If not yet → goal.

---

## How the Daily View Handles Milestones

### After logging progress
The milestone hides for the rest of the day. It reappears tomorrow. You've done your work; it doesn't nag you again until you wake up.

### Progress cadence (optional)
If you want to work on a milestone N times per week, set a progress cadence. Once you hit your weekly quota, the milestone hides until the next week starts. Without a cadence, the default behavior applies: hide for the rest of today, back tomorrow.

### Marking it done
"All done" permanently completes the milestone. It leaves your daily view entirely. Use this when the project is genuinely finished — not just "I made good progress today."

### Deadline and urgency
Without a deadline, a milestone sits in the backlog indefinitely. With a deadline, it surfaces and escalates as the deadline approaches — same urgency arc as a flexible window task. If the deadline arrives and the milestone isn't complete, it becomes mandatory.

---

## The Monthly Project Question

Some things called "monthly projects" are actually just **flexible window tasks** — one session, one completion, sometime this month. The "monthly" part is the cadence, not the scope.

| What you mean | Type | Example |
|---------------|------|---------|
| Do this once this month, any day | Flexible window (recurring monthly) | Bake a new recipe this month |
| Work on this all month across sessions | Milestone (recurring monthly) | Write and polish a lodge presentation |
| Build toward this over time | Milestone (one-time, longer horizon) | Learn to bake sourdough |
| Long-horizon aspiration, not yet scheduling | Goal | Become a better baker |

**Baking example in full:**
- "Bake bread weekly" → routine, flexible weekly, T4
- "Try one new recipe this month" → flexible window task, monthly, one completion
- "Learn to make croissants from scratch" → milestone, if you're actively working on it with a deadline; goal, if it's an aspiration you're not yet scheduling

The dividing line is always: *one session or many, and am I ready to be accountable to it in my daily view?*

---

## Configuration

### Deadline
- **With deadline:** milestone surfaces in the urgency bands as the deadline closes. Becomes mandatory if deadline arrives unfinished.
- **Without deadline:** stays in the backlog until you manually surface it or snooze-escalation kicks in. Useful for open-ended projects with no external stakes.

### Progress cadence
- **None (default):** hides for the rest of today after any progress. Reappears tomorrow.
- **N times per week/month:** hides once your period quota is met. Reappears when the new period starts.

Use a progress cadence when you have a specific rhythm you want to honor — "work on this novel 3 times per week" — and you want the app to stop surfacing it once you've hit that target for the week.

### Consequence tier
Applies the same way as other tasks: determines score impact and snooze escalation speed. A T1 milestone with a deadline will escalate aggressively. A T4 milestone is aspirational — logged for self-awareness with no score consequences.

---

## What Milestones Are NOT

- **Not a to-do list.** A milestone is one item. If it naturally breaks into discrete steps that could each be done and ticked off independently, those steps might be better as separate tasks linked to a goal.
- **Not a recurring habit.** If you want to "write in your journal every day," that's a routine. A milestone is for a project with a finish line.
- **Not a goal.** A goal points at a destination with no expectation of daily sessions. A milestone is a commitment — it shows up in your daily view, expects sessions, and escalates if neglected.

---

## Open Questions

- [ ] When a recurring milestone completes one instance (e.g., monthly project done), what happens? Does the next period start fresh with zero progress? (Assumption: yes — currentPeriodStart advances, progressCompletionsThisPeriod resets.)
- [ ] Should the "all done" button on a recurring milestone end the recurrence, or just complete this period's instance? Current behavior to verify.
- [ ] Milestone + Goal relationship: should there be a formal link in the UI between a milestone and the goal it's advancing? (Currently you can link a task to a goal via goalId, but the UX for this isn't prominent.)
