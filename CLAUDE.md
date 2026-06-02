# CLAUDE.md — BCR Clear

Project-specific instructions for Claude Code sessions on this repo.

---

## Testing

**Every feature addition or behavior change must be accompanied by a test, if one is possible to write.**

Two layers are available — use whichever fits:

**Automated (`npm test`)** — preferred for anything in the data layer. Test files live alongside source in `src/data/*.test.ts`. Use `node:test` + `@augment-vir/assert`. These cover pure functions: urgency calculation, recurrence math, storage helpers, dialogues, ranks. If the thing you're building is a pure function or can be exercised without a DOM, write an automated test.

**Manual checklist (`TESTING.md`)** — for UI flows that require a real browser (element rendering, event propagation, dialog behavior, PWA install). Add checklist rows to the relevant section, or create a new section if the feature doesn't fit an existing one. Keep entries action/assertion format: *do X → expect Y*.

When fixing a bug, add a regression test first (automated if possible), then fix.

---

## Vision Documents

**Before making significant changes to band logic (urgency.ts), scoring (scoring.ts), or daily-view behavior, consult the vision docs first.**

- `VISION.md` — core design philosophy and daily view intent
- `docs/daily-view-band-rules.md` — clean decision matrix for what lands in each band
- `docs/scoring-redesign.md` — band-aware scoring rules and the bug they fix
- `docs/flexible-windows.md` — how flexible windows work and key distinctions
- `docs/open-design-questions.md` — unresolved design questions (don't implement these without decisions)
- `docs/implementation-roadmap.md` — planned work order

**If a new vision decision is made during a session, update the relevant doc before implementing.** The docs are the record; implementation follows from them.
