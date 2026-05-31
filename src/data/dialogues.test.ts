import { assert } from "@augment-vir/assert";
import { describe, test } from "node:test";
import { getDialogueFor, type DialogueTrigger } from "./dialogues.js";
import { bcrSkin } from "../skins/bcr.skin.js";

const ALL_TRIGGERS: ReadonlyArray<DialogueTrigger> = [
    "task_added",
    "task_completed",
    "task_snoozed_1",
    "task_snoozed_2_3",
    "task_snoozed_4_5",
    "task_snoozed_6plus",
    "task_skipped",
    "task_overdue",
    "area_completed",
    "score_low",
    "score_high",
    "day_start",
    "streak",
];

describe("BCR skin dialogue coverage", () => {
    test("every trigger has at least one line", () => {
        for (const trigger of ALL_TRIGGERS) {
            const lines = bcrSkin.dialogues[trigger];
            assert.isTrue(lines.length > 0, `no lines for trigger: ${trigger}`);
        }
    });

    test("task_snoozed_6plus has only director lines", () => {
        const lines = bcrSkin.dialogues["task_snoozed_6plus"];
        for (const line of lines) {
            assert.strictEquals(line.character, "director");
        }
    });

    test("day_start has only agent lines", () => {
        const lines = bcrSkin.dialogues["day_start"];
        for (const line of lines) {
            assert.strictEquals(line.character, "agent");
        }
    });
});

describe("getDialogueFor", () => {
    test("returns a line matching the requested trigger", () => {
        const line = getDialogueFor("task_completed");
        assert.strictEquals(line.trigger, "task_completed");
    });

    test("preferDirector picks director when available", () => {
        // task_completed has both characters
        for (let i = 0; i < 20; i++) {
            const line = getDialogueFor("task_completed", true);
            assert.strictEquals(line.character, "director");
        }
    });

    test("preferDirector falls back to agent when no director line exists", () => {
        // day_start has only agent lines
        const line = getDialogueFor("day_start", true);
        assert.strictEquals(line.character, "agent");
    });

    test("returns a defensive fallback for an unknown trigger", () => {
        const line = getDialogueFor("not-a-trigger" as DialogueTrigger);
        assert.isTrue(line.message.length > 0);
    });
});
