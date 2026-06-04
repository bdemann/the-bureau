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

---

## Commitment Philosophy Guard

**Before implementing any change to commitment types, fields, window types, cadences, or band behavior, verify that the change aligns with the existing philosophy.**

If a requested change doesn't clearly fit — or if it seems to add complexity that duplicates something that already exists — **push back and ask for a use case** before implementing. Then work through this checklist with the user:

1. **Does this use case already fit an existing commitment type?**
   - Hard window: the specific day is the commitment; missing it means the opportunity is gone
   - Flexible window (anchored): preferred day + forgiveness window; missing the day doesn't forfeit the period
   - Flexible window (open): any day in the period works; no preferred day
   - Milestone: multi-session project worked toward until genuinely done
   - Goal: long-horizon aspiration; no daily accountability, no score impact
   - Idea: captured without commitment; no schedule, no pressure

2. **Is the user trying to express a timing pattern the system doesn't support yet?**
   Known gaps with open GitHub issues:
   - "Daily except Sunday" → use daily + skipDays once #skipDays is built (workaround: multi-day weekly)
   - "Nth weekday of a month, yearly" → GitHub #35
   - "N days before a recurring event" → GitHub #36

3. **Is the user overtiering or undertiering?**
   - T1: something genuinely bad happens if this slips (not just "important")
   - T2: things degrade over time with consistent neglect
   - T3: quality drops, but nothing breaks
   - T4: aspirational — tracked without any score consequence

4. **Is the user conflating hard and flexible windows?**
   The test: *"If I miss my preferred day, is the opportunity gone?"*
   Yes → hard. No → flexible with a suggestedDate.

If the use case genuinely requires a new concept not in the philosophy, document it in `docs/open-design-questions.md` and discuss before building.
