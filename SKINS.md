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

### ✅ Chunk 6 — Page titles, subtitles, empty states
- `ideas-view.element.ts` — pages.ideasTitle/Subtitle/Empty
- `goals-view.element.ts` — pages.goalsTitle/Subtitle
- `insights-view.element.ts` — pages.insightsTitle/Subtitle

### ✅ Chunk 7 — Add-task-dialog action verbs + daily-view CTA
- `src/skins/types.ts` — new `SkinActions` interface; added to `Skin`
- `add-task-dialog.element.ts` — sheet titles (new*/edit*), kind-toggle
  buttons (→ types.*), submit/save buttons, delete label/confirm/btn
- `daily-view.element.ts` — `makeCommitmentCta` CTA button

### ✅ Chunk 8 — Character dialogue system
- `src/skins/types.ts` — new `SkinDialogueLine` + `DialogueMap` types; `dialogues: DialogueMap` added to `Skin`
- `src/data/dialogues.ts` — `DIALOGUES` array removed; `getDialogueFor` now reads `getActiveSkin().dialogues`; trigger keys + `DialogueLine` return type kept here
- `src/skins/bcr.skin.ts` — all 13 BCR trigger pools (Briggs + Whitaker lines)
- `src/skins/vanilla.skin.ts` — all 13 neutral trigger pools
- `src/data/dialogues.test.ts` — updated to use `bcrSkin.dialogues`; added `day_start` agent-only assertion

### ✅ Chunk 9 — CSS custom properties (colour + font theming)
- `index.html` `:root` block — 19 CSS vars (palette + typography)
- All 20 `src/components/*.ts` files — hardcoded hex / font strings → `var(--*)`
- `src/skins/active-skin.ts` — `setActiveSkin` now calls `applyCssVars`; clears
  prior overrides then writes `skin.cssVars` entries to `document.documentElement.style`
- BCR skin `cssVars: undefined` — base stylesheet is the BCR look, no overrides needed

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
├── actions       new*/edit* sheet titles, submit*/save* buttons,
│                 delete*Label/Confirm/Btn, makeCommitmentCta
├── dialogues     DialogueMap — 13 trigger pools, each ReadonlyArray<SkinDialogueLine>
├── menu          menuTitle, insightsSectionLabel, shareSectionLabel,
│                 shareItemLabel, shareItemSub
├── dialogues     (chunk 8 — not yet in interface)
└── cssVars?      Record<string, string> — :root overrides (chunk 9)
```
