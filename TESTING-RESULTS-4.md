# Testing pass — 2026-05-14 (Round 4)

Tested against `https://clear.bureauofcivicresponsibility.org/` (Netlify deploy)
in a Chrome session. This pass focused exclusively on checklist items that were
**added or updated in TESTING.md since Round 3** and were therefore not covered
in TESTING-RESULTS-3.md.

---

## SCOPE OF THIS PASS

The updated TESTING.md added or clarified four areas since Round 3:

1. **App shell** — "Clicking outside the menu panel closes it" (was implicit before)
2. **Daily view** — time-of-day slot grouping within bands (new section)
3. **Recurring end conditions** — full expanded UI (only partially noted in Round 3)
4. **Weekly task creation** — "FILE TASK disabled when no days selected" guard +
   "No days selected." label

Rollover/completion edge cases (single-day today vs. not-today, multi-day
completion sequencing, slot transition timing) remain untestable without device
clock manipulation and are carried forward as before.

---

## NEW BUG FOUND THIS PASS

### NEW-4. Time-of-day slot default expansion does not match current time — MINOR

The TESTING.md spec states: *"The slot matching the current time of day starts
expanded; others start collapsed."* This is not the current behaviour.

**Observed:** After a hard reload and expanding the BACKLOG band, all three
time-of-day slots (MORNING · 1, AFTERNOON · 1, ANYTIME · 1) render as collapsed
headers. No slot is auto-expanded, even though the test was conducted in the
afternoon and the AFTERNOON slot should be the default-open one.

**Repro:**
1. Have tasks with `timeOfDay` = Morning, Afternoon, and Anytime in at least one
   band (e.g. BACKLOG).
2. Hard-reload the page (F5).
3. Expand the BACKLOG band.
4. Observe: all three slot headers are collapsed. AFTERNOON is not pre-expanded.

**Expected:** AFTERNOON slot expands automatically on load (current time = afternoon).

---

## PRIOR OPEN BUGS — STATUS UNCHANGED

The following bugs from prior rounds remain open and were not re-tested in depth
this pass (no code changes were deployed between Round 3 and Round 4):

- **Bug #3** — Manifest served with wrong content-type (`application/octet-stream`
  instead of `application/manifest+json`). Still needs the `netlify.toml` header
  rule documented in Round 3.
- **NEW-2** — Skip action fires the `snooze_1` Whitaker dialogue instead of a
  Skip-specific (or no) dialogue.
- **NEW-3** — "Report a Neighbor" in the BUREAU MENU is a non-functional stub.

---

## VERIFIED PASSING THIS PASS

### App shell

- [x] Clicking outside the menu panel closes it ✅  
  Confirmed: hamburger opened the BUREAU MENU drawer; clicking the dimmed main
  content area to the left dismissed the drawer cleanly.

### Daily view — time-of-day slot grouping

- [x] When tasks span multiple time-of-day slots within a band, each slot has a
  collapsible header (label · count · chevron) ✅  
  BACKLOG with Morning / Afternoon / Anytime tasks showed three correctly-labelled
  slot headers, each with a task count and chevron.

- [x] Tapping a slot header toggles it open/closed ✅  
  Clicking AFTERNOON opened it (task card appeared); clicking again closed it.
  Clicking MORNING opened it (task card appeared); clicking again closed it.
  Both directions confirmed.

- [ ] The slot matching the current time of day starts expanded; others start
  collapsed ❌ **BUG — see NEW-4 above**

- [ ] Switching to background and returning after the time slot changes resets the
  default to the new slot — **CANNOT TEST** (requires waiting through a time-slot
  boundary)

- [ ] Active use (app stays open through a slot transition) does NOT collapse open
  sections — **CANNOT TEST** (same reason)

### Recurring end conditions — full UI

- [x] "Task has an end condition" checkbox is **hidden** for one-time tasks ✅  
  Unchecking "Recurring task" caused the end condition row to disappear entirely.

- [x] Checkbox appears inside the recurring section ✅  
  Re-checking "Recurring task" restored the "Task has an end condition" checkbox
  at the bottom of the recurring block.

- [x] Checking it reveals "N completions" / "A date" toggle ✅  
  The END AFTER row appeared with two options: "N completions" (pre-selected) and
  "A date".

- [x] "N completions" shows a number input ✅  
  Input labeled "NUMBER OF COMPLETIONS" appeared, defaulting to **10**.

- [x] "A date" shows a date picker ✅  
  Switching to "A date" replaced the number input with a date field labeled
  "LAST DAY (INCLUSIVE)".

- [ ] After N completions: task disappears permanently — **CANNOT TEST** (requires
  completing a task N times)

- [ ] After date: completing on the end date permanently closes the task —
  **CANNOT TEST** (requires clock manipulation)

- [ ] After date: task is retired on next app load after end date passes —
  **CANNOT TEST** (requires clock manipulation)

- [ ] Edit dialog pre-fills end condition from an existing task with one set —
  **NOT TESTED** (would require creating a task with an end condition, then
  re-opening it; deferred to next pass)

### Weekly cadence — no-days-selected guard

- [x] FILE TASK disabled when no days selected ✅  
  Deselected all seven day-of-week buttons while a title was entered. FILE TASK
  button remained greyed-out/disabled.

- [x] "No days selected." label appears below the day row ✅  
  The label "No days selected." rendered immediately below the day buttons when
  all were toggled off.

### Milestone timing type (one-time tasks)

Not in TESTING.md but observed during end-condition testing:

- [x] One-time task dialog shows a **Milestone** option alongside Flexible window
  and Hard date in TIMING TYPE ✅  
  Visible when "Recurring task" is unchecked.

---

## STILL COULDN'T TEST — needs you or clock manipulation

Carried forward from prior rounds, plus new additions:

- **Recurrence rollover** — requires device clock manipulation.
- **Hard-date task "Cannot snooze"** — create a T1 hard-date task due today.
- **Skip + snooze interaction at higher counts** — does Skip eventually trigger
  the Briggs takeover at 6 deferrals?
- **Report a Neighbor** — stub (NEW-3).
- **PWA install button, standalone launch, offline mode.**
- **Home screen icon + install dialog text.**
- **`npm test`** — run locally.
- **Multi-per-period tasks end-to-end** — creation and progress chip behaviour.
- **End condition enforcement** — N completions expiry, date-based retirement
  (all require time travel or many completions).
- **Edit dialog pre-fills end condition** — open an existing task that has an
  end condition set.
- **Slot transition timing** — current-time slot auto-expands after background/
  foreground transition; active-use session does not collapse open sections.
- **Single-day weekly first occurrence** — today-matches vs. today-doesn't-match
  (requires a task whose day matches today, and one that doesn't).
- **Multi-day completion rollover** — complete on Wed (Mon/Wed/Fri) → next = Fri;
  complete on Fri → next = Mon next week.

---

## Suggested fix order (updated)

1. **NEW-4** (slot default expansion) — on BACKLOG expand, auto-open the slot
   whose label matches the current hour bracket. One-liner in the slot-render
   logic; low risk.
2. **NEW-2** (Skip fires snooze dialogue) — guard the dialogue trigger so it
   does not fire on Skip actions.
3. **Bug #3** (manifest content-type) — one `netlify.toml` stanza.
4. **NEW-3** (Report a Neighbor stub) — implement or remove from menu.
5. **Bug #8** (zero-streak visibility) — product call first, then one-liner.
6. **Bug #6** (legacy priority sort) — contingent on dropping `priority` field.
