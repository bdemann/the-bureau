import { assert } from "@augment-vir/assert";
import { describe, test } from "node:test";
import {
    DEFAULT_STATE,
    daysBetween,
    isCurrentlySnoozed,
    isTaskCompleteForPeriod,
    isTaskOverdue,
    isTaskVisible,
    migrateState,
    startOfDay,
} from "./storage.js";
import type { AppState, Goal, Idea, Task } from "./types.js";
import { SCHEMA_VERSION } from "./types.js";
import { date, makeGoal, makeIdea, makeRecurrence, makeTask } from "./test-fixtures.js";

const DAY_MS = 86_400_000;

describe("startOfDay", () => {
    test("zeros hours/minutes/seconds/ms", () => {
        const d = new Date("2026-05-09T13:45:30.123");
        const sod = startOfDay(d);
        assert.strictEquals(sod.getHours(), 0);
        assert.strictEquals(sod.getMinutes(), 0);
        assert.strictEquals(sod.getSeconds(), 0);
        assert.strictEquals(sod.getMilliseconds(), 0);
    });
});

describe("daysBetween", () => {
    test("same day = 0", () => {
        assert.strictEquals(
            daysBetween(date("2026-05-09"), date("2026-05-09")),
            0,
        );
    });

    test("one day forward = 1", () => {
        assert.strictEquals(
            daysBetween(date("2026-05-09"), date("2026-05-10")),
            1,
        );
    });

    test("one day backward = -1", () => {
        assert.strictEquals(
            daysBetween(date("2026-05-10"), date("2026-05-09")),
            -1,
        );
    });

    test("ignores time-of-day", () => {
        const a = new Date("2026-05-09T23:59:00");
        const b = new Date("2026-05-10T00:01:00");
        assert.strictEquals(daysBetween(a, b), 1);
    });
});

describe("isCurrentlySnoozed", () => {
    test("null snoozedUntil → false", () => {
        assert.strictEquals(isCurrentlySnoozed({ snoozedUntil: null }), false);
    });

    test("past snoozedUntil → false", () => {
        assert.strictEquals(
            isCurrentlySnoozed({ snoozedUntil: Date.now() - 1000 }),
            false,
        );
    });

    test("future snoozedUntil → true", () => {
        assert.strictEquals(
            isCurrentlySnoozed({ snoozedUntil: Date.now() + 1000 }),
            true,
        );
    });
});

describe("isTaskCompleteForPeriod", () => {
    test("one-time task with completedAt → complete", () => {
        const t = makeTask({ completedAt: Date.now() });
        assert.strictEquals(isTaskCompleteForPeriod(t), true);
    });

    test("one-time task without completedAt → not complete", () => {
        const t = makeTask();
        assert.strictEquals(isTaskCompleteForPeriod(t), false);
    });

    test("multi-per-period under target → not complete", () => {
        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: "weekly",
                frequencyPerPeriod: 3,
            }),
            completionsThisPeriod: 1,
        });
        assert.strictEquals(isTaskCompleteForPeriod(t), false);
    });

    test("multi-per-period at target → complete", () => {
        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: "weekly",
                frequencyPerPeriod: 3,
            }),
            completionsThisPeriod: 3,
        });
        assert.strictEquals(isTaskCompleteForPeriod(t), true);
    });
});

describe("isTaskVisible", () => {
    test("incomplete + not snoozed → visible", () => {
        assert.strictEquals(
            isTaskVisible({ completedAt: null, snoozedUntil: null }),
            true,
        );
    });

    test("completed → not visible", () => {
        assert.strictEquals(
            isTaskVisible({ completedAt: Date.now(), snoozedUntil: null }),
            false,
        );
    });

    test("snoozed in future → not visible", () => {
        assert.strictEquals(
            isTaskVisible({
                completedAt: null,
                snoozedUntil: Date.now() + DAY_MS,
            }),
            false,
        );
    });

    test("snoozedUntil in past → visible (snooze expired)", () => {
        assert.strictEquals(
            isTaskVisible({
                completedAt: null,
                snoozedUntil: Date.now() - DAY_MS,
            }),
            true,
        );
    });
});

describe("isTaskOverdue", () => {
    test("null suggestedDate → not overdue", () => {
        assert.strictEquals(
            isTaskOverdue({
                suggestedDate: null,
                dueDate: null,
                completedAt: null,
            }),
            false,
        );
    });

    test("past suggestedDate → overdue", () => {
        assert.strictEquals(
            isTaskOverdue({
                suggestedDate: Date.now() - 2 * DAY_MS,
                dueDate: null,
                completedAt: null,
            }),
            true,
        );
    });

    test("completed task is never overdue", () => {
        assert.strictEquals(
            isTaskOverdue({
                suggestedDate: Date.now() - 2 * DAY_MS,
                dueDate: null,
                completedAt: Date.now(),
            }),
            false,
        );
    });

    test("future suggestedDate → not overdue", () => {
        assert.strictEquals(
            isTaskOverdue({
                suggestedDate: Date.now() + 2 * DAY_MS,
                dueDate: null,
                completedAt: null,
            }),
            false,
        );
    });
});

// A realistic Phase 1 task shape — none of the Phase 2 fields exist yet.
function v1Task(
    priority: "low" | "medium" | "high" | "critical",
    dueDate: number | null = null,
) {
    return {
        id: "task-id",
        areaId: "area-id",
        title: "Test",
        description: "",
        priority,
        dueDate,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        createdAt: 0,
    } as unknown as Task;
}

/** A raw stored task with no `kind` field, simulating pre-kind localStorage data. */
function legacyTask(recurrence: unknown = null): unknown {
    return {
        id: "task-id",
        areaId: "area-id",
        title: "Test",
        description: "",
        consequenceTier: 3,
        deadlineType: "flexible", isMilestone: false,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        createdAt: 0,
        recurrence,
        // deliberately omits `kind`
    };
}

/** Build a v2 AppState (separate tasks/goals/ideas arrays) for migration testing. */
function v2State(overrides: {
    tasks?: Task[];
    goals?: Goal[];
    ideas?: Idea[];
} = {}): AppState {
    return {
        ...DEFAULT_STATE,
        schemaVersion: 2,
        // Cast as any to inject old-schema fields that TypeScript no longer knows about
        ...(overrides as any),
    };
}

describe("migrateState", () => {
    test("Phase 1 critical priority → tier 1", () => {
        const state = {
            ...DEFAULT_STATE,
            schemaVersion: 1,
        } as any;
        state.tasks = [v1Task("critical")];
        const out = migrateState(state as AppState);
        const task = out.commitments.find(c => c.kind === 'task' || c.kind === 'routine') as Task;
        assert.strictEquals(task!.consequenceTier, 1);
    });

    test("Phase 1 priority mapping covers all four tiers", () => {
        const cases: Array<
            ["low" | "medium" | "high" | "critical", 1 | 2 | 3 | 4]
        > = [
            ["critical", 1],
            ["high", 2],
            ["medium", 3],
            ["low", 4],
        ];
        for (const [priority, expected] of cases) {
            const state = { ...DEFAULT_STATE, schemaVersion: 1 } as any;
            state.tasks = [v1Task(priority)];
            const out = migrateState(state as AppState);
            const task = out.commitments.find(c => c.kind === 'task' || c.kind === 'routine') as Task;
            assert.strictEquals(task!.consequenceTier, expected);
        }
    });

    test("Phase 1 dueDate → suggestedDate", () => {
        const due = Date.now() + DAY_MS;
        const state = { ...DEFAULT_STATE, schemaVersion: 1 } as any;
        state.tasks = [v1Task("medium", due)];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.suggestedDate, due);
    });

    test('legacy "dashboard" view → "daily"', () => {
        const v1 = {
            ...DEFAULT_STATE,
            view: "dashboard" as unknown as AppState["view"],
        };
        assert.strictEquals(migrateState(v1).view, "daily");
    });

    test("bumps schemaVersion forward", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 1 } as any;
        state.tasks = [];
        assert.strictEquals(migrateState(state as AppState).schemaVersion, SCHEMA_VERSION);
    });

    test("idempotent on already-current schema", () => {
        const t = makeTask({ consequenceTier: 2 });
        const v3: AppState = {
            ...DEFAULT_STATE,
            schemaVersion: SCHEMA_VERSION,
            commitments: [t],
        };
        const out = migrateState(v3);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.consequenceTier, 2);
        assert.strictEquals(out.schemaVersion, SCHEMA_VERSION);
    });

    test("v2 tasks migrate to commitments array", () => {
        const state = v2State({ tasks: [makeTask({ id: "t1" })] });
        const out = migrateState(state);
        assert.strictEquals(out.commitments.length, 1);
        assert.strictEquals(out.commitments[0]!.id, "t1");
    });

    test("v2 goals tagged with kind='goal' and no linkedTaskIds", () => {
        const state = v2State({
            goals: [makeGoal({ id: "g1" })] as any,
        });
        const out = migrateState(state);
        const goal = out.commitments.find(c => c.kind === 'goal');
        assert.strictEquals(goal?.id, "g1");
        assert.strictEquals(goal?.kind, "goal");
    });

    test("v2 ideas tagged with kind='idea'", () => {
        const state = v2State({
            ideas: [makeIdea({ id: "i1" })] as any,
        });
        const out = migrateState(state);
        const idea = out.commitments.find(c => c.kind === 'idea');
        assert.strictEquals(idea?.id, "i1");
        assert.strictEquals(idea?.kind, "idea");
    });

    test("v2 concat order: tasks first, then goals, then ideas", () => {
        const state = v2State({
            tasks: [makeTask({ id: "t1" })],
            goals: [makeGoal({ id: "g1" })] as any,
            ideas: [makeIdea({ id: "i1" })] as any,
        });
        const out = migrateState(state);
        assert.strictEquals(out.commitments[0]!.id, "t1");
        assert.strictEquals(out.commitments[1]!.id, "g1");
        assert.strictEquals(out.commitments[2]!.id, "i1");
    });

    test("v2 task linkedGoalId migrates to goalId", () => {
        const state = v2State({
            tasks: [makeTask({ id: "t1" })] as any,
        });
        // Inject old field
        (state as any).tasks[0].linkedGoalId = "g1";
        const out = migrateState(state);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task.goalId, "g1");
    });
});

describe("kind migration", () => {
    test("no recurrence + no kind → task", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 2 } as any;
        state.tasks = [legacyTask(null)];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "task");
    });

    test("recurring endMode=never + no kind → routine", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 2 } as any;
        state.tasks = [
            legacyTask({
                cadence: "weekly",
                frequencyPerPeriod: 1,
                scheduleMode: "fixed",
                endMode: "never",
            }),
        ];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "routine");
    });

    test("recurring with no endMode field + no kind → routine (default to never)", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 2 } as any;
        state.tasks = [
            legacyTask({
                cadence: "weekly",
                frequencyPerPeriod: 1,
                scheduleMode: "fixed",
            }),
        ];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "routine");
    });

    test("recurring endMode=after_count + no kind → task", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 2 } as any;
        state.tasks = [
            legacyTask({
                cadence: "weekly",
                frequencyPerPeriod: 1,
                scheduleMode: "fixed",
                endMode: "after_count",
                endAfterCount: 10,
            }),
        ];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "task");
    });

    test("recurring endMode=after_date + no kind → task", () => {
        const state = { ...DEFAULT_STATE, schemaVersion: 2 } as any;
        state.tasks = [
            legacyTask({
                cadence: "monthly",
                frequencyPerPeriod: 1,
                scheduleMode: "fixed",
                endMode: "after_date",
                endAfterDate: Date.now() + DAY_MS * 30,
            }),
        ];
        const out = migrateState(state as AppState);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "task");
    });

    test("existing kind field is preserved, not overwritten", () => {
        const state = v2State({ tasks: [makeTask({ kind: "routine", recurrence: null })] });
        const out = migrateState(state);
        const task = out.commitments[0] as Task;
        assert.strictEquals(task!.kind, "routine");
    });
});
