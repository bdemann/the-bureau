# Skin System — Implementation Plan

The skin system lets the app's flavour (terminology, character names, badge
text, band labels, etc.) be swapped without touching any data or logic code.
CSS custom-property overrides are supported for future colour/font theming.

---

## Architecture

- **`src/skins/types.ts`** — the `Skin` interface (the full contract)
- **`src/skins/active-skin.ts`** — `getActiveSkin()` / `setActiveSkin()` singleton; `getRankLabel()` helper
- **`src/skins/bcr.skin.ts`** — BCR Clear (current live flavour)
- **`src/skins/vanilla.skin.ts`** — plain-English base, no thematic flavour
- **`src/skins/index.ts`** — barrel export

Components call `getActiveSkin()` inside `render()` — no prop drilling.

---

## Skins planned

| ID | Name | Status |
|----|------|--------|
| `bcr` | BCR Clear | ✅ done |
| `vanilla` | Default / plain English | ✅ done |
| `dresden` | Dresden Files (for wife) | 🔲 not started |

---

## Migration checklist

Each chunk is one commit. "Strings removed from" means the hardcoded
literals were deleted from the source file and now live only in skin files.

### ✅ Chunk 1 — Skin interface + BCR + vanilla files
Pure addition. No component changes.

### ✅ Chunk 2 — Active-skin singleton + indicator components
- `src/skins/active-skin.ts` created
- `skip-indicator.element.ts` — streaks.skip* strings
- `snooze-indicator.element.ts` — streaks.snooze* strings
- `remediation-indicator.element.ts` — streaks.remediation* strings

### ✅ Chunk 3 — Daily-view band labels
- `daily-view.element.ts` — band labels, subtitles, empty states via `skinBand()` helper
- `urgency.ts` — `bandLabel()` and `bandSubtitle()` removed

### ✅ Chunk 4 — Bottom-nav tab labels
- `bureau-bottom-nav.element.ts` — nav.daily/areas/ideas/goals

### ✅ Chunk 5 — Header (logotype, score, ranks, menu)
- `bureau-header.element.ts` — appShort, appTagline, scoreName, getRankLabel,
  areasBreadcrumb, shareTitle, sharePitch, SkinMenu strings
- `ranks.ts` — `rankLabel()` removed

---

### 🔲 Chunk 6 — Page titles, subtitles, empty states
Files: `ideas-view.element.ts`, `goals-view.element.ts`, `insights-view.element.ts`
Skin fields: `pages.ideasTitle/Subtitle/Empty`, `pages.goalsTitle/Subtitle`,
`pages.insightsTitle/Subtitle`

### 🔲 Chunk 7 — Add-task-dialog action verbs
File: `add-task-dialog.element.ts`
Strings: sheet titles (MAKE NEW ROUTINE / AMEND ROUTINE / etc.),
submit buttons (COMMIT ROUTINE / SAVE ROUTINE / FILE TASK / etc.),
delete labels (TERMINATE COMMITMENT / DELETE OBJECTIVE / DELETE IDEA),
the "+ MAKE COMMITMENT" CTA button label.
Skin section to add: `SkinActions` (or extend `SkinCommitmentTypes`).

### 🔲 Chunk 8 — Character dialogue system
File: `src/data/dialogues.ts`
This is the biggest chunk. The trigger keys (`task_completed`, `streak`,
`score_low`, etc.) are universal and stay in code. The dialogue *content*
(all Briggs/Whitaker lines) moves into the skin.
Skin field: `dialogues: DialogueMap` (same type as current dialogues.ts output).
`getDialogueFor(trigger, preferDirector)` becomes `getActiveSkin().dialogues[trigger]`.

### 🔲 Chunk 9 — CSS custom properties (colour + font theming)
Convert hardcoded hex colours and font names to CSS custom properties on
`:root`. BCR skin's `cssVars` stays undefined (base stylesheet = BCR look).
Other skins override via `cssVars` which bureau-app injects into `:root`.
This is the biggest CSS change but purely mechanical find-and-replace.

### 🔲 Chunk 10 — Dresden Files skin
After chunks 1–8 are done, all string slots exist. Write:
`src/skins/dresden.skin.ts`
Key flavour decisions (draft — iterate with wife):
- App: "Dresden's Docket" / "DOCKET"
- Score: "White Council Standing"
- Areas: "Cases"
- Routines: "Rituals" / Tasks: "Obligations" / Goals: "Investigations" / Ideas: "Hunches"
- Bands: "BINDING OBLIGATIONS" / "RECOMMENDED TODAY" / "CLOSING IN" / "COLD CASES"
- Ally character: Harry Dresden (warm, self-deprecating)
- Overseer character: Bob the Skull (snarky, analytical, slightly cruel)
- Skip critical: "RUNNING FROM IT ×N"
- Snooze critical: "WARDEN INQUIRY ×N"
- Remediation high: "WHITE COUNCIL REVIEW ×N"
- Ranks: "Vanilla Mortal" / "Apprentice" / "Practitioner" / "Warden" / "Wizard of the White Council"

---

## Skin interface summary (current)

```
Skin
├── identity      appName, appShort, appTagline, scoreName, shareTitle, sharePitch
├── characters    ally { name, shortName, title, role }
│                 overseer { name, shortName, title, role }
├── ranks         level0–level4 (score < 40 / 40–69 / 70–99 / 100–129 / 130+)
├── bands         mandatory/suggested/radar/backlog { label, subtitle, empty }
├── streaks       skip*/snooze*/remediation* as (n: number) => string
├── types         routine, task, goal, goalPlural, idea, ideaPlural
├── nav           daily, areas, ideas, goals, areasBreadcrumb
├── pages         ideasTitle/Subtitle/Empty, goalsTitle/Subtitle,
│                 insightsTitle/Subtitle
├── menu          menuTitle, insightsSectionLabel, shareSectionLabel,
│                 shareItemLabel, shareItemSub
├── dialogues     (chunk 8 — not yet in interface)
└── cssVars?      Record<string, string> — :root overrides (chunk 9)
```
