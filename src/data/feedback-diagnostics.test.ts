import { describe, it } from "node:test";
import { assert } from "@augment-vir/assert";
import { buildFeedbackDiagnostics } from "./feedback-diagnostics.js";
import { makeGoal, makeIdea, makeRecurrence, makeTask } from "./test-fixtures.js";
import type { Area, AppState } from "./types.js";

const build = { version: "1.2.3", commit: "abc1234", buildTime: "2026-11-13T00:00:00.000Z" };
const env = { skinId: "bcr", darkMode: true, userAgent: "TestAgent/1.0", standalone: false };

const secrets = [
    "Secret mortgage task",
    "private routine note",
    "Therapy Journal Area",
    "area secret description",
    "Quit my job goal",
    "goal secret detail",
    "Idea about my ex",
    "idea secret body",
];

const area: Area = {
    id: "a1",
    name: "Therapy Journal Area",
    description: "area secret description",
    colorKey: "navy",
    createdAt: 0,
};

const state: Pick<AppState, "schemaVersion" | "areas" | "commitments"> = {
    schemaVersion: 6,
    areas: [area],
    commitments: [
        makeTask({ id: "t1", title: "Secret mortgage task", description: "private routine note" }),
        makeTask({
            id: "r1",
            kind: "routine",
            title: "private routine note",
            recurrence: makeRecurrence(),
        }),
        makeTask({ id: "r2", kind: "routine", title: "Another", recurrence: makeRecurrence() }),
        makeGoal({ title: "Quit my job goal", description: "goal secret detail" }),
        makeIdea({ title: "Idea about my ex", description: "idea secret body" }),
    ],
};

describe("buildFeedbackDiagnostics", () => {
    const output = buildFeedbackDiagnostics(state, build, env);

    it("produces exactly the expected lines", () => {
        assert.strictEquals(
            output,
            [
                "App version: 1.2.3",
                "Commit: abc1234",
                "Built: 2026-11-13T00:00:00.000Z",
                "Skin: bcr",
                "Dark mode: on",
                "Schema version: 6",
                "Areas: 1",
                "Commitments (task): 1",
                "Commitments (routine): 2",
                "Commitments (goal): 1",
                "Commitments (idea): 1",
                "Display mode: browser",
                "User agent: TestAgent/1.0",
            ].join("\n"),
        );
    });

    it("never includes any title, description or note text from the state", () => {
        for (const secret of secrets) {
            assert.isFalse(output.includes(secret), `leaked: ${secret}`);
        }
    });

    it("reports standalone display mode and dark mode off", () => {
        const result = buildFeedbackDiagnostics(
            { schemaVersion: 6, areas: [], commitments: [] },
            build,
            { ...env, darkMode: false, standalone: true },
        );
        assert.isTrue(result.includes("Dark mode: off"));
        assert.isTrue(result.includes("Display mode: standalone"));
        assert.isTrue(result.includes("Areas: 0"));
    });
});
