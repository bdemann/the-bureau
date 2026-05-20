// ─────────────────────────────────────────────────────────────────────────────
// Scoring — pure functions, no I/O.
//
// All per-task score changes are multiplied by a task-count scaling factor so
// that each task's impact is inversely proportional to how many tasks you have:
// with fewer tasks each one matters more; with more tasks each one matters less.
//
// Penalty ordering (worst → least severe):
//   auto-skip (missed without interaction) > skip > snooze
// ─────────────────────────────────────────────────────────────────────────────

import type {ConsequenceTier, Task} from './types.js';
import {isCurrentlyPaused} from './storage.js';

/** Baseline task count. At this count, multiplier = 1 and base values apply as-is. */
const REFERENCE_TASK_COUNT = 10;

/**
 * Count of tasks that are actionable (not completed, missed, or paused).
 * This is the N used for score scaling.
 */
export function countActiveTasks(tasks: ReadonlyArray<Task>): number {
    return Math.max(1, tasks.filter(t =>
        t.completedAt === null &&
        t.missedAt === null &&
        !isCurrentlyPaused(t),
    ).length);
}

/**
 * Multiplier applied to every score change.
 * < REFERENCE_TASK_COUNT tasks → multiplier > 1 (each task matters more).
 * > REFERENCE_TASK_COUNT tasks → multiplier < 1 (each task matters less).
 */
export function taskScaleMultiplier(activeTasks: number): number {
    return REFERENCE_TASK_COUNT / Math.max(1, activeTasks);
}

/** Score reward for completing a task. Designed so a week of perfect execution
 *  (10 tier-3 tasks/day, N=10) gains roughly 35 points: 7 × 10 × 0.5. */
export function tierCompletionReward(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 1.5;
        case 2: return 1.0;
        case 3: return 0.5;
        case 4: return 0.25;
    }
}

/** Penalty for a task that rolled over without any interaction (worst outcome). */
export function missPenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 4.5;
        case 2: return 3.0;
        case 3: return 1.5;
        case 4: return 0.75;
    }
}

/** Penalty for consciously skipping a period (worse than snooze, better than a miss). */
export function skipPenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 3.0;
        case 2: return 2.0;
        case 3: return 1.0;
        case 4: return 0.5;
    }
}

/** Per-snooze penalty base (multiplied by snooze count upstream). */
export function snoozePenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 1.5;
        case 2: return 1.0;
        case 3: return 0.5;
        case 4: return 0.25;
    }
}
