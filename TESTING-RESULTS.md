# Testing pass — 2026-05-10

Tested against `https://clear.bureauofcivicresponsibility.org/` (Netlify deploy)
in a Chrome session. Localstorage `bureau_v1` was cleared at the start.

Source-of-truth notes:
- All bugs reproduced from the deployed build, but each one is rooted in a
  specific source line so this report points there directly.
- Tests I couldn't run from the sandbox are flagged at the bottom.

---

## CRITICAL

### 1. Stale-closure overwrite in `commit()` chain — eats task adds, snoozes, completions

`src/components/bureau-app.element.ts` — every handler that calls `commit()`
followed by `triggerDialogue()`/`pushDialogue()` loses its first commit.

**Repro (deterministic with Math.random pinned, ~60% otherwise):**
1. `localStorage.removeItem('bureau_v1')`, reload.
2. Operations → Open New Operation → name "Homeowner" → submit.
3. Click Homeowner → File New Task → title "X" → File Task.
4. Inspect `localStorage.bureau_v1` — `tasks: []` despite the "task added"
   memo appearing. The card never shows up in Active either.

**What's happening:**

```ts
// pseudocode of bureau-app render
render({state, updateState}) {
    const appState = state.app;          // closure-bound snapshot

    function commit(updates) {
        const next = {...appState, ...updates};   // ← appState is stale on subsequent calls
        saveState(next);
        updateState({app: next});
    }

    function pushDialogue(...) {
        ...
        commit({dialogueQueue: [entry, ...appState.dialogueQueue.slice(0, 9)]});
    }

    function onTaskAdded(task) {
        commit({tasks: [...appState.tasks, task]});      // commit #1 — saves task
        if (Math.random() < 0.6) {
            triggerDialogue('task_added', false);        // commit #2 — overwrites #1
        }
    }
}
```

`commit #2` rebuilds `next` from the original `appState` (which still has the
old empty `tasks` array) plus the new `dialogueQueue`. `saveState(next)`
overwrites localStorage with the no-task state, and `updateState({app: next})`
overwrites the in-memory state. Net result: task is gone, dialogue is there.

**Affected handlers** (any `commit` followed by another `commit` via dialogue
or another commit call):
- `onTaskAdded` — task lost when dialogue fires (~60% of the time)
- `onTaskSnoozed` — snooze always lost (dialogue always fires for snooze ≥ 1 on tier 1–3)
- `onTaskCompleted` — completion + dialogue; almost certainly affected
- Any setTimeout-delayed `triggerDialogue` (streak, score_high, score_low) —
  same pattern, same closure

**Confirmed in browser:** snooze of "Mow lawn" resulted in
`{score: 100, snoozeCount: 0, snoozedUntil: null}` while the snooze_1 dialogue
("One snooze — that's well within normal parameters") fired.

**Suggested fix (smallest patch):** keep a local mirror of the latest state
inside `commit`:

```ts
let current = appState;
function commit(updates: Partial<AppState>): void {
    const next = {...current, ...updates};
    saveState(next);
    updateState({app: next});
    current = next;     // 👈 keep local in sync so subsequent commits chain
}
```

**Better long-term fix:** stop calling `commit` twice per handler. Have
`pushDialogue` return a partial `dialogueQueue` value instead of committing,
and have each handler accumulate its updates and `commit` once at the end.

This is the most important bug — it makes the whole app non-functional for
state changes that pair with dialogue. Tests for this should live in the data
layer (a fake `commit` that records all calls and verifies updates compose).

---

## MEDIUM

### 2. Weekly anchor summary label is misleading

`src/components/add-task-dialog.element.ts:526`

```ts
<div class="anchor-summary">
    Every ${dayName(state.dayOfWeek)}, starting the next one.
</div>
```

Saturday May 9 (today, locally), select cadence Weekly + day of week
"Saturday" — summary says "Every Saturday, starting the next one." But
`nextOccurrenceOfWeekday(today, dow)` in `recurrence.ts:296-301` returns
**today** when `today.getDay() === dow` (delta = 0). So the first occurrence
is today, not next week.

**Fix:** make the label conditional:

```ts
const startsToday = new Date().getDay() === state.dayOfWeek;
html`Every ${dayName(state.dayOfWeek)}${startsToday ? ', starting today.' : ', starting the next one.'}`
```

Same potential issue in the monthly `anchor-summary` blocks at lines 576
and 614 — worth checking whether "this month's Nth weekday" / "this month's
Nth-of-month" is correctly indicated as today vs. next month.

---

## MINOR

### 3. Manifest served with wrong content-type

`/manifest.webmanifest` returns `Content-Type: application/octet-stream`
instead of `application/manifest+json`. Browsers tolerate it but spec-strict
PWA installers can complain. Add a header rule in `netlify.toml`:

```toml
[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
```

### 4. Breadcrumb says "DASHBOARD" but the top-level tab label is "Operations"

`src/components/bureau-header.element.ts` (breadcrumb literal) — should be
"OPERATIONS › HOMEOWNER" to match the new tab terminology, or any other
consistent word.

### 5. New-Project color picker has no visible "selected" indicator until clicked

`src/components/add-project-dialog.element.ts` — when the dialog first opens,
all five color swatches look identical. The default is `colorKey: 'red'` (per
the saved project), but the user can't tell. Add a focus ring / outline to
the currently-selected swatch from initial render.

### 6. Project-detail sort still uses legacy `priority`

`src/components/project-detail.element.ts:134-141`

```ts
const priorityWeight = {critical: 4, high: 3, medium: 2, low: 1};
const aWeight = aOverdue + (priorityWeight[a.priority] ?? 1);
```

If/when the legacy `priority` field is dropped from `Task` (per the
prototype-phase decision), this sort needs to be rewritten in terms of
`consequenceTier` (lower = more severe, so flip the comparison).

### 7. Add-task dialog has a horizontal scrollbar at the bottom

Visible in every dialog screenshot. The sheet is slightly wider than its
container at the current viewport. Likely a `box-sizing` / `width: 100%` mix
in `.sheet` or one of the Vira inputs. Cosmetic but conspicuous.

### 8. Streak doesn't render top-right when streak === 0

Spec line says "Patriot score + streak render top-right." Today only the
score renders. The streak only appears when `> 1` (and the implementation
uses "🔥 Nd · " when > 1). If streak should always be visible (even at 0),
update the header. If it should only appear when > 1, this is by design and
the spec line is wrong.

---

## VERIFIED PASSING

- App shell loads, no console errors during my interactions
- Header shows `CLEAR` + `BUREAU OF CIVIC RESPONSIBILITY` subtitle, score
  100, theme color #C41E3A
- Daily / Operations tab toggle works; Daily is the default landing
- Day-start dialogue ("Day start. I've got your back …") fires once per day
  and dismisses with [CLOSE]
- Operations empty state shows "NO ACTIVE OPERATIONS" stamp
- Open-New-Operation dialog: Cancel closes; submit creates the project card
  with the chosen color; "+ OPEN NEW OPERATION" still visible after creation;
  multi-project rendering works
- Drill-down: clicking a project card opens project-detail with breadcrumb
  and `← BACK` button
- Project-detail empty state: "No active tasks in this operation." +
  Whitaker quote
- File-New-Task dialog: title required (FILE TASK disabled until typed),
  description optional, T1–T4 toggles update the description text correctly,
  Flexible/Hard toggle correctly toggles "DATE *" required vs.
  "Suggested date (optional)"
- Recurring task expansion: cadence dropdown shows all 10 cadences; weekly
  cadence shows day-of-week picker and hides the date input; switching
  day-of-week updates the (broken) anchor summary
- Daily view bands: empty Mandatory shows the empty-state message; tasks
  with no due date / no recurrence / tier 3 / no snooze land in BACKLOG;
  Backlog is collapsed by default with a count and Show/Hide toggle; project
  name renders above task title in cross-project mode
- Persistence: state survives hard refresh; key is `bureau_v1`; valid JSON;
  view restoration works
- Service worker registered (active, scope `/`, scriptURL `/sw.js`)
- Manifest 200, name "BCR Clear", short_name "BCR Clear", 3 icons,
  theme_color #C41E3A
- Dialogue [CLOSE] button dismisses top entry; next undismissed entry
  surfaces

---

## I COULDN'T TEST — needs you

These need either time travel, the OS-level browser surface, or a real
phone:

- **Recurrence rollover.** Daily / weekly fixed / weekly rolling /
  multi-per-week reset semantics. Requires advancing the device clock
  through period boundaries or editing `currentPeriodStart` in localStorage.
- **Multi-per-period throttling and quota hide.** Same as above.
- **Cadence dropdown end-to-end submission for non-Weekly cadences.** I
  couldn't reliably change the native `<select>` value via synthetic
  events, so I verified the dropdown lists 10 cadences and renders the
  right secondary fields, but didn't file a real Monthly / Nth-weekday /
  multi-per-quarter task. Worth manually walking through each.
- **Snooze severity color escalation past 1.** I only got to 1 (and even
  that didn't save thanks to bug #1). Until #1 is fixed, snooze-color
  escalation is unverifiable.
- **PWA install button + standalone launch.** Not visible in headless
  Chrome.
- **Offline mode.** Service worker is registered but I didn't toggle the
  network panel.
- **Home screen icon on phone** (white eagle on navy, no halo).
- **Install dialog and home-screen label text** ("BCR Clear").
- **`npm test`** — sandbox can't reach npm. You'll need to run it locally;
  the test files are in place at `src/data/*.test.ts`.

---

## Suggested order to address

1. Fix bug **#1** first — every other state-change test is unreliable until
   it's resolved. Once fixed, re-run snooze, completion, and recurrence
   tests; many "minor" suspicions might resolve or surface for real.
2. Fix bug **#2** (anchor summary label) — small one-liner.
3. **#3, #4, #5** are quick polish.
4. **#6** is contingent on whether you actually drop legacy `priority` /
   `dueDate` (you said you would in prototype-phase).
5. **#7, #8** are visual/cosmetic.

Manual checklist items in TESTING.md that I couldn't get to are listed in
"I couldn't test" above — the rest of the manual section either passed or
got blocked by #1.
