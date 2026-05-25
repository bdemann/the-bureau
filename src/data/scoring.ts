// ─────────────────────────────────────────────────────────────────────────────
// Scoring — pure functions, no I/O.
//
// All per-task score changes are multiplied by a task-count scaling factor so
// that each task's impact is inversely proportional to how many tasks you have:
// with fewer tasks each one matters more; with more tasks each one matters less.
//
// Penalty ordering (worst → least severe):
//   auto-skip (missed without interaction) > skip > snooze > completing
//
// Design targets (tier 3, N=10 reference tasks):
//   Perfect day:      +5  pts   (10 × 0.5)
//   All-snooze day:  −15  pts   (10 × 1.5)
//   All-skip day:    −30  pts   (10 × 3.0)
//   Day of nothing:  −75  pts   (10 × 7.5)
//
// Asymmetry is intentional: one bad day requires ~15 perfect days to recover.
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
 *
 * Floored at 0.5 so that individual actions remain meaningfully impactful
 * even when the task list is large. The "total daily impact is constant"
 * design goal holds up to 2× reference count (20 tasks); beyond that the
 * daily total grows proportionally, but each task never drops below half
 * the baseline weight.
 */
export function taskScaleMultiplier(activeTasks: number): number {
    return Math.max(0.5, REFERENCE_TASK_COUNT / Math.max(1, activeTasks));
}

/** Score reward for completing a task. Designed so a week of perfect execution
 *  (10 tier-3 tasks/day, N=10) gains roughly 35 points: 7 × 10 × 0.5.
 *
 *  Tier 4 (Aspirational) returns 0 — it is tracked for self-awareness, not
 *  gamification. There is no score consequence in either direction. */
export function tierCompletionReward(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 1.5;
        case 2: return 1.0;
        case 3: return 0.5;
        case 4: return 0;    // Aspirational: consequence-free
    }
}

/** Penalty for a task that rolled over without any interaction (worst outcome).
 *  Tier 4 returns 0 — aspirational tasks have no score consequences. */
export function missPenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 22.5;
        case 2: return 15.0;
        case 3: return 7.5;
        case 4: return 0;    // Aspirational: consequence-free
    }
}

/** Penalty for consciously skipping a period (worse than snooze, better than a miss).
 *  Tier 4 returns 0 — aspirational tasks have no score consequences. */
export function skipPenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 9.0;
        case 2: return 6.0;
        case 3: return 3.0;
        case 4: return 0;    // Aspirational: consequence-free
    }
}

/** Per-snooze penalty base (multiplied by snooze count upstream).
 *  Tier 4 returns 0 — aspirational tasks have no score consequences. */
export function snoozePenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 4.5;
        case 2: return 3.0;
        case 3: return 1.5;
        case 4: return 0;    // Aspirational: consequence-free
    }
}

/**
 * Escalating multiplier applied to skip and snooze penalties based on the
 * current streak depth (the count AFTER the action is taken).
 *
 * Starts at ×1.25 on the first offence and rises by 0.25 every level,
 * capping at ×3.0 at depth 8+.  Streaks that start from a remediation
 * level already arrive at a higher depth, so they immediately pay more.
 *
 * depth 0 → ×1.0 (no streak)
 * depth 1 → ×1.25
 * depth 2 → ×1.5
 * depth 4 → ×2.0
 * depth 8+ → ×3.0 (cap)
 */
export function streakDepthMultiplier(streakDepth: number): number {
    if (streakDepth <= 0) return 1;
    return 1 + 0.25 * Math.min(streakDepth, 8);
}
