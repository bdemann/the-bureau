# BCR Clear — Mobile UX Implementation Plan

> Produced after a live browser inspection of the deployed app at
> `https://clear.bureauofcivicresponsibility.org/` at 390 × 844 px (iPhone 14 viewport).
> The workspace source is stale (one commit). **Read the current source files first before
> applying any change below.** All component names and CSS class names are from the last
> known source; verify they still match before editing.

---

## Guiding Principles

- **44 px minimum touch target** — Apple HIG and Material Design both require this.
  Every tappable element that is currently smaller must be brought up to 44 px, either by
  expanding its visual size or by adding transparent padding that expands the hit area
  without changing the visual footprint.
- **No layout regressions on desktop** — Use `@media (max-width: 640px)` (the app's
  existing `max-width` breakpoint) when a change would look wrong at full width.
- **iOS safe areas** — Use `env(safe-area-inset-*)` so the app doesn't clip under the
  home indicator or notch.
- **Preserve the BCR design language** — Parchment background, navy/crimson/gold palette,
  Bebas Neue / Special Elite / Courier Prime type. These changes are layout and sizing
  only; do not alter colors, fonts, or copy.

---

## Priority 1 — Task Card Touch Targets (`task-item.element.ts`)

### 1a. Complete / Checkbox button

**Current state:** `width: 20px; height: 20px` — roughly 5 mm on a phone screen. Reliable
one-handed tapping is nearly impossible.

**Change:** Expand the hit area to 44 × 44 px using negative margin + padding technique so
the visual box size can stay proportionally smaller if desired, or just make it 44 × 44
outright. The latter is simpler.

```css
/* Replace current .complete-checkbox rule */
.complete-checkbox {
    flex-shrink: 0;
    width: 44px;          /* was 20px */
    height: 44px;         /* was 20px */
    border: 2px solid #6B6B6B;
    background: none;
    cursor: pointer;
    border-radius: 4px;   /* slightly more rounded to match the larger size */
    margin-top: 0;        /* was 1px — recalculate after resize */
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Special Elite', serif;
    font-size: 1.1rem;    /* scale up the checkmark glyph slightly */
    color: transparent;
    line-height: 1;
    padding: 0;
    transition: border-color 0.15s, background 0.15s;
}
.complete-checkbox:hover {
    border-color: #1B2A4A;
    background: rgba(27, 42, 74, 0.05);
    color: #1B2A4A;
}
```

**Adjust offsets:** The `.task-meta` and `.task-description` padding-left values that
currently read `padding-left: 30px` (to align under the checkbox + gap) should become
`padding-left: 54px` (44px checkbox + 10px gap).

### 1b. Three-dot context menu button (⋮)

The `⋮` button in the top-right of each card is currently very small. It is the gateway
to Edit / Delete — critical actions.

**Change:** Ensure the button has a 44 × 44 px tap area. If it is rendered as a
`ViraButton` or a plain `<button>`, add:

```css
.task-menu-btn {           /* adjust selector to match actual class name */
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    /* keep existing visual styling */
}
```

If it is a `vira-button`, pass `buttonSize: ViraSize.Small` and wrap it in a `<div>` with
the min-size styles applied as a layout container.

### 1c. Snooze / Skip action links

**Current state:** `Snooze (+24h)` and `Skip` render as small `<a>` or styled `<button>`
text links below the task metadata. They are roughly 18–20 px tall.

**Change:** Give the action links a minimum height of 44 px via padding so a thumb can
reliably hit them:

```css
.task-action-link {        /* adjust selector to match actual class name */
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 8px;
    /* Existing color / font / underline styling is fine to keep */
}
```

If these are `ViraButton` elements, switch from `ViraSize.Small` to `ViraSize.Medium` or
add the padding override at the host level.

---

## Priority 2 — Sticky "Make New Commitment" CTA (`project-detail.element.ts`)

**Problem observed:** On a project with 4+ tasks, the `+ MAKE NEW COMMITMENT` button sits
below all the task cards. On mobile you must scroll past all tasks to reach it. This is
the most-used action in the whole view.

**Change:** Make the button a sticky footer pinned to the bottom of the viewport.

```css
/* In project-detail styles */
.add-commitment-btn {
    position: sticky;
    bottom: 0;
    bottom: env(safe-area-inset-bottom, 0px); /* iOS home bar */
    width: 100%;
    z-index: 20;
    /* existing background / font / padding styles — keep them */
    /* Add slightly more vertical padding so it reads well as a footer */
    padding: 16px;
}
```

**Caveats:**
- The sticky footer should have a subtle top border or a slight shadow to visually separate
  it from the scrolling content: `border-top: 1px solid rgba(0,0,0,0.12);`
- The task list needs `padding-bottom` equal to the footer height (~60 px) so the last
  task card doesn't hide under the sticky button when scrolled to the bottom.

---

## Priority 3 — Add / Amend Task Dialog (`add-task-dialog.element.ts`)

This is the most complex mobile fix. The dialog is a long form that scrolls inside a modal
overlay. Several specific issues were observed:

### 3a. TIME OF DAY buttons overflow on narrow screens

**Current state:** Five options (Morning · Afternoon · Evening · Bedtime · Anytime) sit in
a single `display: flex` row. On 390 px they will either overflow or shrink below readable
size.

**Change:** Allow wrapping:

```css
.time-of-day-group {       /* adjust selector */
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.time-of-day-group button,
.time-of-day-group vira-button {
    flex: 1 1 calc(33% - 6px);  /* 3 per row */
    min-height: 44px;
    /* existing active/inactive styles unchanged */
}
```

This produces Morning · Afternoon · Evening on row 1, and Bedtime · Anytime (wider) on
row 2. Adjust the flex-basis if the current button labels differ.

### 3b. All toggle button rows — minimum height

The Consequence Tier (T1–T4), Schedule Mode (Rolling / Fixed), and Pause Commitment rows
also contain buttons. Each button should be `min-height: 44px`.

Add a shared rule:

```css
/* Covers all pill/toggle button groups in the dialog */
.toggle-group button,
.toggle-group vira-button {
    min-height: 44px;
}
```

Apply the class `toggle-group` to each button row container, or add `min-height: 44px`
directly to the existing selectors for those groups.

### 3c. Days-of-week buttons

Seven day pills in one row works at 390 px if each is roughly 40 px wide (7 × 40 = 280 px
with gaps). This is the tightest it should ever be. Verify on the actual device — if any
day label clips, allow wrapping:

```css
.days-of-week-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.days-of-week-group button {
    flex: 1 1 calc(14% - 4px);
    min-height: 44px;
}
```

### 3d. Dialog scroll on iOS

The dialog content area needs explicit scroll handling so iOS doesn't lock the scroll:

```css
.dialog-content {           /* adjust to actual dialog inner container selector */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}
```

### 3e. Dialog full-screen layout on mobile (optional but recommended)

Currently the dialog sits in a centered modal overlay. On mobile it would feel more native
as a bottom sheet that fills most of the screen height:

```css
@media (max-width: 640px) {
    .dialog-overlay {
        align-items: flex-end;        /* pin to bottom */
    }

    .dialog-panel {                   /* the actual dialog box */
        width: 100%;
        max-height: 92dvh;            /* dvh handles mobile browser chrome */
        border-radius: 20px 20px 0 0;
        padding-bottom: env(safe-area-inset-bottom, 16px);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }
}
```

If the current dialog uses `vira-modal` or `vira-drawer`, check whether those Vira
components expose a slot or CSS custom property for border-radius overrides. If not, apply
the style at the `:host` level via the element's own `styles` block.

---

## Priority 4 — Header & Navigation Polish (`bureau-header.element.ts`)

### 4a. Back button tap target

**Current state:** `← BACK` is a small text button with `padding: 3px 8px`. On mobile
this is far too small.

**Change:**

```css
.back-btn {
    /* Keep all existing visual styles */
    min-height: 44px;
    min-width: 44px;
    padding: 0 12px;          /* was 3px 8px */
    display: flex;
    align-items: center;
}
```

### 4b. Hamburger menu button (≡)

The `≡` button in the top-right header currently appears to be about 30 × 30 px.

**Change:** Same treatment — `min-height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center;`

### 4c. Safe area inset at top (status bar)

When installed as a PWA on iOS, the status bar overlaps the header if padding is not
applied. Add:

```css
header {
    padding-top: env(safe-area-inset-top, 0px);
}
```

### 4d. Active route indicator in the Bureau Menu drawer

**Problem:** There is no visual indication of which view is currently active in the
slide-out navigation drawer. On mobile this is especially disorienting.

**Change:** Pass the current `view` (or route name) down into the header/drawer component
and add a class to the active nav item:

```css
.nav-item.active {
    color: #B8860B;                     /* gold */
    border-left: 3px solid #B8860B;
    padding-left: calc(existing-padding - 3px); /* compensate for border */
}
```

This is a data-flow change, not just a CSS change. The `bureau-app` element already knows
the current view — it just needs to pass it into the header so the drawer can highlight
the right item.

---

## Priority 5 — Daily View Band Headers (`daily-view.element.ts`)

**Problem:** The collapse/expand toggle for Radar and Backlog bands is a small `ViraButton`
on the right side of the band header. On mobile the whole header should be the tap target.

**Change:** Move the click handler from the ViraButton to the parent `.band-header` div,
remove or visually downplay the ViraButton, and add:

```css
.band-header {
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    min-height: 44px;
    align-items: center;
}
```

Retain the chevron icon (▸ / ▾) as a visual affordance for the collapsed/expanded state,
but make it a non-interactive `<span>` inside the header row rather than a standalone
button.

The click handler in the `render` function should move to the `.band-header` element:

```typescript
// Before: ViraButton with @click on it
// After: band-header div gets the click
html`
    <section class="band">
        <div class="band-header ${band}"
             @click=${opts?.collapsible ? opts.onToggle : null}
             style="${opts?.collapsible ? 'cursor:pointer' : ''}">
            ...chevron span here...
        </div>
        ...
    </section>
`
```

---

## Priority 6 — Global Safe Area & Scroll (`bureau-app.element.ts` / `main.ts` / `index.html`)

### 6a. Viewport meta tag

Verify `index.html` contains:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

`viewport-fit=cover` is required for `env(safe-area-inset-*)` to work.

### 6b. App shell bottom padding

The main `.app-shell` container needs bottom padding so content doesn't hide under the iOS
home indicator or a sticky footer:

```css
.app-shell {
    padding-bottom: max(60px, env(safe-area-inset-bottom, 0px));
}
```

### 6c. Momentum scrolling on iOS

Any element that scrolls (the project task list, the Insights view, the dialog) should
have:

```css
overflow-y: auto;
-webkit-overflow-scrolling: touch;
```

---

## Priority 7 — Insights & Other Views (visual polish only)

The Insights view (`insights-view.element.ts` or equivalent) is well-structured but a few
things to verify at 390 px:

- **RESPONSIBILITIES OVERVIEW table** — the four columns (Miss · Snooze · Skip · Done)
  need to stay readable. If the table clips, add `table-layout: fixed` and set explicit
  `width` on each `<th>`. Alternatively, convert to a card-per-row layout on mobile.
- **Miss count badges** — `2 MISS`, `3 MISS` chips — verify these don't get clipped by
  the task title text. Add `flex-shrink: 0` to the badge element.

Ideas and Goals views are currently empty-state only — no mobile issues to fix.

---

## Implementation Order

Work through these in order. Each can be shipped as an independent commit:

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `task-item.element.ts` | 44px checkbox, action link heights, ⋮ menu size | Low |
| 2 | `project-detail.element.ts` | Sticky "Make New Commitment" footer | Low |
| 3 | `add-task-dialog.element.ts` | TIME OF DAY wrap, all button min-heights | Low–Medium |
| 4 | `bureau-header.element.ts` | Back btn + hamburger size, safe-area-top, active route indicator | Medium |
| 5 | `daily-view.element.ts` | Full-width band header tap target | Low |
| 6 | `bureau-app.element.ts` + `index.html` | Safe area insets, momentum scroll | Low |
| 7 | `insights-view.element.ts` (or equivalent) | Table layout, badge flex-shrink | Low |

---

## Notes for Claude CLI

- The workspace source is one commit behind the deployed build. **Run `cat` on each file
  you're about to change before editing** — class names, selectors, and component
  structure may differ from what's documented here.
- The app uses **element-vir** + **Vira** web components. Styles are in tagged template
  `css\`...\`` blocks inside each `defineElement()` call. Shadow DOM means styles are
  fully scoped — no CSS leakage between components.
- `ViraButton` sizing is controlled via `buttonSize: ViraSize.Small | ViraSize.Medium`.
  Where Vira buttons need a larger touch area but a smaller visual appearance, wrap them
  in a container `<div>` with `min-height: 44px; display: flex; align-items: center;`
  rather than fighting Vira's internal sizing.
- Test in Chrome DevTools mobile emulation at **390 × 844 (iPhone 14)** after each
  change. Also check at 375 × 667 (iPhone SE) — the smallest reasonable target.
- Run `npm test` after any data-layer-touching changes to make sure the automated suite
  still passes.
