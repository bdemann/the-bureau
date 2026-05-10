# Testing pass — 2026-05-10 (Round 2)

Tested against `https://clear.bureauofcivicresponsibility.org/` (Netlify deploy)
in a Chrome session. localStorage `bureau_v1` was cleared at the start of this
pass. This report is the follow-up to TESTING-RESULTS.md and explicitly tracks
which prior bugs were fixed, which remain, and any new issues found.

---

## PRIOR BUGS — STATUS UPDATE

### ✅ Bug #1 FIXED — Stale-closure overwrite in `commit()` chain

Comprehensively verified across all three affected paths:

- **Task add + dialogue**: Filed "Mow lawn" (T1, flexible). localStorage after
  submission showed `taskCount: 1` AND `dialogueQueue: 1` — both persisted
  correctly. Previously the dialogue commit would have overwritten the task.
- **Snooze + dialogue**: Snoozed "Mow lawn". `snoozedUntil` was a valid
  timestamp, `snoozeCount: 1`, score dropped 100→92. All three values saved
  alongside the dialogue.
- **Completion + dialogue**: Checked off "Mow lawn". `completedAt` timestamp
  saved, score jumped to 117, streak incremented to 1D — all correct while
  Whitaker's dialogue fired simultaneously.

This was the most important bug in the prior pass. It is fully resolved.

---

### ✅ Bug #2 FIXED — Weekly anchor summary label misleading

Tested with today being Sunday, May 10, 2026:

- Selecting **Sunday** (today) → summary reads: **"Every Sunday, starting today."** ✅
- Selecting **Thursday** (future) → summary still reads: **"Every Thursday, starting the next one."** ✅

Both branches are correct. Also verified Monthly cadence anchor summaries:
- Day-of-month mode: **"The 1st of each month."** ✅
- Nth weekday mode (3rd Thu): **"The 3rd Thursday of each month."** ✅

---

### ✅ Bug #4 FIXED — Breadcrumb said "DASHBOARD" instead of "OPERATIONS"

Breadcrumb now correctly reads **"OPERATIONS › HOMEOWNER"**. ✅

---

### ✅ Bug #7 FIXED — Add-task dialog had horizontal scrollbar

No horizontal scrollbar detected in the dialog bottom in any screenshot during
this pass. Both the standard and the expanded-recurring versions of the dialog
were checked. ✅

---

### 🔴 Bug #3 REMAINS — Manifest served with wrong content-type

`fetch('/manifest.webmanifest').then(r => r.headers.get('content-type'))` →
`"application/octet-stream"`. Still needs the `netlify.toml` header rule:

```toml
[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
```

---

### 🔴 Bug #5 REMAINS — Color picker has no selected indicator on open

Inspected computed styles on all five color swatch `<label>` elements:
every one has `border: 2.4px solid rgba(0, 0, 0, 0)` — the border is
transparent across the board, including the default-selected swatch. The five
swatches remain visually identical when the dialog first opens. (Verified via
JS computed-style inspection, not just visual estimation.)

---

### ⚪ Bug #6 — Legacy `priority` sort — untestable, unresolved by design

Project-detail sort still references `priority` field. Per prototype-phase
notes this is a known deferred cleanup item contingent on dropping the legacy
field. Not re-tested in this pass.

---

### ⚪ Bug #8 — Streak doesn't render at streak === 0 — behavior unchanged

Streak correctly renders as **"1D ·"** once incremented above 0. At streak = 0
(fresh state) it does not appear. Whether zero-streak visibility is desired is
still a product decision; the behaviour is unchanged from the prior pass.

---

## NEW BUGS FOUND THIS PASS

### NEW-1. Snooze button active on cleared tasks — MINOR

In the CLEARED section (expanded via "Show N cleared tasks"), each cleared task
still renders a **"Snooze (+24h)"** button. Snoozeing a completed task is
nonsensical and could corrupt state. The snooze button should be hidden (or
disabled) when `task.completedAt` is set.

**Repro:**
1. Complete any task.
2. Click "Show 1 cleared task".
3. Observe "Snooze (+24h)" button on the completed task.

**Suggested fix:** in the task-card render, gate the snooze button on
`!task.completedAt`.

---

## VERIFIED PASSING THIS PASS

Everything from the Round 1 "VERIFIED PASSING" section still passes, plus the
following were newly verified:

- App shell: no console errors on fresh load
- Day-start dialogue fires once per day; does not re-fire on hard refresh
- Score 100 → 92 (snooze, T1 penalty) → 117 (completion, T1 bonus) — maths correct
- Streak: 0 → 1D after first completion of the day
- Un-snooze: task moves back to Active; `snoozedUntil: null`; `snoozeCount` retained (not reset) ✅
- Show/Hide cleared tasks toggle works; CLEARED stamp renders on card ✅
- Hard refresh: all state (tasks, projects, score, streak, task positions) survives ✅
- Recurring dialog: all 10 cadences present in dropdown ✅
- Recurring weekly: date picker hidden when cadence = weekly ✅
- Recurring monthly day-of-month: input accepts 1–31; anchor summary correct ✅
- Recurring monthly Nth weekday: ordinal (1st/2nd/3rd/4th/Last) + dow picker appear; summary correct ✅
- Operations view: "DAILY STATUS BRIEFING" bar shows `N tasks pending · N cleared today` ✅
- Project card on Operations list: shows pending/cleared counts + CLEARED badge ✅

---

## STILL COULDN'T TEST — needs you

Same list as Round 1, still blocked:

- **Recurrence rollover** (daily/weekly fixed/rolling/multi-per-period reset).
  Requires advancing the device clock through period boundaries.
- **Snooze severity color escalation past 1.** Needs multiple snoozes to
  survive across sessions (now possible since Bug #1 is fixed).
- **Hard-date task snoozability.** Create a T1 hard-date task due today — the
  snooze button should read "Cannot snooze" and be disabled.
- **PWA install button + standalone launch.**
- **Offline mode** (DevTools → Network → Offline).
- **Home screen icon + install dialog text** on a real device.
- **`npm test`** — run locally; all `.test.ts` files are in place.
- **Multi-per-period tasks end-to-end** — couldn't reliably submit a
  multi-per-period task via the cadence dropdown in Round 1; now possible
  since JS `select.value` triggers the UI on click.

---

## Suggested fix order

1. **NEW-1** (snooze on cleared cards) — small guard, high weirdness factor.
2. **Bug #3** (manifest content-type) — one `netlify.toml` stanza.
3. **Bug #5** (color picker selection) — add outline/ring to checked swatch.
4. **Bug #8** (zero-streak visibility) — product call first, then one-liner.
5. **Bug #6** (legacy priority sort) — contingent on dropping `priority` field.
