// ─────────────────────────────────────────────────────────────────────────────
// Scoring — the "settling score" model (GitHub #58). Pure functions, no I/O.
// See docs/scoring-redesign.md for the full spec and rationale.
//
// The score S lives in [MIN_SCORE, MAX_SCORE]. Gains pull toward the top
// (S += DAILY_RATE * share * (200 - S)), losses pull toward the bottom
// (S -= DAILY_RATE * share * lossRatio * streakMultiplier * S), so the score
// converges to a level set by the completion rate rather than drifting to a
// wall. With completion rate p and blended loss ratio k it settles near
//   200p / (p + k(1 - p)).
//
// Every scored event is weighted by `share`: the commitment's slice of a
// normal day's load, so a full day always sums to about one day no matter how
// long the task list is.
// ─────────────────────────────────────────────────────────────────────────────

import type {ConsequenceTier, RecurrenceConfig, Task} from './types.js';
import {isCurrentlyPaused} from './storage.js';

/** Lowest possible score. */
export const MIN_SCORE = 0;

/** Highest possible score. */
export const MAX_SCORE = 200;

/** A perfect day closes this fraction of the gap to MAX_SCORE. */
export const DAILY_RATE = 0.07;

/** Docket-cleared bonus, as a fraction of a perfect day's gap-closing. */
export const DOCKET_CLEARED_FRACTION = 0.2;

/** Gain multiplier for completing from the radar or backlog band. */
export const EARLY_COMPLETION_BONUS = 1.5;

/** Milestone progress is worth this fraction of a completion. */
export const MILESTONE_PROGRESS_FRACTION = 0.25;

/** Each level of skip/snooze streak depth adds this to the penalty multiplier. */
export const STREAK_MULTIPLIER_STEP = 0.1;

/** Streak depth beyond this adds nothing more (multiplier tops out at 1.5). */
export const STREAK_MULTIPLIER_MAX_DEPTH = 5;

/** At startup rollover, at most this many missed periods are charged per task. */
export const MAX_MISSED_PERIODS_CHARGED = 2;

/** How much of a normal day each tier's events weigh. T4 is consequence-free. */
export const TIER_WEIGHTS: Readonly<Record<ConsequenceTier, number>> = {
    1: 3,
    2: 2,
    3: 1,
    4: 0,
};

/** Loss ratios per action and band (multiplied into the penalty). */
export const LOSS_RATIO_MISS_MANDATORY = 5;
export const LOSS_RATIO_MISS_SUGGESTED = 2.5;
export const LOSS_RATIO_SKIP = 2.5;
export const LOSS_RATIO_SNOOZE_MANDATORY = 1;
export const LOSS_RATIO_SNOOZE_SUGGESTED = 0.5;

/** Days per period used to turn a cadence into occurrences per day. */
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_QUARTER = 91;
export const DAYS_PER_YEAR = 365;

/** Default consecutive skips before a T2 daily/daily-like task escalates to mandatory. */
export const SKIP_ESCALATION_THRESHOLD = 5;

/** Maximum remediation count after a completion resets it from a streak. */
export const REMEDIATION_CAP = 5;

// ── Share ───────────────────────────────────────────────────────────────────

/** Weight of one event of this tier (T4 = 0). */
export function tierWeight(tier: ConsequenceTier): number {
    return TIER_WEIGHTS[tier] ?? 0;
}

type CadenceInput = Pick<RecurrenceConfig, 'cadence' | 'frequencyPerPeriod'> &
    Partial<Pick<RecurrenceConfig, 'hardDaysOfWeek' | 'hardDaysOfMonth' | 'skipDays'>>;

function occurrencesPerDayOf(cfg: CadenceInput): number {
    const freq = Math.max(0, cfg.frequencyPerPeriod || 0);
    switch (cfg.cadence) {
        case 'daily':
        case 'multiple_per_day': {
            const skipped = new Set(cfg.skipDays ?? []).size;
            const scheduledDays = Math.max(0, DAYS_PER_WEEK - skipped);
            return (freq * scheduledDays) / DAYS_PER_WEEK;
        }
        case 'weekly': {
            const days = cfg.hardDaysOfWeek?.length ?? 0;
            return (days > 1 ? days : freq) / DAYS_PER_WEEK;
        }
        case 'monthly':
        case 'quarterly': {
            const doms = cfg.hardDaysOfMonth?.length ?? 0;
            const perPeriod = doms > 1 ? doms : freq;
            return perPeriod / (cfg.cadence === 'monthly' ? DAYS_PER_MONTH : DAYS_PER_QUARTER);
        }
        case 'annually':
            return freq / DAYS_PER_YEAR;
    }
}

/**
 * How often the commitment comes due, per day. One-time tasks are 0. A
 * milestone with no recurrence but a progress cadence comes due at the
 * progress cadence's rate.
 */
export function occurrencesPerDay(
    task: Pick<Task, 'recurrence' | 'isMilestone' | 'progressCadence'>,
): number {
    if (task.recurrence) return occurrencesPerDayOf(task.recurrence);
    if (task.isMilestone && task.progressCadence) {
        return occurrencesPerDayOf(task.progressCadence);
    }
    return 0;
}

/** Whether the task counts toward today's load: not finished, missed or paused. */
export function isActiveForScoring(task: Task): boolean {
    return task.completedAt === null && task.missedAt === null && !isCurrentlyPaused(task);
}

/** Sum of `tierWeight x occurrencesPerDay` over active, unpaused tasks. */
export function dailyLoad(tasks: ReadonlyArray<Task>): number {
    let load = 0;
    for (const t of tasks) {
        if (!isActiveForScoring(t)) continue;
        load += tierWeight(t.consequenceTier) * occurrencesPerDay(t);
    }
    return load;
}

/**
 * This task's share of a normal day, in [0, 1]:
 * `tierWeight / max(dailyLoad, tierWeight)`. A single event can never count
 * for more than a whole day. T4 is 0.
 */
export function share(task: Pick<Task, 'consequenceTier'>, load: number): number {
    const weight = tierWeight(task.consequenceTier);
    if (weight === 0) return 0;
    return weight / Math.max(load, weight);
}

// ── Score changes ───────────────────────────────────────────────────────────

function clampScore(score: number): number {
    return Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
}

/** Gain from completing. `early` = completed from radar/backlog (1.5x). */
export function applyCompletion(score: number, taskShare: number, early = false): number {
    const bonus = early ? EARLY_COMPLETION_BONUS : 1;
    return clampScore(score + DAILY_RATE * taskShare * (MAX_SCORE - score) * bonus);
}

/** Gain from logging milestone progress: a quarter of a completion. */
export function applyMilestoneProgress(score: number, taskShare: number): number {
    return clampScore(
        score + DAILY_RATE * taskShare * MILESTONE_PROGRESS_FRACTION * (MAX_SCORE - score),
    );
}

/** Gain from clearing the mandatory docket (callers allow it once a day). */
export function applyDocketCleared(score: number): number {
    return clampScore(score + DAILY_RATE * DOCKET_CLEARED_FRACTION * (MAX_SCORE - score));
}

/** 1 + 0.1 x min(depth, 5): x1.0 with no streak, x1.5 at depth 5+. */
export function streakMultiplier(depth: number): number {
    return 1 + STREAK_MULTIPLIER_STEP * Math.min(Math.max(depth, 0), STREAK_MULTIPLIER_MAX_DEPTH);
}

/** Loss from a miss, skip or snooze. */
export function applyPenalty(
    score: number,
    taskShare: number,
    lossRatio: number,
    streakDepth = 0,
): number {
    return clampScore(
        score - DAILY_RATE * taskShare * lossRatio * streakMultiplier(streakDepth) * score,
    );
}

export type PenaltyAction = 'miss' | 'skip' | 'snooze';

/** The band a penalty was incurred in ('hidden' carries no band-based loss). */
export type PenaltyBand = 'mandatory' | 'suggested' | 'radar' | 'backlog' | 'hidden';

/** Loss ratio for an action in a band (0 for radar/backlog misses and snoozes). */
export function lossRatioFor(action: PenaltyAction, band: PenaltyBand): number {
    switch (action) {
        case 'skip':
            return LOSS_RATIO_SKIP;
        case 'miss':
            if (band === 'mandatory') return LOSS_RATIO_MISS_MANDATORY;
            if (band === 'suggested') return LOSS_RATIO_MISS_SUGGESTED;
            return 0;
        case 'snooze':
            if (band === 'mandatory') return LOSS_RATIO_SNOOZE_MANDATORY;
            if (band === 'suggested') return LOSS_RATIO_SNOOZE_SUGGESTED;
            return 0;
    }
}

/** Absence cap: how many of the elapsed missed periods are charged for one task. */
export function capMissedPeriods(elapsedMissed: number): number {
    return Math.min(Math.max(0, Math.floor(elapsedMissed)), MAX_MISSED_PERIODS_CHARGED);
}

/**
 * Charge a task's missed periods against the running score, one at a time
 * (each depends on the score before it). The count is capped and the streak
 * depth rises by one per charged period.
 */
export function applyRolloverMisses(
    score: number,
    taskShare: number,
    band: PenaltyBand,
    elapsedMissed: number,
    startingStreak: number,
): number {
    const ratio = lossRatioFor('miss', band);
    let next = score;
    const count = capMissedPeriods(elapsedMissed);
    for (let i = 1; i <= count; i++) {
        next = applyPenalty(next, taskShare, ratio, startingStreak + i);
    }
    return next;
}
