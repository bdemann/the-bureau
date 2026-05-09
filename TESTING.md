# Testing — BCR Clear

Two layers:

1. **Automated** — pure data-layer tests via `node:test` + `@augment-vir/assert`.
   Run: `npm test` (no browser, no DOM).
2. **Manual** — UI/UX flows that need a real browser. Use the checklist below.

When you find a bug during manual testing, the goal is to add a regression
test for it in the automated layer where possible, then fix.

---

## Automated coverage (current)

- `recurrence.ts` — period boundaries, day-of-week / Nth-weekday math, fixed
  vs rolling advance, rollover semantics.
- `urgency.ts` — every band-decision path including snooze escalation.
- `storage.ts` — date helpers, visibility/overdue, Phase 1 → Phase 2 migration.
- `dialogues.ts` — trigger coverage, character preference, defensive fallback.

Not (yet) covered: element rendering, event flows. Those are manual until/unless
we add a browser test runner.

---

## Manual checklist

Mark each row as you verify in the browser. Reset the localStorage entry
`bureau_v1` between phases when you want a clean state.

### App shell

- [ ] Page loads with no console errors
- [ ] Header shows `CLEAR` + `BUREAU OF CIVIC RESPONSIBILITY` subtitle
- [ ] Patriot score + streak render top-right
- [ ] Tab bar shows Daily / Operations
- [ ] Daily is the default landing view
- [ ] Day-start dialogue appears on first load each day; dismiss closes it

### Operations view (project list)

- [ ] Empty: shows `NO ACTIVE OPERATIONS` stamp
- [ ] `+ OPEN NEW OPERATION` opens dialog
- [ ] Cancel closes without creating
- [ ] Submitting a name creates the project; card appears
- [ ] Click card → project-detail opens
- [ ] Multiple projects render

### Project-detail

- [ ] Header breadcrumb shows project name
- [ ] Back button returns to Operations
- [ ] Empty state shows "No active tasks…" + Whitaker quote
- [ ] `+ FILE NEW TASK` opens dialog
- [ ] Active tasks list shows incomplete + un-snoozed (regardless of due date)
- [ ] Snoozed list shows separately when applicable
- [ ] Cleared tasks toggle (Show/Hide N cleared) works

### Task creation — one-time

- [ ] Title required (FILE TASK disabled until typed)
- [ ] Description optional
- [ ] Tier 1–4 buttons toggle; help text updates per tier
- [ ] Flexible / Hard date toggle works
- [ ] Hard requires a date; flexible date is optional
- [ ] Date picker visible (not recurring)
- [ ] Submit creates task; dialog closes; task appears in active list
- [ ] Cancel closes without creating

### Task creation — recurring (weekly day-of-week)

- [ ] Toggle "Recurring task" on
- [ ] Cadence: Weekly
- [ ] Day-of-week picker appears (Sun–Sat); date picker hidden
- [ ] Anchor summary updates ("Every Thursday, starting the next one.")
- [ ] **Today matches the dow**: first occurrence = today
- [ ] **Today doesn't match**: first occurrence = next occurrence
- [ ] Card label shows `Every Thursday · next {date}`

### Task creation — recurring (monthly, day-of-month)

- [ ] Cadence: Monthly → "Anchor" toggle appears
- [ ] Day-of-month input accepts 1–31; rejects out-of-range
- [ ] Anchor summary shows "The Nth of each month"
- [ ] Submit creates task; first occurrence is this month's that-day if it
      hasn't passed, else next month's
- [ ] Card label `Day N of each month · next {date}`

### Task creation — recurring (monthly, Nth weekday)

- [ ] Switch to "Nth weekday" mode
- [ ] Ordinal (1st/2nd/3rd/4th/Last) and day-of-week pickers appear
- [ ] Anchor summary shows "The 3rd Thursday of each month"
- [ ] **This month's Nth-dow already passed**: first occurrence = next month's
- [ ] **Not yet passed**: first occurrence = this month's
- [ ] **Last weekday**: works in both 4-Thursday and 5-Thursday months
- [ ] Card label `3rd Thursday of each month · next {date}`

### Task creation — multiple-per-period

- [ ] Cadence: Multiple per week (or per-day/month/quarter/year)
- [ ] "Times per period" input appears; accepts 2–99
- [ ] Date picker still visible (multi-per uses dates, not anchors)
- [ ] Submit creates task with `frequencyPerPeriod`
- [ ] Card shows `0 / 3 this week` progress chip

### Task completion

- [ ] One-time: ✓ → task moves to "cleared" (collapsed)
- [ ] Standard recurring: ✓ → suggestedDate updates to next period
- [ ] Multi-per-period: ✓ → progress chip increments
- [ ] When multi-per count reaches target: task hides until next period
- [ ] Score goes up by tier-weighted amount
- [ ] Streak increments
- [ ] Sometimes Whitaker (or Briggs) speaks

### Task snooze

- [ ] Snooze button → snoozedUntil = +24h, badge appears
- [ ] Task moves to Snoozed section
- [ ] Snooze count escalates color (yellow → orange → red)
- [ ] Score decreases (tier-weighted)
- [ ] Hard-date task whose date is today: button reads "Cannot snooze" and is disabled
- [ ] At 6 snoozes (any tier), Briggs takes over
- [ ] Whitaker dialogue escalates with count

### Un-snooze

- [ ] In Snoozed list → "Wake up" moves task back to Active
- [ ] Snooze count *retained* (un-snooze ≠ reset)

### Daily view

- [ ] Mandatory: tasks due today / hard-overdue / cadence=daily
- [ ] Suggested: flexible tasks past suggestedDate but inside window
- [ ] Radar: tasks ≤ 3 days from hard date, or window % low
- [ ] Backlog: everything else (collapsed by default — count visible)
- [ ] Empty Mandatory: "No mandatory tasks today. Agent Whitaker approves."
- [ ] Each card shows project name above title (cross-project context)
- [ ] Complete/snooze actions work from daily view

### Recurrence rollover

- [ ] Daily task: complete it, advance device clock 1 day, reload — task back, fresh
- [ ] Weekly fixed (anchored Thursday): complete it, next-week reload — suggestedDate is next Thursday
- [ ] Weekly rolling: complete on a different day — next due = completion + 7 days
- [ ] Multi-per-week: complete 1× this week, advance week — completionsThisPeriod resets to 0

### Persistence

- [ ] Hard refresh: state survives
- [ ] Close tab + reopen: state survives
- [ ] DevTools → Application → Local Storage → key `bureau_v1` is JSON

### PWA / install

- [ ] `/manifest.webmanifest` returns 200
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] Install button shows in browser address bar
- [ ] Installed app launches standalone
- [ ] Offline (DevTools → Network → Offline): app still loads + works
- [ ] Home screen icon: white eagle on navy, no halo (uninstall + reinstall after icon changes)
- [ ] Install dialog text: "BCR Clear" / Home screen label: "BCR Clear"
