# THE BUREAU — Session Handoff Document

> This document is written for a new Claude session picking up Phase 2 development.
> Read this, VISION.md, and scan the existing src/ files before writing any code.
> **Critical first step: locate and read the Vira source before writing any UI — see Vira section below.**

---

## What This Is

A personal Progressive Web App task manager for one user (Benjamin). It is intentionally personal — no backend, no accounts, no server. All data in localStorage. It should work offline as a PWA installed on his phone.

The app has a satirical "New Red Scare" theme. Two characters react to the user's task behavior:
- **Director R. Harlan Briggs** — stern, accusatory government overseer. Appears when things go bad.
- **Agent Carmen Reyes** — pragmatic, warm personal coach. The primary voice.

The visual style is retro propaganda poster: cream paper, deep red/navy accents, typewriter fonts, stamp effects.

The theme is fun but not the priority. Don't over-invest in theming. The features are the point.

---

## Tech Stack

- **element-vir** — typed reactive web components (built on Lit)
- **vira** — electrovir's design system. **This is mandatory, not optional — see Vira section below.**
- **TypeScript** — strict mode
- **Vite** + **vite-plugin-pwa** — dev server and PWA bundling
- **No backend. No auth. localStorage only.**

To run:
```bash
npm install
npm run dev
```

---

## Current State (Phase 1 — Complete)

The following is built and working:

- Project (category) creation and listing
- Basic task creation with title, description, priority, optional due date
- Snooze system with visual degradation (snooze count displayed, severity styles)
- Two-character dialogue system (memos that appear and can be dismissed)
- Basic patriot score (goes up on completion, down on snooze)
- Tiered daily view stub (currently just project → task list, no urgency bands)
- PWA shell (manifest, service worker via vite-plugin-pwa)
- localStorage persistence

**What Phase 1 does NOT have:**
- Recurring tasks (all tasks are currently one-time)
- Consequence tiers (only priority: low/medium/high/critical)
- Hard-date vs. window task distinction
- Urgency band calculation
- Cross-project daily view
- Multiple-per-period task tracking
- Vira components (all UI is custom CSS — treat as placeholders to be replaced)

---

## File Structure

```
src/
  data/
    types.ts         ← Core TypeScript interfaces — NEEDS MAJOR UPDATE for Phase 2
    storage.ts       ← localStorage load/save helpers + utility functions
    dialogues.ts     ← All character voice lines, getDialogueFor() function
  components/
    bureau-app.element.ts      ← Root element, owns ALL state, handles all events
    bureau-header.element.ts   ← Header bar with score, back button, breadcrumb
    character-dialogue.element.ts ← Memo-style character speech bubble
    dashboard-view.element.ts  ← Project grid + add project button
    project-card.element.ts    ← Individual project summary card
    project-detail.element.ts  ← Task list within a project
    task-item.element.ts       ← Individual task row with snooze/complete actions
    add-task-dialog.element.ts ← Bottom-sheet modal for creating tasks
    add-project-dialog.element.ts ← Bottom-sheet modal for creating projects
    snooze-indicator.element.ts ← Visual snooze severity badge
  main.ts            ← Entry point, imports all elements to register them
VISION.md            ← Full product philosophy and design decisions — READ THIS
HANDOFF.md           ← This file
```

---

## element-vir Patterns Used Throughout

```typescript
// Element with typed inputs
const MyEl = defineElement<{ myProp: string }>()({
  tagName: 'my-el',
  styles: css`...`,
  stateInitStatic: { count: 0 },
  events: {
    myEvent: defineElementEvent<string>(),
  },
  render({inputs, state, updateState, dispatch, events}) {
    return html`
      <button @click=${() => {
        updateState({count: state.count + 1});
        dispatch(new events.myEvent('hello'));
      }}>
        ${inputs.myProp}: ${state.count}
      </button>
    `;
  },
});

// Element with no inputs
const MyEl2 = defineElementNoInputs({
  tagName: 'my-el-2',
  ...
});

// Using child elements in templates
html`
  <${ChildEl}
    ${assign(ChildEl, { prop: value })}
    ${listen(ChildEl.events.myEvent, (e) => handle(e.detail))}
  ></${ChildEl}>
`
```

State is owned at the root (`bureau-app.element.ts`) and passed down as inputs. Children emit events upward. The root handles all state updates and saves to localStorage after every change.

---

## Vira — Mandatory UI Framework

**Vira must be used for UI components in Phase 2. This is not optional.** The user (Benjamin) works with element-vir professionally and wants to develop a deeper working knowledge of Vira specifically. Every piece of UI that Phase 2 adds or replaces should use Vira components where they exist.

### Context

In Phase 1, Vira was not used because the session couldn't access the npm registry or GitHub to read the API. All UI was built with custom CSS instead. Phase 2 must fix this — the custom CSS components should be treated as placeholders.

The upstream repo is: `github.com/electrovir/vira` (note: at time of writing, Vira may have been merged into the element-vir monorepo — check both locations).

**Benjamin's fork of Vira (use this, not upstream):**
```
https://github.com/bdemann/vira/tree/dev
```
Branch: `dev`

Steps to get started with it:
1. Clone the fork: `git clone -b dev https://github.com/bdemann/vira.git`
2. Read the source — particularly any `src/` components, the README, and any example/demo files
3. Understand what components are available and their input/event APIs before writing any UI
4. Install from his fork if needed: `npm install github:bdemann/vira#dev`

### How to approach Vira

Since Vira is built on element-vir, its components follow the exact same `defineElement` pattern. To understand a Vira component:
- Find its `.element.ts` file in the source
- Read `stateInitStatic` to understand what state it manages internally
- Read the `defineElement<{...}>` type parameter to understand its inputs
- Read `events: {...}` to understand what it emits
- Read the `render()` function to understand how it's used

This is more reliable than documentation. The source is the truth.

### What to use Vira for

Phase 1 custom CSS components that should be migrated or wrapped:
- Buttons (`snooze-btn`, `action-btn`, `add-btn`, `btn-submit`, `btn-cancel` throughout)
- Form inputs (text inputs, textareas, selects in the dialog forms)
- The bottom-sheet dialogs / modals themselves
- Icons, if Vira has an icon system
- Any layout or spacing primitives

Phase 2 new components that should be built with Vira from the start:
- Tab bar / navigation toggle (Daily vs. Operations views)
- The urgency band section headers in the daily view
- Form controls in the updated task creation dialog (consequence tier picker, cadence selector)

**The propaganda theme is applied on top of Vira, not instead of it.** Use Vira for structure and behavior; apply the CSS custom properties and font choices as a theme layer. If Vira components support theming via CSS custom properties, use that. If they don't, wrap them and apply classes.

### If Vira is missing something

If a needed component genuinely doesn't exist in Vira, build it as an element-vir component following Vira's patterns and conventions so it feels consistent. Note in a code comment that it's a custom component pending a Vira equivalent.

---

## Phase 2 — What Needs to Be Built

Phase 2 is the core of the product. It transforms the app from a basic task list into the system Benjamin designed.

### 2A: Updated Data Model (types.ts)

The current `Task` interface needs to be replaced. Here is the target model:

```typescript
export type RecurrenceCadence =
  | 'multiple_per_day'    // e.g., 3× per day
  | 'daily'
  | 'multiple_per_week'   // e.g., 3× per week
  | 'weekly'
  | 'multiple_per_month'  // e.g., 2× per month
  | 'monthly'
  | 'multiple_per_quarter'
  | 'quarterly'
  | 'multiple_per_year'
  | 'yearly';

export type ScheduleMode =
  | 'fixed'    // next due date anchored to calendar (always 1st of month)
  | 'rolling'; // next due date = completion date + cadence length

export type WindowType =
  | 'hard'     // must happen on suggestedDate specifically (trash day)
  | 'flexible'; // can happen any day within window; suggestedDate is a recommendation

export type ConsequenceTier = 1 | 2 | 3 | 4;
// 1 = Hard consequence (cat food — she will die)
// 2 = Soft consequence (water softener — degrades over time)
// 3 = Quality consequence (lawn — neighbors notice)
// 4 = Aspirational/identity (bookbinding — I'm just not a bookbinder)

export type DailyBand = 'mandatory' | 'suggested' | 'radar' | 'backlog';

export interface RecurrenceConfig {
  cadence: RecurrenceCadence;
  frequencyPerPeriod: number;   // 1 for standard; N for multiple_per_X
  scheduleMode: ScheduleMode;
  // For hard-date anchoring (optional — used when windowType = 'hard')
  hardDayOfWeek?: number;       // 0–6 (Sun–Sat), for weekly hard tasks
  hardDayOfMonth?: number;      // 1–31, for monthly hard tasks
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;

  // Consequence and timing type
  consequenceTier: ConsequenceTier;
  windowType: WindowType;

  // Timing
  suggestedDate: number | null;    // target/recommended date (ms timestamp)
  windowDeadline: number | null;   // last valid day for window tasks (ms timestamp)
  windowLengthDays: number | null; // total days in the current window period

  // Recurrence
  recurrence: RecurrenceConfig | null;  // null = one-time task
  currentPeriodStart: number | null;    // start of current recurrence period (ms)
  completionsThisPeriod: number;        // for multiple_per_period: how many done

  // Snooze — resets to 0 when task is completed for the period
  snoozeCount: number;
  snoozedUntil: number | null;

  // Completion
  completedAt: number | null;   // null = incomplete for current period
  createdAt: number;

  // Legacy fields — keep for backward compatibility with Phase 1 data
  // These map to: priority → consequenceTier (rough), dueDate → suggestedDate
  priority: Priority;           // may deprecate in favor of consequenceTier
  dueDate: number | null;       // may deprecate in favor of suggestedDate
}
```

**Migration note:** Phase 1 data in localStorage uses the old schema. Write a migration function in `storage.ts` that reads old tasks and converts them to the new shape with sensible defaults:
- `priority: 'low'` → `consequenceTier: 4`
- `priority: 'medium'` → `consequenceTier: 3`
- `priority: 'high'` → `consequenceTier: 2`
- `priority: 'critical'` → `consequenceTier: 1`
- `dueDate` → `suggestedDate`
- `windowType: 'flexible'` (default all existing tasks to flexible)
- `recurrence: null` (default all existing tasks to one-time)
- `completionsThisPeriod: 0`

---

### 2B: Urgency Calculation Engine (new file: src/data/urgency.ts)

This is the heart of Phase 2. Create a pure function module with no side effects.

```typescript
// src/data/urgency.ts

export type DailyBand = 'mandatory' | 'suggested' | 'radar' | 'backlog' | 'hidden';

export function getDailyBand(task: Task, today: Date): DailyBand
```

#### Full algorithm:

**Step 0 — Visibility**
Return `'hidden'` if:
- Task is completed for the current period (`completedAt !== null` and it's a one-time task, OR `completionsThisPeriod >= frequencyPerPeriod` for recurring)
- Task is snoozed until a future date (`snoozedUntil !== null && snoozedUntil > Date.now()`)

**Step 1 — Hard overdue / due today (always MANDATORY)**
- Hard-date task with `suggestedDate <= today`
- Window task with `windowDeadline <= today` (window has closed)
- Task with `cadence === 'daily' || cadence === 'multiple_per_day'`

**Step 2 — Timing band** (for tasks that passed Step 1 without resolution)

For **hard-date** tasks:
```
daysUntilDue <= 0  → MANDATORY (caught above, but safety net)
daysUntilDue <= 3  → RADAR
otherwise          → BACKLOG
```

For **flexible window** tasks:
```
suggestedDate <= today                                  → SUGGESTED
percentWindowRemaining <= 0.25                          → RADAR
percentWindowRemaining <= 0.50 AND tier <= 2            → RADAR
otherwise                                               → BACKLOG

where percentWindowRemaining = daysUntilDeadline / windowLengthDays
```

For **multiple-per-period** tasks (frequencyPerPeriod > 1), use urgency ratio instead:
```
remaining = frequencyPerPeriod - completionsThisPeriod
daysLeft  = daysUntilPeriodEnd
ratio     = remaining / daysLeft

ratio > 1.5  → MANDATORY
ratio > 0.8  → SUGGESTED
ratio > 0.3  → RADAR
otherwise    → BACKLOG
```

**Step 3 — Snooze escalation band**
```
Tier 1:  snooze >= 1 → RADAR, >= 3 → SUGGESTED, >= 5 → MANDATORY
Tier 2:  snooze >= 2 → RADAR, >= 5 → SUGGESTED, >= 8 → MANDATORY
Tier 3:  snooze >= 5 → RADAR, >= 15 → SUGGESTED, never → MANDATORY
Tier 4:  never escalates from snooze alone
```

**Step 4 — Final band = max(timingBand, snoozeBand)**
Band priority order: MANDATORY > SUGGESTED > RADAR > BACKLOG

---

### 2C: Recurrence Engine (new file: src/data/recurrence.ts)

Handles generating the next task state after a completion.

```typescript
// src/data/recurrence.ts

// Given a completed task, return the updated task for its next recurrence period
export function advanceRecurrence(task: Task, completedAt: Date): Task

// Calculate the start and end of the current period for a given cadence and reference date
export function getCurrentPeriod(cadence: RecurrenceCadence, referenceDate: Date): {
  start: Date;
  end: Date;
  lengthDays: number;
}

// Calculate the next suggested date given schedule mode and completion date
export function getNextSuggestedDate(
  task: Task,
  completedAt: Date,
  currentPeriodEnd: Date
): Date
```

**Fixed mode logic:**
The next instance keeps the same relative position in its cadence period.
- Monthly task suggested for the 10th → next is also the 10th of next month
- Weekly task suggested for Wednesday → next is Wednesday of next week

**Rolling mode logic:**
The next instance is due one cadence-length from completion date.
- Completed on the 25th (monthly task) → next suggested date is 25th of next month
- Completed on a Thursday (weekly task) → next suggested date is following Thursday

**Multiple-per-period tasks:**
Don't regenerate per completion. Instead, increment `completionsThisPeriod`. When `completionsThisPeriod >= frequencyPerPeriod`, mark the period complete and reset at the start of the next period.

The app should check for period rollovers on startup (and possibly on each render for long-running sessions). If today is past `currentPeriodStart + periodLength`, reset `completionsThisPeriod = 0`, `snoozeCount = 0`, `completedAt = null`, and calculate the new `suggestedDate`, `windowDeadline`, `currentPeriodStart`.

---

### 2D: Daily View Component (new component: src/components/daily-view.element.ts)

This is a new top-level view alongside the existing dashboard and project-detail views.

The daily view is **cross-project** — it shows all tasks across all categories, sorted into urgency bands. This is the most important view in the app.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  TODAY'S MANDATORY                                   │
│  Must happen today. No exceptions.                  │
│  [task cards...]                                     │
├─────────────────────────────────────────────────────┤
│  SUGGESTED FOR TODAY                                 │
│  Recommended. Moveable if life intervenes.          │
│  [task cards...]                                     │
├─────────────────────────────────────────────────────┤
│  ON YOUR RADAR                                       │
│  Approaching. Don't forget.                         │
│  [task cards — collapsed by default if > 5]        │
├─────────────────────────────────────────────────────┤
│  BACKLOG                                             │
│  No pressure today.                                 │
│  [task cards — collapsed by default]               │
└─────────────────────────────────────────────────────┘
```

**Empty state for MANDATORY:** "No mandatory tasks today. Agent Reyes approves."

Each task card in the daily view should show:
- Task title
- Category/project name (since this is cross-project)
- Snooze indicator (if applicable)
- Due/deadline info
- Complete button
- Snooze button

**Navigation:** The app should have two top-level views:
1. **Daily** (new — the urgency bands view, cross-project)
2. **Operations** (existing dashboard — project grid view)

Add a tab bar or toggle to switch between them. The Daily view should probably be the default landing view.

---

### 2E: Updated Task Creation Form (add-task-dialog.element.ts)

The existing form needs new fields:

- **Consequence tier** (replaces or supplements Priority) — radio buttons with descriptions:
  - Tier 1: Hard consequence — something bad happens if this slips
  - Tier 2: Soft consequence — things degrade over time
  - Tier 3: Quality consequence — nothing breaks, but things slip
  - Tier 4: Aspirational — I want to be the kind of person who does this
- **Recurring?** — toggle (one-time vs. recurring)
  - If recurring: cadence selector (dropdown or segmented control with all 10 options)
  - If multiple-per-period cadence: frequency count (2×, 3×, etc.)
  - Schedule mode: Fixed / Rolling (with brief explanation)
- **Timing type** — Hard date / Flexible window
  - If hard date: date picker for the specific date
  - If flexible: date picker for suggested date (optional), window deadline auto-calculated from cadence

The form is already a bottom-sheet modal — keep that pattern.

---

### 2F: Snooze Reset on Completion

In `bureau-app.element.ts`, the `onTaskCompleted` handler currently just sets `completedAt`. Update it to:
- Reset `snoozeCount = 0`
- Reset `snoozedUntil = null`
- If recurring: call `advanceRecurrence()` to generate the next period state
- If multiple-per-period: increment `completionsThisPeriod`; only "complete" the task when count reaches target

---

## Key Design Decisions (Don't Revisit Without Good Reason)

**Snooze resets on completion.** The snooze count is urgency information about the current instance, not a permanent history. When done → clean slate.

**Fixed vs. rolling is per-task.** Not a global setting. Some tasks benefit from calendar anchoring (habits), others from interval anchoring (maintenance).

**Daily view is cross-project.** The whole point is seeing what *actually* needs attention today, regardless of life area. Project-level browsing is a separate view.

**Theming is done enough for MVP.** The propaganda aesthetic is in place. Don't invest more time in theming during Phase 2.

**No backend, no server, no accounts.** This is a personal tool. localStorage is intentional and permanent for MVP.

**All 10 cadence levels in MVP.** The user specifically requested this. It's the feature gap vs. other apps.

---

## What NOT to Build in Phase 2

- Per-category health scores (Phase 3)
- Setup wizard / brainstorming helper (Phase 4 / low priority)
- Stats/reporting view (Phase 3)
- Import/export (Phase 3)
- Briggs-style shame scoring for snooze history (Phase 4)
- Filters on daily view (Phase 3)

---

## Suggested Build Order

0. **Get Vira fork URL from Benjamin. Clone/read source. Understand available components and their APIs before touching any UI code.**
1. Update `types.ts` with new data model
2. Write migration function in `storage.ts`
3. Write `urgency.ts` (pure functions, easy to test independently)
4. Write `recurrence.ts` (pure functions, easy to test independently)
5. Update `add-task-dialog.element.ts` with new fields, using Vira form components
6. Update `task-item.element.ts` to show new fields; migrate buttons to Vira
7. Build `daily-view.element.ts` using Vira layout/navigation primitives where available
8. Update `bureau-app.element.ts` — add daily view routing, update task completion handler
9. Update dialogue triggers to fire based on tier and band changes
10. Manual testing pass — verify urgency calculations, recurrence generation, and Vira component behavior

---

## Tone Reminder

Agent Reyes sounds real. She's smart, warm, direct. She doesn't repeat herself. She uses specific details when she can. Briggs is a bit of a caricature but not incompetent — he genuinely believes in what he's doing, which is what makes him simultaneously funny and a little uncomfortable.

The theme is window dressing on a genuinely useful personal productivity system. The functionality is the point.

---

*Written for session handoff. Primary reference: VISION.md for philosophy; this document for implementation spec.*
