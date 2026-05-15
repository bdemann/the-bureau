# Testing pass — 2026-05-14 (Round 3)

Tested against `https://clear.bureauofcivicresponsibility.org/` (Netlify deploy)
in a Chrome session. localStorage `bureau_v1` was cleared at the start of this
pass. This report tracks which Round 2 bugs were fixed, which remain, new bugs
found, and covers a significant set of new features added since Round 2.

---

## PRIOR BUGS — STATUS UPDATE

### ✅ Bug #1 FIXED — Stale-closure overwrite in `commit()` chain

Re-confirmed. Task add + dialogue both persisted simultaneously: `taskCount: 1`
and `dialogueQueue: 2` saved together after filing "Mow lawn". Snooze and
completion paths also verified correct.

---

### ✅ Bug #2 RESOLVED — Weekly anchor summary label (design superseded)

The single day-of-week picker has been replaced by a **multi-select days-of-week**
system. The old "Every Thursday, starting the next one." label is gone. Smart
composite labels now generate automatically:

- Mon–Fri selected → **"Every weekday (Mon–Fri)."** ✅
- All 6 days except Sat → **"Every day except Saturday."** ✅
- All 7 days → **"Every day."** ✅

The original bug (wrong "starting today" vs "starting the next one" text) is no
longer applicable. Marking as resolved by redesign.

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

### ✅ Bug #4 FIXED — Breadcrumb (confirmed Round 2, still correct)

Breadcrumb reads **"OPERATIONS › HOMEOWNER"**. ✅

---

### ✅ Bug #5 FIXED — Color picker now has selected indicator

Verified via computed styles: the checked swatch's label has
`border: 3px solid rgb(44, 44, 44)` while all unchecked swatches have
`border: 3px solid rgba(0, 0, 0, 0)`. The CSS mechanism is correct. Visually
the indicator is subtle on dark swatches (dark border on dark swatch) but the
selection state is reflected in the DOM.

---

### ⚪ Bug #6 — Legacy `priority` sort — deferred

Legacy `priority` field still present in Task schema
(`"priority": "medium"` visible in localStorage). Deferred contingent on
explicitly dropping the field.

---

### ✅ Bug #7 FIXED — No horizontal scrollbar (confirmed Round 2, still correct)

No horizontal scrollbar observed in any dialog. ✅

---

### ⚪ Bug #8 — Streak at streak === 0 — unchanged

Streak renders correctly as **"🔥 1D · LOYAL CITIZEN"** once > 0. Not visible
at 0. Product call deferred.

---

### ✅ NEW-1 FIXED — Snooze button on cleared task cards

Cleared task cards no longer show the Snooze (+24h) button. Verified: completed
"Mow lawn" → expanded "Show 1 cleared task" → no snooze button present on the
cleared card. ✅

---

## NEW BUGS FOUND THIS PASS

### NEW-2. Skip action fires the wrong dialogue — MINOR

The new **Skip** button (see New Features below) correctly advances
`suggestedDate` by +1 day with no score penalty and no `snoozeCount` increment.
However, it triggers the `snooze_1` Whitaker dialogue:

> "One snooze — that's well within normal parameters. We're good. For now."

This dialogue references "one snooze" but the action was a Skip. The dialogue
copy is misleading. Either Skip needs its own dialogue branch, or the trigger
should not fire on Skip at all.

**Repro:**
1. Create any recurring task.
2. Click **Skip** on the task card.
3. Observe Whitaker dialogue fires with snooze-specific copy.

---

### NEW-3. "Report a Neighbor" is a non-functional stub — MINOR

The **COMMUNITY DUTY › REPORT A NEIGHBOR** item in the BUREAU MENU drawer
does not navigate anywhere when clicked. The menu remains open and no view
loads. Appears to be a planned-but-unimplemented feature.

---

## NEW FEATURES VERIFIED

### Navigation: BUREAU MENU drawer

Tab bar has been replaced by a hamburger (≡) menu in the top-right corner.
Clicking it opens a side drawer titled **BUREAU MENU** containing:

- **NAVIGATE**: DAILY ("Today's tasks by urgency") and OPERATIONS ("Browse
  projects & task lists") — both navigate correctly, menu auto-closes.
- **COMMUNITY DUTY**: REPORT A NEIGHBOR ("Refer a civic non-compliant to
  CLEAR") — stub, does not navigate (see NEW-3).

---

### Citizen title system

Score-based title renders below the Patriot Score in the top-right header.
Observed: **"LOYAL CITIZEN"** at score 109, **"CITIZEN"** at score 97. Title
updates dynamically as score changes.

---

### TIME OF DAY picker in task dialog

New field between Consequence Tier and Recurring task toggle. Options:
Morning / Afternoon / Evening / Bedtime / **Anytime** (default). Stored as
`timeOfDay` in the Task schema.

---

### Recurring task checkbox defaults to checked

The "Recurring task" checkbox now defaults to **checked** (previously unchecked).
Weekly cadence is pre-selected. Users creating one-time tasks must explicitly
uncheck it.

---

### Multi-select days of week for Weekly cadence

The single day-of-week dropdown has been replaced with a 7-button toggle row
(Sun / Mon / Tue / Wed / Thu / Fri / Sat). Multiple days can be selected
simultaneously. Smart composite labels generate below the row:

| Selection | Label |
|---|---|
| Mon–Fri | "Every weekday (Mon–Fri)." |
| Sun–Fri (all except Sat) | "Every day except Saturday." |
| All 7 days | "Every day." |
| Custom set | (individual day names) |

Stored as `recurrence.hardDaysOfWeek: [0..6]` (0=Sun) in the Task schema.

---

### recurrence.endMode field + "Task has an end condition" checkbox

New `recurrence.endMode` field defaults to `"never"` (no end condition). A
"Task has an end condition" checkbox at the bottom of the dialog controls this.
The checkbox was not tested for its expanded end-condition UI — only confirmed
that unchecked = `endMode: "never"`. End condition flow needs manual testing.

---

### Skip button on task cards

Recurring tasks now show a **Skip** button alongside **Snooze (+24h)**. Skip:

- Advances `suggestedDate` by +1 day
- Does **not** increment `snoozeCount`
- Does **not** deduct from `patriotScore`
- Does **not** move task to Snoozed section (stays in Active)
- Fires Whitaker dialogue with wrong copy (see NEW-2)

Verified via localStorage inspection after clicking Skip on "Take out trash":
score 109→109, snoozeCount 0→0, suggestedDate May 14→May 15.

---

### Daily view band name updates

Band headers have been renamed with subtitles added:

| Old name | New name | Subtitle |
|---|---|---|
| Mandatory | **TODAY'S MANDATORY** | "Must happen today. No exceptions." |
| Suggested | **SUGGESTED FOR TODAY** | "Recommended. Moveable if life intervenes." |
| Radar | **ON YOUR RADAR** | "Approaching. Don't forget." |
| Backlog | **BACKLOG** | "No pressure today." |

---

### Task card date format for recurring tasks

Recurring task cards now show the current window's date range:
**"Suggested [date] · window ends [date]"** rather than a recurrence-pattern
label ("Every Thursday · next {date}"). The TESTING.md checklist item
"Card label shows `Every Thursday · next {date}`" is out of date and should be
updated to reflect this new format.

---

## VERIFIED PASSING THIS PASS

Everything from Round 2 "VERIFIED PASSING" section still passes, plus:

- No console errors on load or during interactions ✅
- BUREAU MENU drawer opens/closes; DAILY + OPERATIONS navigation work ✅
- Citizen title ("LOYAL CITIZEN" / "CITIZEN") updates with score changes ✅
- Score: 100 → 97 (snooze, T3 deduction) → 109 (completion, T3 bonus) ✅
- Streak: 0 → 1D after first completion ✅
- Hard refresh: score, streak, tasks, suggestedDate after Skip all survive ✅
- Day-start dialogue fires once; does not re-fire on hard refresh ✅
- Recurring task checkbox: defaults to checked; Weekly cadence pre-selected ✅
- Multi-select days of week: Mon–Fri default, smart labels update on toggle ✅
- TIME OF DAY picker: 5 options, defaults to Anytime, stored in schema ✅
- Task submission (weekly/all-days): card appears in Active Tasks ✅
- Skip button: +1 day to suggestedDate, no score/snooze-count change ✅
- Daily view 4 bands: all render with subtitles, Backlog collapsed with count ✅
- Backlog expanded: shows project name above task title ✅
- Show/Hide cleared tasks toggle still works ✅
- Snooze button absent on cleared task cards (NEW-1 fix) ✅
- Color picker selected indicator present (Bug #5 fix) ✅
- Operations daily status briefing: "0 tasks pending · 1 cleared today" ✅
- Project card: pending/cleared counts + CLEARED badge ✅
- Manifest still wrong content-type (Bug #3 unresolved) ✅ (confirmed)

---

## STILL COULDN'T TEST — needs you

Same list as prior rounds, plus additions:

- **Recurrence rollover** — requires device clock manipulation.
- **"Task has an end condition" expanded UI** — checkbox visible but end
  condition types/fields not tested.
- **Hard-date task "Cannot snooze"** — create a T1 hard-date task due today.
- **Skip + snooze interaction at higher counts** — does Skip eventually escalate
  the Briggs takeover at 6 deferrals?
- **Report a Neighbor** — appears to be a stub (NEW-3).
- **PWA install button, standalone launch, offline mode.**
- **Home screen icon + install dialog text.**
- **`npm test`** — run locally.
- **Multi-per-period tasks end-to-end** — creation and progress chip behavior.

---

## Suggested fix order

1. **NEW-2** (Skip fires snooze dialogue) — dialogue trigger guard, one-liner.
2. **Bug #3** (manifest content-type) — one `netlify.toml` stanza.
3. **NEW-3** (Report a Neighbor stub) — either implement or remove from menu
   until ready.
4. **Bug #8** (zero-streak visibility) — product call first, then one-liner.
5. **Bug #6** (legacy priority sort) — contingent on dropping `priority` field.
6. **TESTING.md update** — "Card label shows `Every Thursday · next {date}`"
   row is out of date; update to reflect the new "Suggested [date] · window
   ends [date]" format.
