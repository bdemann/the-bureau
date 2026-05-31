import type { Character } from "./types.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// Dialogue system — trigger keys and lookup helper.
//
// Trigger keys are skin-agnostic; they live here.
// The actual voice lines live in each skin's `dialogues` map.
// ─────────────────────────────────────────────────────────────────────────────

export type DialogueTrigger =
    | "task_added"
    | "task_completed"
    | "task_snoozed_1"
    | "task_snoozed_2_3"
    | "task_snoozed_4_5"
    | "task_snoozed_6plus"
    | "task_skipped"
    | "task_overdue"
    | "area_completed"
    | "score_low"
    | "score_high"
    | "day_start"
    | "streak";

/** A resolved dialogue line with its trigger filled in (as returned by getDialogueFor). */
export interface DialogueLine {
    character: Character;
    trigger: DialogueTrigger;
    message: string;
}

/**
 * Pick one line from the active skin's pool for the given trigger.
 * When preferDirector is true, director lines are preferred; falls back to
 * agent lines if no director line exists.
 */
export function getDialogueFor(
    trigger: DialogueTrigger,
    preferDirector = false,
): DialogueLine {
    const map = getActiveSkin().dialogues;
    const pool = map[trigger] ?? [];
    if (!pool.length) {
        return { character: "agent", trigger, message: "Status noted." };
    }
    const preferred = pool.filter(
        (d) => d.character === (preferDirector ? "director" : "agent"),
    );
    const candidates = preferred.length ? preferred : pool;
    const entry = candidates[Math.floor(Math.random() * candidates.length)]!;
    return { ...entry, trigger };
}
