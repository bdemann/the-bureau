# THE BUREAU — Vision & Design Document

> *"What does it actually mean to be the person I think I am?"*

---

## The Core Philosophy

This app starts with a question most productivity tools never ask: **what do you have to do to honestly describe yourself the way you want to be described?**

Not what your boss assigned. Not what's overdue. But: if you tell someone you're a home baker, how often do you actually have to bake to make that true? If you consider yourself an active member of your church, what does that commitment look like in practice — weekly, monthly, annually? If you're a husband, a homeowner, a functional adult — what does showing up in each of those roles actually require?

This reframe matters because it changes the emotional relationship to the task list. These aren't items on a to-do list. They are the concrete expression of who you are. The Bureau exists to help you stay honest with yourself — not just to nag you about what you haven't done.

The two characters exist in that tension. Director Briggs reduces everything to output and compliance. Agent Reyes understands that the point isn't perfect performance — it's genuine effort and honest accounting.

---

## Life Categories

The task list is organized around **life roles / identities** rather than arbitrary projects. Each category represents a facet of who the user is trying to be. Example categories:

| Category | Example "honesty question" |
|----------|---------------------------|
| Home Baker | How often do I need to bake to honestly say I bake? |
| Church Member | What does active membership look like in practice? |
| Husband | What does investment in my marriage look like weekly/monthly? |
| Homeowner | What maintenance does a well-kept home require? |
| Functional Adult | What are the administrative basics of a life that works? |
| Health | What's the baseline that keeps me functional and well? |
| Hobbies / Crafts | What frequency of engagement keeps a skill alive? |

**Design implications:**
- Categories are user-defined, not preset
- Each category is a "project" in the data model
- The dashboard should make it easy to see which areas of life are getting attention and which are being neglected
- Future: per-category health scores, not just a global score

### Future: Setup Wizard (Low Priority / Nice-to-Have)

Part of the value of this system is the *brainstorming exercise* — sitting down and thinking through each life role and asking "what would I need to do to honestly claim this?" That exercise is valuable in itself, and the original was done on paper (which is perfectly valid and probably better for reflection anyway). A future version of the app might offer a guided setup wizard to help new users walk through this, but it is not part of the MVP. Paper works fine.

---

## Task Frequencies / Cadences

Tasks recur at specific intervals. These are rhythms, not just deadlines. All 10 cadence levels are in scope for the MVP:

| Cadence | Examples |
|---------|---------|
| Multiple times per day | Prayer, medication, drinking water check |
| Once per day | Brush teeth, journaling, daily check-in |
| Multiple times per week | Exercise, scripture study |
| Once per week | Date night, mow lawn, groceries |
| Multiple times per month | Bake bread, clean bathrooms |
| Once per month | Budget review, home teaching, bookbinding project |
| Multiple times per quarter | Deep clean, service checks |
| Once per quarter | Quarterly review, temple trip |
| Multiple times per year | Dentist, seasonal prep |
| Once per year | Annual physical, renew registration |

### "Multiple per period" — How it works

For cadences like "3× per week" or "2× per month," the task is displayed as a single item with a completion counter rather than as N separate entries. Example: "Exercise — 1/3 this week." Each time you mark it done, the counter increments. When you hit N, the task is complete for the period and regenerates at the start of the next one.

This avoids polluting the daily view with duplicate entries while still tracking whether you've met your frequency commitment.

---

## Dimension 1: Consequence Severity

Not all tasks carry the same weight if neglected. There is a spectrum from hard-deadline critical to purely aspirational:

```
CRITICAL ──────────────────────────────────────────── ASPIRATIONAL

  Cat food          Water softener          Lawn          Bookbinding
  (she will die)    (deposits build up)     (neighbors    (I'm just not
                                            notice)        a bookbinder)
```

**Tier 1 — Hard Consequence**
Something bad happens if this doesn't get done. The consequence is real, possibly irreversible.
- Cat food / pet care
- Medication
- Bills with late fees
- Hard external deadlines

**Tier 2 — Soft Consequence (degrades over time)**
Things get worse gradually. Missing once is fine; consistently missing causes real problems.
- Water softener salt
- Air filters
- Car maintenance
- Relationship maintenance (one missed date night is fine; never going is not)

**Tier 3 — Quality Consequence**
Nothing breaks, but your standard of living or self-perception degrades.
- Lawn mowing
- Cleaning
- Staying current in a hobby

**Tier 4 — Aspirational / Identity**
The only consequence is that you can't honestly claim the identity.
- Bookbinding project
- Learning a new skill
- Creative / hobby work

**Design implications:**
- `consequenceTier` is a field on every task (1–4)
- Tier, snooze count, and time remaining together drive the urgency calculation
- Tier 1–2 tasks escalate visually and cannot be quietly dismissed
- Tier 4 tasks are low-pressure but the snooze count still reflects the honest picture

---

## Dimension 2: Timing Flexibility

**This is the core problem that Finch does not solve.**

### Hard-Date Tasks
Must happen on a specific day. There is no window.
- Take trash to the curb
- Make a payment due on a specific date
- A fixed appointment

The due date IS the day. They show urgently on that day and not before.

### Window Tasks
Need to happen *sometime within a period*. When exactly doesn't matter much.
- Monthly bookbinding (any day in October)
- Weekly scripture study (any day this week)
- Monthly budget review (anytime before month end)

**The Finch problem with window tasks:**
Setting it due on the 1st means snoozing it all month. Setting it due on the 30th makes it invisible until deadline crunch. Neither reflects how the task actually works.

**The solution: Suggested Dates within Windows**

Every window task has three temporal properties:
1. **Suggested date** — when the app recommends doing it; generated automatically or set manually
2. **Window deadline** — the last valid day of the period (end of the week, end of the month, etc.)
3. **Window period** — the cadence period within which completion counts

The suggested date creates structure without rigidity. Family events can bump a bookbinding day without guilt — you still have the rest of the month. But every task gets a time slot, which prevents long-horizon tasks from becoming permanently invisible.

---

## The Snooze System

Snoozing is not weakness — it is **urgency information**. The snooze count's job is to represent how close you are to the edge, not to accumulate as a permanent shame ledger.

### What the snooze count means

Consider feeding the cat. Each time you snooze it, her feeder is a little emptier. The snooze count doesn't record your failure — it represents the mounting urgency of the situation. When you refill the feeder, the pressure is fully gone. The counter resets. Clean slate.

The same logic applies to the water softener, the air filters, the budget review. Snoozing increases urgency proportionally to the consequence tier. Completing the task releases all of that pressure.

### Snooze count resets on completion

The count resets when a task is completed. This is by design. The point is never "look how many times you've avoided this" — the point is "this is how urgent this is right now." Once done, urgency is zero.

### Snooze behavior by task type

| Task type | Snooze behavior |
|-----------|----------------|
| Hard-date | Cannot be snoozed past the hard date. Becomes overdue. |
| Tier 1 consequence | Agent Reyes reacts at snooze 2; Briggs at snooze 4. High urgency. |
| Tier 2–3 consequence | Standard visual escalation. |
| Tier 4 / aspirational | Can be snoozed freely. Low pressure but counter still visible. |
| Window task | "Snoozing" reschedules the *suggested date*, not the window deadline. |

### Snooze severity thresholds (visual)

- 0: Normal
- 1: Yellow badge — "Snoozed ×1"
- 2–3: Orange — "Snoozed ×2–3 — Noted"
- 4–5: Red — "FLAGGED" — Agent Reyes is getting concerned
- 6+: Deep red "UNDER REVIEW" — Director Briggs personally involved

---

## Post-Completion Scheduling: Fixed vs. Rolling

When a recurring task is completed, when should the *next* instance be due? This is a meaningful choice and should be configurable per task.

### Fixed Schedule
The next instance is always due at the same point in the cadence period, regardless of when you actually completed it. Example: air filters are always due on the 1st of the month. You did them on the 25th this time — next instance is still due the 1st of next month, not the 25th.

**Good for:** Habits you want to keep anchored to a consistent rhythm. Anything that benefits from regularity over practicality.

**The downside:** You finished on the 25th, and the next instance is due in 6 days. That can feel unfair.

### Rolling Schedule
The next instance is due one cadence period from the date you actually completed it. You finished the air filters on the 25th — next instance is due the 25th of next month.

**Good for:** Maintenance tasks where the interval matters more than the calendar date. If you replace the filter on the 25th, it doesn't matter that it's not the 1st — what matters is that it's replaced every ~30 days.

**The downside:** The due date drifts over time and can end up on inconvenient days.

### Per-task configuration

Both modes are valid and serve different purposes. This should be a configurable option on each recurring task. Default recommendation: rolling for maintenance/consequence tasks, fixed for habits and identity tasks.

The app should also offer a quick "reschedule after completion" prompt — after marking a task done, optionally adjust when the next instance is due (useful when the task was done significantly late or early).

---

## The Daily View

**The most important view in the app.** This is a unified cross-project view — all categories, all tasks, organized by what actually needs your attention today.

The key insight: **a successful day means completing everything in the top band**, even if nothing else gets touched.

```
┌─────────────────────────────────────────────────────┐
│  TODAY'S MANDATORY                                   │
│  Daily tasks. Hard-date tasks due today.            │
│  High-tier tasks that have escalated to critical.   │
│  These MUST happen today.                           │
├─────────────────────────────────────────────────────┤
│  SUGGESTED FOR TODAY                                 │
│  Window tasks whose suggested date is today.        │
│  Recommended but moveable if life intervenes.      │
├─────────────────────────────────────────────────────┤
│  ON YOUR RADAR                                       │
│  Window tasks whose deadline is approaching         │
│  (within ~20–30% of window remaining).             │
│  Not urgent today, but don't forget.               │
├─────────────────────────────────────────────────────┤
│  BACKLOG                                             │
│  Long-horizon tasks. No pressure today.            │
│  Visible but clearly deprioritized.                │
└─────────────────────────────────────────────────────┘
```

**What goes where is calculated, not manually assigned.** The user sets consequence tier, cadence, and window type. The app determines which band a task belongs in based on those fields + current date + snooze count.

**The daily view is cross-category.** You don't go to "Husband" to see your date night reminder — it shows up in today's view alongside brushing your teeth and refilling the cat feeder, all competing for honest attention.

---

## The Identity Accountability Score

The current "Patriot Score" is a global number. Eventually it should reflect **are you showing up in each area of your life, or just the easy ones?**

Future approach:
- Each category has its own sub-score
- Global score is a weighted average across categories
- Neglecting one category for a long time visibly affects the overall score
- Director Briggs tracks the global number. Agent Reyes notices the pattern.

This is post-MVP, but the data model should be designed so it's addable later without a rewrite.

---

## Character Philosophy

**Director R. Harlan Briggs** — He is not entirely wrong. Productivity does matter. Showing up does matter. His problem is that he reduces a human life to a compliance report. He appears when you are failing in ways that are actually serious, and his pressure, while uncomfortable, is not always unfair. He can be a bit of a caricature — that's part of the fun.

**Agent Carmen Reyes** — She is your guide. She has seen the system up close and knows it is imperfect. She believes in you specifically and cares about outcomes, not optics. She will push back on Briggs when he overreaches, but she will also tell you the hard truth when you need to hear it. She is not a cheerleader — she is an honest advocate. She should feel real.

**Tonal goal:** Serious enough to take seriously, not so grim that it stops being fun. The premise is silly. The emotional experience should be genuine.

---

## Feature Backlog

### Phase 1 — Core Foundation ✓ Complete
- [x] Project/category organization
- [x] Task creation with priority
- [x] Snooze system with visual degradation
- [x] Character dialogue system (Briggs + Reyes)
- [x] Basic patriot score
- [x] PWA shell + localStorage

### Phase 2 — MVP Core (Next)
- [ ] Full recurrence system — all 10 cadence levels
- [ ] Multiple-per-period cadences with completion counter (0/N this week)
- [ ] Consequence tier field on tasks (1–4)
- [ ] Hard-date vs. window task types
- [ ] Suggested date + window deadline on window tasks
- [ ] Auto-generate next recurrence on completion
- [ ] Fixed vs. rolling schedule mode (per task)
- [ ] Tiered daily view (cross-project: Mandatory / Suggested / Radar / Backlog)
- [ ] Snooze count resets on completion
- [ ] Urgency calculation driven by tier + snooze + time remaining

### Phase 3 — Refinement
- [ ] Per-category health scores
- [ ] Category-level neglect indicators on dashboard
- [ ] Agent Reyes comments on category patterns, not just individual tasks
- [ ] Task completion history / record
- [ ] Stats view ("Quarterly Review" — Briggs style)
- [ ] Import/export data

### Phase 4 — Nice to Have
- [ ] Guided setup wizard (the brainstorming exercise, in-app)
- [ ] Filters on daily view
- [ ] Briggs-style shame scoring for long-term snooze patterns (opt-in)
- [ ] Sharing / accountability partner features

---

*Last updated: Revised with snooze model clarification, fixed/rolling schedule modes, all 10 cadences confirmed for MVP, daily view confirmed as unified cross-project*
