# CLEAR

**CLEAR is a personal commitment tracker dressed up as a satirical government surveillance app.**

The Bureau of Civic Responsibility is fictional. The patriot scores, field agents, suspected communists, and threat levels are a bit. The underlying app is a genuine productivity tool — one built around the idea that *to-do lists are too passive to change behavior*, and that making your follow-through visible to yourself actually matters.

---

## What makes it different from a to-do list

Most task apps let you add things, check them off, and ignore the gap between the two. CLEAR treats an uncompleted commitment as something that happened — it scores it, flags the pattern, and makes the drift visible in a way that's hard to ignore. The goal isn't guilt; it's honest feedback.

A few things CLEAR does differently:

**Commitment tiers** — Not all tasks are equal. A hard deadline for a legal filing is different from "I'd like to read more." CLEAR has four consequence tiers (critical, significant, normal, aspirational) that determine how aggressively an overdue item is flagged.

**Urgency bands** — The daily view groups work into four bands based on timing and consequence: mandatory/due today, suggested for today, coming up on the radar, and backlog. You always see the right thing at the right time.

**The score** — The Patriot Score is a rolling personal accountability number. It goes up when you follow through, down when you skip or miss things. It's calibrated so a healthy, consistent person lands around 100–130. It's only visible to you. There's no leaderboard, no server, no one watching.

**Snooze and skip tracking** — Snoozed a task six times in a row? The app notices. The character voice escalates. The streak counter tells you something true about your relationship with that item.

**Character dialogue** — Brief, contextual messages from two characters (ally and overseer) that respond to what you actually do. They're the voice of the skin you've chosen.

**Skins** — The entire vocabulary of the app is swappable. The BCR surveillance state is the default; other skins use different terminology, characters, and color palettes for the same underlying logic. All skins are pure data — no component changes required to add one.

---

## Tech stack

- **element-vir** — typed, reactive web components
- **TypeScript** — strict mode throughout
- **Vite** + **vite-plugin-pwa** — dev server and PWA bundling
- **node:test** + **@augment-vir/assert** — automated tests

## Architecture

```
src/
  data/         pure functions (scoring, recurrence, urgency, storage)
  skins/        skin interface, skin files, active-skin singleton
  components/   web components (element-vir)
  book/         component storybook (element-book)
bureau-site/    static BCR "official website" (separate deploy)
```

All state lives in `localStorage` under `bureau_v1`. No backend. No accounts. No sync. Your data stays on your device.

Skin preference is saved separately under `bureau-skin-id`.

## Skins

The skin system lives in `src/skins/`. Each skin is a plain TypeScript object implementing the `Skin` interface — no framework code, just data. Switching skins requires no component changes; components call `getActiveSkin()` inside their `render()` and receive the currently active skin.

Adding a new skin:
1. Create `src/skins/your-skin.skin.ts` implementing `Skin`
2. Add it to `ALL_SKINS` in `src/skins/all-skins.ts`
3. Export it from `src/skins/index.ts`

It will appear in the in-app skin picker automatically.

## Characters (BCR default skin)

**Director R. Harlan Briggs** — The overseer voice. A career government man who treats every snoozed task as a compliance risk. His messages appear when things go sideways and when patterns get bad enough to warrant official notice.

**Agent Henry "Hal" Whitaker** — The ally voice. Your assigned field agent. He's seen enough to know life is complicated, believes in you, and shows up when you complete things, start fresh, or need a word of encouragement.

## Snooze severity (BCR skin)

| Snoozes | Severity | Voice |
|---------|----------|-------|
| 0 | — | Normal |
| 1 | Warning | Whitaker, mild note |
| 2–3 | Caution | Whitaker, escalating concern |
| 4–5 | Danger | "FLAGGED" — Whitaker hands off |
| 6+ | Critical | "UNDER REVIEW" — Briggs takes over |

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # automated data-layer tests
npm run build     # production build → dist/
```

The bureau website (`bureau-site/`) is a separate static site, deployed independently. It has no build step.

## PWA install

After `npm run build`, serve `dist/` over HTTPS and install CLEAR from your browser's address bar or share sheet.
