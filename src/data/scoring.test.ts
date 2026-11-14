import { assert } from "@augment-vir/assert";
import { describe, test } from "node:test";
import {
    applyCompletion,
    applyDocketCleared,
    applyMilestoneProgress,
    applyPenalty,
    applyRolloverMisses,
    capMissedPeriods,
    DAILY_RATE,
    dailyLoad,
    EARLY_COMPLETION_BONUS,
    lossRatioFor,
    MAX_MISSED_PERIODS_CHARGED,
    MAX_SCORE,
    MIN_SCORE,
    occurrencesPerDay,
    REMEDIATION_CAP,
    share,
    SKIP_ESCALATION_THRESHOLD,
    streakMultiplier,
    tierWeight,
} from "./scoring.js";
import { getSkipSeverity } from "./types.js";
import type { RecurrenceConfig, Task } from "./types.js";

// Minimal task stub for tests.
function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: "test",
        areaId: null,
        title: "Test",
        description: "",
        timeOfDay: "anytime",
        kind: "task",
        consequenceTier: 3,
        deadlineType: "flexible", isMilestone: false,
        suggestedDate: null,
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: null,
        currentPeriodStart: null,
        completionsThisPeriod: 0,
        totalCompletions: 0,
        progressCount: 0,
        pausedUntil: null,
        pausedIndefinitely: false,
        snoozeCount: 0,
        snoozedUntil: null,
        totalSnoozes: 0,
        totalSkips: 0,
        totalMisses: 0,
        missedAt: null,
        taskCompletionStreak: 0,
        maxTaskCompletionStreak: 0,
        skipStreak: 0,
        completedAt: null,
        createdAt: Date.now(),
        dueDate: null,
        remediationCount: 0,
        ...overrides,
    };
}


function routine(cfg: Partial<RecurrenceConfig>, overrides: Partial<Task> = {}): Task {
    return makeTask({
        kind: "routine",
        recurrence: {
            cadence: "daily",
            frequencyPerPeriod: 1,
            scheduleMode: "fixed",
            ...cfg,
        },
        ...overrides,
    });
}

const near = (a: number, b: number, eps = 1e-9) =>
    assert.isTrue(Math.abs(a - b) < eps, `${a} !~ ${b}`);

describe("tierWeight", () => {
    test("T1=3, T2=2, T3=1, T4=0", () => {
        assert.strictEquals(tierWeight(1), 3);
        assert.strictEquals(tierWeight(2), 2);
        assert.strictEquals(tierWeight(3), 1);
        assert.strictEquals(tierWeight(4), 0);
    });
});

describe("occurrencesPerDay", () => {
    test("daily = frequency per day", () => {
        near(occurrencesPerDay(routine({ cadence: "daily" })), 1);
        near(occurrencesPerDay(routine({ cadence: "multiple_per_day", frequencyPerPeriod: 3 })), 3);
    });
    test("daily with skipDays is scaled by scheduled days", () => {
        near(occurrencesPerDay(routine({ cadence: "daily", skipDays: [0] })), 6 / 7);
    });
    test("weekly = occurrences per week / 7; multi-day counts each day", () => {
        near(occurrencesPerDay(routine({ cadence: "weekly" })), 1 / 7);
        near(occurrencesPerDay(routine({ cadence: "weekly", hardDaysOfWeek: [1, 3, 5] })), 3 / 7);
    });
    test("monthly / 30, quarterly / 91, yearly / 365", () => {
        near(occurrencesPerDay(routine({ cadence: "monthly" })), 1 / 30);
        near(occurrencesPerDay(routine({ cadence: "monthly", hardDaysOfMonth: [1, 15] })), 2 / 30);
        near(occurrencesPerDay(routine({ cadence: "quarterly" })), 1 / 91);
        near(occurrencesPerDay(routine({ cadence: "annually" })), 1 / 365);
    });
    test("one-time tasks are 0", () => {
        assert.strictEquals(occurrencesPerDay(makeTask()), 0);
    });
    test("milestone with a progress cadence uses that rate", () => {
        near(
            occurrencesPerDay(
                makeTask({
                    isMilestone: true,
                    progressCadence: { cadence: "weekly", frequencyPerPeriod: 2 },
                }),
            ),
            2 / 7,
        );
    });
});

describe("dailyLoad", () => {
    test("sums tierWeight x occurrencesPerDay over active tasks", () => {
        const tasks = [
            routine({ cadence: "daily" }, { id: "a", consequenceTier: 1 }),
            routine({ cadence: "weekly" }, { id: "b", consequenceTier: 2 }),
            makeTask({ id: "c" }),
        ];
        near(dailyLoad(tasks), 3 + 2 / 7);
    });
    test("excludes completed, missed and paused tasks; T4 adds nothing", () => {
        const tasks = [
            routine({}, { id: "a", completedAt: Date.now() }),
            routine({}, { id: "b", missedAt: Date.now() }),
            routine({}, { id: "c", pausedIndefinitely: true }),
            routine({}, { id: "d", pausedUntil: Date.now() + 86_400_000 }),
            routine({}, { id: "e", consequenceTier: 4 }),
        ];
        assert.strictEquals(dailyLoad(tasks), 0);
    });
});

describe("share", () => {
    const day = [
        routine({}, { id: "a", consequenceTier: 1 }),
        routine({}, { id: "b", consequenceTier: 2 }),
        routine({}, { id: "c", consequenceTier: 3 }),
        routine({}, { id: "d", consequenceTier: 3 }),
    ];
    test("shares across a day's occurrences sum to ~1", () => {
        const load = dailyLoad(day);
        near(day.reduce((n, t) => n + share(t, load), 0), 1);
    });
    test("a single event's share is capped at 1", () => {
        const lone = makeTask({ consequenceTier: 1 });
        assert.strictEquals(share(lone, 0), 1);
        assert.strictEquals(share(lone, 1), 1);
    });
    test("T4 has zero share", () => {
        assert.strictEquals(share(makeTask({ consequenceTier: 4 }), 10), 0);
    });
});

describe("applyCompletion / applyDocketCleared / applyMilestoneProgress", () => {
    test("a full share closes DAILY_RATE of the gap to 200", () => {
        near(applyCompletion(100, 1), 100 + DAILY_RATE * 100);
    });
    test("early completion is 1.5x the gain", () => {
        near(applyCompletion(100, 0.5, true) - 100, (applyCompletion(100, 0.5) - 100) * EARLY_COMPLETION_BONUS);
    });
    test("gains shrink near 200", () => {
        assert.isBelow(applyCompletion(190, 1) - 190, applyCompletion(50, 1) - 50);
    });
    test("T4 (share 0) never changes the score, in any direction", () => {
        assert.strictEquals(applyCompletion(80, 0), 80);
        assert.strictEquals(applyCompletion(80, 0, true), 80);
        assert.strictEquals(applyMilestoneProgress(80, 0), 80);
        assert.strictEquals(applyPenalty(80, 0, 5, 3), 80);
    });
    test("docket cleared closes 20% of a perfect day's gap", () => {
        near(applyDocketCleared(100), 100 + DAILY_RATE * 0.2 * 100);
    });
    test("milestone progress is a quarter of a completion", () => {
        near(applyMilestoneProgress(100, 0.8) - 100, (applyCompletion(100, 0.8) - 100) / 4);
    });
    test("score never exceeds 200", () => {
        assert.isTrue(applyCompletion(200, 1, true) <= MAX_SCORE);
        assert.isTrue(applyDocketCleared(199.99) <= MAX_SCORE);
        let s = 0;
        for (let i = 0; i < 2000; i++) s = applyCompletion(s, 1, true);
        assert.isTrue(s <= MAX_SCORE);
    });
});

describe("applyPenalty", () => {
    test("loss = DAILY_RATE x share x ratio x score", () => {
        near(applyPenalty(100, 1, 5, 0), 100 - DAILY_RATE * 5 * 100);
    });
    test("losses shrink near 0", () => {
        assert.isBelow(100 - applyPenalty(100, 1, 5), 100 - 100 + 100 * 1);
        assert.isBelow(10 - applyPenalty(10, 1, 5), 100 - applyPenalty(100, 1, 5));
    });
    test("score never goes below 0, even with absurd inputs", () => {
        assert.isTrue(applyPenalty(5, 1, 1000, 99) >= MIN_SCORE);
        assert.strictEquals(applyPenalty(0, 1, 5, 5), 0);
    });
    test("deeper streaks cost more", () => {
        assert.isBelow(applyPenalty(100, 1, 2.5, 5), applyPenalty(100, 1, 2.5, 1));
    });
});

describe("streakMultiplier", () => {
    test("1 + 0.1 x min(depth, 5), max 1.5", () => {
        near(streakMultiplier(0), 1);
        near(streakMultiplier(1), 1.1);
        near(streakMultiplier(5), 1.5);
        near(streakMultiplier(50), 1.5);
    });
});

describe("lossRatioFor", () => {
    test("miss: 5 mandatory, 2.5 suggested, 0 radar/backlog/hidden", () => {
        assert.strictEquals(lossRatioFor("miss", "mandatory"), 5);
        assert.strictEquals(lossRatioFor("miss", "suggested"), 2.5);
        assert.strictEquals(lossRatioFor("miss", "radar"), 0);
        assert.strictEquals(lossRatioFor("miss", "backlog"), 0);
        assert.strictEquals(lossRatioFor("miss", "hidden"), 0);
    });
    test("skip: 2.5 in every band", () => {
        for (const b of ["mandatory", "suggested", "radar", "backlog"] as const) {
            assert.strictEquals(lossRatioFor("skip", b), 2.5);
        }
    });
    test("snooze: 1 mandatory, 0.5 suggested", () => {
        assert.strictEquals(lossRatioFor("snooze", "mandatory"), 1);
        assert.strictEquals(lossRatioFor("snooze", "suggested"), 0.5);
    });
    test("penalty ordering: mandatory miss > skip > mandatory snooze", () => {
        assert.isAbove(lossRatioFor("miss", "mandatory"), lossRatioFor("skip", "mandatory"));
        assert.isAbove(lossRatioFor("skip", "mandatory"), lossRatioFor("snooze", "mandatory"));
    });
});

describe("absence cap", () => {
    test("capMissedPeriods caps at MAX_MISSED_PERIODS_CHARGED (2)", () => {
        assert.strictEquals(MAX_MISSED_PERIODS_CHARGED, 2);
        assert.strictEquals(capMissedPeriods(0), 0);
        assert.strictEquals(capMissedPeriods(1), 1);
        assert.strictEquals(capMissedPeriods(2), 2);
        assert.strictEquals(capMissedPeriods(10), 2);
    });
    test("applyRolloverMisses charges no more for 10 missed periods than for 2", () => {
        assert.strictEquals(
            applyRolloverMisses(120, 0.3, "mandatory", 10, 0),
            applyRolloverMisses(120, 0.3, "mandatory", 2, 0),
        );
    });
    test("applyRolloverMisses applies penalties one at a time", () => {
        const one = applyPenalty(120, 0.3, 5, 1);
        near(applyRolloverMisses(120, 0.3, "mandatory", 2, 0), applyPenalty(one, 0.3, 5, 2));
    });
    test("radar/backlog misses are free", () => {
        assert.strictEquals(applyRolloverMisses(120, 0.3, "backlog", 5, 0), 120);
    });
});

describe("constants", () => {
    test("SKIP_ESCALATION_THRESHOLD is 5 (T2 daily becomes mandatory after 5 skips)", () => {
        assert.strictEquals(SKIP_ESCALATION_THRESHOLD, 5);
    });
    test("REMEDIATION_CAP is 5 (remediation never requires more than 5 completions)", () => {
        assert.strictEquals(REMEDIATION_CAP, 5);
    });
});

describe("getSkipSeverity", () => {
    test("0 skips → none", () => {
        assert.strictEquals(getSkipSeverity(0), "none");
    });
    test("1 skip → warning", () => {
        assert.strictEquals(getSkipSeverity(1), "warning");
    });
    test("2–3 skips → caution", () => {
        assert.strictEquals(getSkipSeverity(2), "caution");
        assert.strictEquals(getSkipSeverity(3), "caution");
    });
    test("4–5 skips → danger", () => {
        assert.strictEquals(getSkipSeverity(4), "danger");
        assert.strictEquals(getSkipSeverity(5), "danger");
    });
    test("6+ skips → critical", () => {
        assert.strictEquals(getSkipSeverity(6), "critical");
        assert.strictEquals(getSkipSeverity(10), "critical");
    });
});

