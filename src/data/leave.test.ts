import { assert } from "@augment-vir/assert";
import { describe, test } from "node:test";
import {
    LEAVE_WINDOW_ALLOWANCE_DAYS,
    type LeaveFields,
    NO_LEAVE,
    addDays,
    endLeaveNow,
    gapCoveredByLeave,
    isOnLeave,
    isPresetAvailable,
    leaveContextFor,
    leaveDaysRemaining,
    leaveDaysUsed,
    maxLeaveDaysAvailable,
    normalizeLeave,
    pruneLeaveHistory,
    startLeave,
    tasksForDisplay,
} from "./leave.js";
import { rolloverIfNeeded, getCurrentPeriod } from "./recurrence.js";
import { dailyLoad } from "./scoring.js";
import { buildJsonExport, parseImport } from "./export-import.js";
import { DEFAULT_STATE, getAppDayString, isCurrentlyPaused, migrateState } from "./storage.js";
import { getDailyBand } from "./urgency.js";
import type { AppState } from "./types.js";
import { SCHEMA_VERSION } from "./types.js";
import { date, makeRecurrence, makeTask } from "./test-fixtures.js";

const none: LeaveFields = { leaveUntil: null, leaveHistory: [] };

describe("isOnLeave", () => {
    test("false with no leave", () => {
        assert.isFalse(isOnLeave(null, "2026-06-10"));
    });
    test("true through the last leave day, false the day after", () => {
        assert.isTrue(isOnLeave("2026-06-12", "2026-06-10"));
        assert.isTrue(isOnLeave("2026-06-12", "2026-06-12"));
        assert.isFalse(isOnLeave("2026-06-12", "2026-06-13"));
    });
});

describe("isOnLeave with the day-reset hour", () => {
    // `getAppDayString` supplies "today": before the reset hour it is still yesterday.
    function appDayAt(hour: number, resetHour: number): string {
        const realNow = Date.now;
        try {
            const at = new Date(2026, 5, 13, hour, 0, 0).getTime();
            Date.now = () => at;
            return getAppDayString(resetHour);
        } finally {
            Date.now = realNow;
        }
    }

    test("at 02:00 with a 4am reset the app day is still the last leave day", () => {
        assert.strictEquals(appDayAt(2, 4), "2026-06-12");
        assert.isTrue(isOnLeave("2026-06-12", appDayAt(2, 4)));
    });
    test("at 05:00 with a 4am reset the leave is over", () => {
        assert.strictEquals(appDayAt(5, 4), "2026-06-13");
        assert.isFalse(isOnLeave("2026-06-12", appDayAt(5, 4)));
    });
    test("with a midnight reset 02:00 is already the next day", () => {
        assert.isFalse(isOnLeave("2026-06-12", appDayAt(2, 0)));
    });
});

describe("rolling allowance", () => {
    test("nothing used with no history", () => {
        assert.strictEquals(leaveDaysRemaining([], "2026-06-10"), 14);
    });
    test("sums inclusive spans inside the window", () => {
        const history = [
            { start: "2026-06-01", end: "2026-06-03" }, // 3
            { start: "2026-06-05", end: "2026-06-09" }, // 5
        ];
        assert.strictEquals(leaveDaysUsed(history, "2026-06-10"), 8);
        assert.strictEquals(leaveDaysRemaining(history, "2026-06-10"), 6);
    });
    test("only the part of a span inside the last 90 days counts", () => {
        // Window on 2026-06-30 starts 2026-04-02 (90 days inclusive).
        const history = [{ start: "2026-03-30", end: "2026-04-03" }];
        assert.strictEquals(leaveDaysUsed(history, "2026-06-30"), 2);
    });
    test("a span older than the window frees its days", () => {
        const history = [{ start: "2026-01-01", end: "2026-01-07" }];
        assert.strictEquals(leaveDaysRemaining(history, "2026-06-30"), 14);
    });
    test("max available is capped at 7 per leave and by the remaining allowance", () => {
        assert.strictEquals(maxLeaveDaysAvailable([], "2026-06-10"), 7);
        const history = [{ start: "2026-06-01", end: "2026-06-09" }]; // 9 used, 5 left
        assert.strictEquals(maxLeaveDaysAvailable(history, "2026-06-10"), 5);
    });
    test("presets are disabled when larger than what is left", () => {
        const history = [{ start: "2026-06-01", end: "2026-06-09" }]; // 5 left
        assert.isTrue(isPresetAvailable(3, history, "2026-06-10"));
        assert.isFalse(isPresetAvailable(7, history, "2026-06-10"));
        const exhausted = [
            { start: "2026-06-01", end: "2026-06-07" },
            { start: "2026-06-08", end: "2026-06-14" },
        ];
        assert.strictEquals(leaveDaysRemaining(exhausted, "2026-06-20"), LEAVE_WINDOW_ALLOWANCE_DAYS - 14);
        assert.isFalse(isPresetAvailable(3, exhausted, "2026-06-20"));
        assert.isFalse(isPresetAvailable(7, exhausted, "2026-06-20"));
    });
});

describe("startLeave", () => {
    test("starts today and ends after the requested days", () => {
        const out = startLeave(none, 3, "2026-06-10")!;
        assert.strictEquals(out.leaveUntil, "2026-06-12");
        assert.deepEquals(out.leaveHistory, [{ start: "2026-06-10", end: "2026-06-12" }]);
    });
    test("refuses more than 7 days, more than the allowance, and a second concurrent leave", () => {
        assert.isNull(startLeave(none, 8, "2026-06-10"));
        const history = [{ start: "2026-06-01", end: "2026-06-09" }];
        assert.isNull(startLeave({ leaveUntil: null, leaveHistory: history }, 7, "2026-06-10"));
        const active = startLeave(none, 3, "2026-06-10")!;
        assert.isNull(startLeave(active, 3, "2026-06-11"));
    });
});

describe("endLeaveNow", () => {
    test("only the days actually taken count", () => {
        const started = startLeave(none, 7, "2026-06-10")!;
        // Ends on day 3: days taken are Jun 10 and Jun 11.
        const ended = endLeaveNow(started, "2026-06-12");
        assert.isNull(ended.leaveUntil);
        assert.deepEquals(ended.leaveHistory, [{ start: "2026-06-10", end: "2026-06-11" }]);
        assert.strictEquals(leaveDaysUsed(ended.leaveHistory, "2026-06-12"), 2);
        assert.strictEquals(leaveDaysRemaining(ended.leaveHistory, "2026-06-12"), 12);
    });
    test("ending on the day it started uses no days", () => {
        const started = startLeave(none, 7, "2026-06-10")!;
        const ended = endLeaveNow(started, "2026-06-10");
        assert.isNull(ended.leaveUntil);
        assert.deepEquals(ended.leaveHistory, []);
    });
    test("is a no-op when not on leave", () => {
        assert.deepEquals(endLeaveNow(none, "2026-06-10"), none);
    });
});

describe("history pruning and normalisation", () => {
    test("prunes spans that ended before the 90-day window", () => {
        const history = [
            { start: "2026-01-01", end: "2026-01-03" },
            { start: "2026-06-01", end: "2026-06-03" },
        ];
        assert.deepEquals(pruneLeaveHistory(history, "2026-06-30"), [history[1]!]);
    });
    test("normalizeLeave clears an expired leaveUntil", () => {
        const out = normalizeLeave(
            { leaveUntil: "2026-06-12", leaveHistory: [{ start: "2026-06-10", end: "2026-06-12" }] },
            "2026-06-13",
        );
        assert.isNull(out.leaveUntil);
        assert.strictEquals(out.leaveHistory.length, 1);
    });
});

describe("gapCoveredByLeave", () => {
    const spans = [{ start: "2026-06-10", end: "2026-06-12" }];
    test("true when every day between is on leave", () => {
        assert.isTrue(gapCoveredByLeave(spans, "2026-06-09", "2026-06-13"));
    });
    test("false for a consecutive day or an uncovered gap", () => {
        assert.isFalse(gapCoveredByLeave(spans, "2026-06-12", "2026-06-13"));
        assert.isFalse(gapCoveredByLeave(spans, "2026-06-08", "2026-06-13"));
    });
});

describe("addDays", () => {
    test("crosses month and year boundaries", () => {
        assert.strictEquals(addDays("2026-01-31", 1), "2026-02-01");
        assert.strictEquals(addDays("2026-01-01", -1), "2025-12-31");
    });
});

describe("migration and export/import", () => {
    test("v6 state migrates to v7 with leave defaults", () => {
        const v6 = { ...DEFAULT_STATE, schemaVersion: 6 } as Partial<AppState>;
        delete (v6 as Record<string, unknown>).leaveUntil;
        delete (v6 as Record<string, unknown>).leaveHistory;
        const out = migrateState(v6 as AppState);
        assert.strictEquals(out.schemaVersion, SCHEMA_VERSION);
        assert.isNull(out.leaveUntil);
        assert.deepEquals(out.leaveHistory, []);
    });
    test("a current-version state missing leave fields gets defaults", () => {
        const s = { ...DEFAULT_STATE } as Partial<AppState>;
        delete (s as Record<string, unknown>).leaveUntil;
        const out = migrateState(s as AppState);
        assert.isNull(out.leaveUntil);
    });
    test("JSON export/import round-trips an active leave", () => {
        const state: AppState = {
            ...DEFAULT_STATE,
            leaveUntil: "2026-06-12",
            leaveHistory: [{ start: "2026-06-10", end: "2026-06-12" }],
        };
        const parsed = parseImport(buildJsonExport(state))!;
        const out = migrateState(parsed);
        assert.strictEquals(out.leaveUntil, "2026-06-12");
        assert.deepEquals(out.leaveHistory, [{ start: "2026-06-10", end: "2026-06-12" }]);
    });
});

describe("leave is routed through the pause paths", () => {
    const task = makeTask({ consequenceTier: 1, recurrence: makeRecurrence({ cadence: "daily" }) });

    test("isCurrentlyPaused, getDailyBand and dailyLoad honour onLeave", () => {
        assert.isFalse(isCurrentlyPaused(task));
        assert.isTrue(isCurrentlyPaused(task, true));
        assert.strictEquals(getDailyBand(task, new Date(), true), "hidden");
        assert.isAbove(dailyLoad([task]), 0);
        assert.strictEquals(dailyLoad([task], true), 0);
    });

    test("tasksForDisplay marks copies paused and never mutates the originals", () => {
        const shown = tasksForDisplay([task], true);
        assert.isTrue(shown[0]!.pausedIndefinitely);
        assert.isFalse(task.pausedIndefinitely);
        assert.strictEquals(tasksForDisplay([task], false)[0], task);
    });
});

describe("a 5-day leave is a no-op for scoring state", () => {
    const daily = makeTask({
        id: "daily",
        consequenceTier: 1,
        recurrence: makeRecurrence({ cadence: "daily" }),
        currentPeriodStart: date("2026-06-10").getTime(),
        suggestedDate: date("2026-06-10").getTime(),
        skipStreak: 2,
        snoozeCount: 1,
        remediationCount: 3,
        taskCompletionStreak: 4,
        totalMisses: 7,
    });
    const weekly = makeTask({
        id: "weekly",
        consequenceTier: 2,
        recurrence: makeRecurrence({ cadence: "weekly" }),
        currentPeriodStart: getCurrentPeriod("weekly", date("2026-06-10")).start,
        suggestedDate: date("2026-06-10").getTime(),
        taskCompletionStreak: 2,
    });
    const pausedByHand = makeTask({
        id: "paused",
        recurrence: makeRecurrence({ cadence: "daily" }),
        currentPeriodStart: date("2026-06-10").getTime(),
        pausedIndefinitely: true,
        pausedUntil: null,
    });
    const tasks = [daily, weekly, pausedByHand];
    const leaveFields = startLeave(none, 5, "2026-06-10")!; // Jun 10 – Jun 14

    test("nothing rolls over or changes on any leave day", () => {
        for (const day of ["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"]) {
            const ctx = leaveContextFor(leaveFields, day);
            assert.isTrue(ctx.active);
            for (const t of tasks) {
                assert.strictEquals(rolloverIfNeeded(t, date(day), ctx), t);
            }
        }
    });

    test("first day back forgives lapsed periods: no misses, skips, streak or count changes", () => {
        const ctx = leaveContextFor(leaveFields, "2026-06-15");
        assert.isFalse(ctx.active);
        const out = rolloverIfNeeded(daily, date("2026-06-15"), ctx);
        assert.strictEquals(out.totalMisses, daily.totalMisses);
        assert.strictEquals(out.skipStreak, daily.skipStreak);
        assert.strictEquals(out.snoozeCount, daily.snoozeCount);
        assert.strictEquals(out.remediationCount, daily.remediationCount);
        assert.strictEquals(out.taskCompletionStreak, daily.taskCompletionStreak);
        // The period itself advanced to today.
        assert.strictEquals(out.currentPeriodStart, date("2026-06-15").getTime());
    });

    test("without leave the same rollover would charge a miss (control)", () => {
        const out = rolloverIfNeeded(daily, date("2026-06-15"), NO_LEAVE);
        assert.strictEquals(out.totalMisses, daily.totalMisses + 1);
    });

    test("a weekly period that ended during leave is forgiven; one still running continues", () => {
        // Week of Jun 7–13 ends inside the leave; first day back is Jun 15 (next week).
        const out = rolloverIfNeeded(weekly, date("2026-06-15"), leaveContextFor(leaveFields, "2026-06-15"));
        assert.strictEquals(out.totalMisses, weekly.totalMisses);
        assert.strictEquals(out.taskCompletionStreak, weekly.taskCompletionStreak);
    });

    test("a period that ended BEFORE leave began is not forgiven", () => {
        const stale = makeTask({
            recurrence: makeRecurrence({ cadence: "daily" }),
            currentPeriodStart: date("2026-06-08").getTime(),
            suggestedDate: date("2026-06-08").getTime(),
        });
        const out = rolloverIfNeeded(stale, date("2026-06-15"), leaveContextFor(leaveFields, "2026-06-15"));
        assert.strictEquals(out.totalMisses, stale.totalMisses + 1);
    });

    test("per-commitment pause fields are never touched", () => {
        for (const day of ["2026-06-12", "2026-06-15"]) {
            const out = rolloverIfNeeded(pausedByHand, date(day), leaveContextFor(leaveFields, day));
            assert.strictEquals(out.pausedIndefinitely, true);
            assert.strictEquals(out.pausedUntil, null);
        }
        const rolled = rolloverIfNeeded(daily, date("2026-06-15"), leaveContextFor(leaveFields, "2026-06-15"));
        assert.strictEquals(rolled.pausedIndefinitely, false);
        assert.strictEquals(rolled.pausedUntil, null);
    });
});
