# Flexible Windows

> Draft doc — to be refined and transferred to the website.

---

## The Problem Flexible Windows Solve

Most task apps make you pick one due date. For a monthly budget review, that forces a bad choice:

- Set it due the **1st** → you know you have all month, so you push it off every day until the 30th
- Set it due the **30th** → it's invisible all month and then suddenly urgent at the last minute

Neither reflects how the task actually works. You have a *window* — any day in June counts. But "any day" without structure means it drifts to the end of the month or off the list entirely.

Flexible windows solve this by separating two concepts:

1. **The suggested date** — when you'd *ideally* do it. The day it first surfaces in your view as something to do today.
2. **The window deadline** — the last acceptable day. After this, the period is missed.

The space between them is the window. Structure without rigidity.

---

## The Key Question: Hard vs. Flexible

The distinction between Hard and Flexible is often misunderstood. It's not about whether you have a preferred day — flexible windows have preferred days too. The real question is:

> **If I miss my preferred day, is the opportunity gone?**

- **Yes** → Hard. The specific day is the commitment. An external constraint makes that day non-negotiable (the truck comes Thursday, the payment is due the 1st by contract, the appointment slot is taken).
- **No** → Flexible. You have a preferred day, but doing it a few days later doesn't forfeit anything.

**Example:** You want to replace your air filter on the 1st of every month — it fits your "fresh start" rhythm when your paycheck arrives. But if you do it on the 5th, nothing breaks. The interval is what matters. → Flexible with suggestedDate = 1st.

**Counter-example:** You need to take the trash to the curb on Wednesday night. The truck comes Thursday morning. If you miss Wednesday night, you missed it. → Hard, no lead time.

The practical difference: if you miss the suggested date on a Hard task, the period is over (or the task is immediately overdue and mandatory). If you miss the suggested date on a Flexible task, you still have until the deadline — the app keeps it visible and escalates gradually.

---

## Two Flavors of Flexible

Flexible windows serve two distinct intents, both valid:

### Anchored Flexible
You have a specific preferred day, but no external consequence if you slip past it.

> "Replace the air filter on the 1st. I like to do it with the new month. But the 8th is fine too."

- suggestedDate = 1st (meaningful anchor)
- windowDeadline = end of month
- The suggested date *matters* — it's when you want to do it
- The window is the forgiveness zone if life intervenes

### Open Flexible
Any day in the period is equally valid. There's no preferred day — just a period within which it needs to happen.

> "Work out sometime this week. Any day is fine."

- suggestedDate = period start (or any reasonable day — just determines when it surfaces)
- windowDeadline = end of period
- The specific suggested date is mostly arbitrary; you just need the period covered

Both use the same `windowType: flexible` in the data model. The difference is in your intent and how you set the suggestedDate. For anchored flexible, choose a suggestedDate that reflects your actual preferred day. For open flexible, the period start is usually fine.

---

## How the Three Temporal Properties Work

| Property | What it is | Example (monthly budget review) |
|----------|-----------|--------------------------------|
| `suggestedDate` | The ideal day — when the app first puts it in your view as "due" | June 1 |
| `windowDeadline` | The last valid day — after this, the task is missed | June 30 |
| `windowLengthDays` | Total days in the window — used to calculate urgency % | 30 |

### How suggestedDate is determined

- **On creation:** whatever you set in the form — your day-of-week, day-of-month, or a specific date. If you don't set one, the system picks the soonest upcoming occurrence based on your cadence settings.
- **After each completion (recurring):** recomputed using your schedule mode.
  - *Fixed:* anchors to the same calendar position (always the 1st of the month, always the 15th).
  - *Rolling:* calculated from when you actually completed it (completed June 12th → next due July 12th).

### How windowDeadline is determined

- **Recurring flexible tasks:** always auto-derived as the end of the cadence period. You never set this directly — your cadence IS your deadline.
  - Weekly → Saturday (end of the week)
  - Monthly → last day of the month
  - Quarterly → last day of the quarter
  - Yearly → December 31
- **One-time flexible tasks:** you set it manually.

---

## The Band Progression Over the Window

```
         June 1          June 23           June 30
           |               |                  |
[backlog] [SUGGESTED] ─── [RADAR] ─────── [MANDATORY]
           ^               ^                  ^
     suggestedDate     ~25% remaining     windowDeadline
```

1. **Before suggestedDate** → backlog (possibly hidden, depending on lead time setting)
2. **suggestedDate arrives** → suggested (for all tiers — see Tier Behavior below)
3. **~75% of window used** → radar (the deadline is approaching; escalating)
4. **windowDeadline arrives** → mandatory (T1–T3) or stays suggested (T4)

The task stays in the **suggested band from suggestedDate through most of the window.** This is intentional — you're in the window, and any day counts. The urgency escalation comes from time running out, not from you not acting.

---

## Tier Behavior Inside a Flexible Window

The consequence tier controls miss/skip penalties and snooze escalation speed. It does NOT determine when the task becomes mandatory — the window deadline does that.

| Tier | At suggestedDate | As window closes | At windowDeadline | Miss penalty |
|------|-----------------|------------------|------------------|-------------|
| **T1** — Hard consequence | suggested | radar at ~25% remaining | mandatory | high |
| **T2** — Soft consequence | suggested | radar at ~25% remaining | mandatory | moderate |
| **T3** — Quality consequence | suggested | radar at ~25% remaining | mandatory | low |
| **T4** — Aspirational | suggested | radar at ~25% remaining | **suggested** (never mandatory) | none |

**Why T4 never reaches mandatory, even at deadline:** T4 is purely aspirational. There is no external consequence. Forcing it mandatory at deadline contradicts the purpose of the tier.

**Why T1 does NOT go straight to mandatory at suggestedDate:** "Pay rent on the 15th" with a monthly flexible window — you don't want it blaring mandatory from the 15th to the 30th. The 15th is when it *should* be done, not when it *must* be done by. The 30th is the deadline. T1's urgency expresses itself through heavier miss penalties and faster snooze escalation, not premature mandatory status.

---

## Recurring vs. One-Time

### Recurring flexible

The window is the cadence period. After each completion, the system advances to the next period using your schedule mode.

> **When to use Fixed vs. Rolling:**
> - Fixed: the calendar position is the point. Rent is always the 1st whether you paid it on the 29th or the 10th. Budget review is always the first week of the month.
> - Rolling: the interval is the point. If you changed the air filter on June 12th, the next change is 90 days from then — not from July 1st.

### One-time flexible

No cadence. You manually set a suggestedDate and windowDeadline. Once completed (or the deadline passes), it's done.

- "Call the insurance company sometime this week" → suggestedDate: Monday, deadline: Friday
- "Fix the leaky faucet this month" → suggestedDate: the 3rd, deadline: the 30th

---

## Flexible Windows and Snooze

> **Design question — unresolved.** See Open Design Questions.

The window IS the flexibility. If you have until the 30th, you shouldn't need to snooze a flexible task — you just don't do it today. It stays in suggested. Tomorrow it's still there. The window gives you the breathing room that snooze is supposed to give.

The current code does allow snoozing flexible tasks (snooze pushes suggestedDate forward 24 hours, snooze count increments). But this creates a problem: if you consciously say "not today" via snooze, your snooze count rises and urgency escalates faster than if you had simply ignored the task and let it sit. That's backwards — engaging intentionally shouldn't be penalized more than ignoring.

The likely correct model: **flexible tasks don't have snooze.** They may have a "not today" option that hides the task for the day without incrementing any counter. Urgency escalates purely based on time remaining in the window.

---

## Flexible vs. Hard Date — The Key Distinction

These are genuinely different concepts and shouldn't be conflated:

| | Hard Date | Flexible Window |
|--|----------|----------------|
| What the commitment is | A specific day | A period |
| What happens when suggestedDate passes | Task is mandatory, then missed | Task stays in suggested, window keeps going |
| Can you snooze? | Yes (within lead time); not past the date | Probably not — the window is the flexibility |
| When is the period "missed"? | When the specific day passes without action | When the window deadline passes without action |

A hard-date task with lead time is NOT the same as a flexible window. The difference is what happens after the ideal day: hard date → mandatory → missed. Flexible → stays in window, stays available.

**Practical test:** Could you do it on a different day within the period without consequence? If yes → flexible. If the specific day is the whole point → hard date.

---

## Lead Time on Flexible Tasks

Lead time controls when the task first surfaces in your view *before* the suggestedDate. For flexible tasks, this is most useful for one-time tasks where you need prep time.

For most recurring flexible tasks (clean the bathroom, budget review), the default behavior — appearing when the suggestedDate arrives — is correct. You don't need to see next month's budget review this month.

| Setting | Behavior |
|---------|----------|
| Default | Appears using window-% logic — earlier as the deadline closes |
| None (`null`) | Hidden until suggestedDate arrives |
| Custom (N days) | Surfaces N days before suggestedDate |

---

## Use Cases

### Weekly

| Task | suggestedDate | Schedule mode | Tier | Notes |
|------|--------------|---------------|------|-------|
| Clean the bathrooms | Sunday | Fixed | T3 | Any day works; Sunday is the anchor |
| Grocery shopping | Thursday | Fixed | T2 | Need food for the weekend; Thu gives time |
| Weekly journal entry | Monday | Fixed | T3 | Start the week; any day counts |

### Monthly

| Task | suggestedDate | Schedule mode | Tier | Notes |
|------|--------------|---------------|------|-------|
| Budget review | 1st | Fixed | T2 | Start-of-month anchor |
| Water softener salt | 1st | Rolling | T2 | Interval matters more than calendar date |
| Pay rent | 15th | Fixed | T1 | T1 → heavier penalties; still flexible until last day |

### Quarterly / Yearly

| Task | suggestedDate | Schedule mode | Tier | Notes |
|------|--------------|---------------|------|-------|
| Investment review | Quarter start | Fixed | T2 | Any day in the quarter is fine |
| Annual physical | January 1 | Fixed | T1 | Critical health task; whole Q1 to schedule it |

---

## What Flexible Windows Are NOT

- **Not a hard date.** If the specific day matters (trash truck timing, rent by external contract, scheduled appointment), use Hard window type.
- **Not a milestone.** If it's a long-horizon project you work toward in sessions, use Milestone.
- **Not a snooze substitute.** The window is already the flexibility. You don't need to snooze; you just don't do it today.

---

## Open Questions (to resolve before website)

- [ ] Should flexible tasks have no snooze button, or a "not today" button that hides without incrementing snooze count?
- [ ] How should "not today" vs. ignoring be distinguished in the UI, if at all?
- [ ] Multi-DOM flexible tasks (e.g., monthly task due the 1st and the 15th via `hardDaysOfMonth: [1, 15]`): each occurrence has its own window (1st–14th, 15th–30th). This needs its own section.
- [ ] For one-time flexible tasks: what does the UI show when the deadline passes missed vs. completed?
