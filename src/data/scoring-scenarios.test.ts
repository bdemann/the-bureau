// ─────────────────────────────────────────────────────────────────────────────
// Behavioral score-dynamics tests ("vibed feeling" scenarios)
//
// These tests document and enforce the intended emotional arc of the score:
//
//   • Neglect everything for a few days → rock bottom (< 40)
//   • Half-effort for a couple of weeks → rock bottom (< 40)
//   • Sustained perfection from the floor → patriot (≥ 130) within ~3 months
//
// All three scenarios are tested at three task-load levels:
//   • Few commitments  (N =  3)
//   • Medium           (N = 10, the reference scale)
//   • Many             (N = 30)
//
// The simulation uses pure scoring functions only; no DOM, no storage.
// Streak depth is held at 0 (baseline, no escalation) — real behavior
// escalates skip/snooze penalties over time, so these tests are conservative.
// ─────────────────────────────────────────────────────────────────────────────

import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {
    missPenalty,
    skipPenalty,
    snoozePenalty,
    streakDepthMultiplier,
    taskScaleMultiplier,
    tierCompletionReward,
} from './scoring.js';
import type {ConsequenceTier} from './types.js';

// ── Score landmarks ───────────────────────────────────────────────────────────

/** Below this → "rock bottom" (score bar goes red). */
const ROCK_BOTTOM = 40;

/** At or above this → "patriot" (score bar goes gold). */
const PATRIOT = 130;

/** Starting score for a new user. */
const INITIAL_SCORE = 100;

const SCORE_FLOOR   = 0;
const SCORE_CEILING = 200;

// ── Simulation helper ─────────────────────────────────────────────────────────

interface SimOptions {
    /** Starting score (0–200). */
    startScore: number;
    /** Number of days to simulate. */
    days: number;
    /** Number of active (non-paused, non-completed) tasks. */
    activeTasks: number;
    /** Consequence tier of every task (all tasks share the same tier for simplicity). */
    tier: ConsequenceTier;
    /** Tasks completed per day. */
    completionsPerDay: number;
    /** Tasks missed (auto-skip, no interaction) per day. */
    missesPerDay: number;
    /** Tasks snoozed per day (snooze count = 1, streak depth = 0). */
    snoozesPerDay?: number | undefined;
    /** Tasks consciously skipped per day (streak depth = 0). */
    skipsPerDay?: number | undefined;
}

/**
 * Simulate a constant daily behaviour pattern for `days` days and return
 * the final score, clamped to [0, 200].
 *
 * Streak depth is fixed at 0 so skip/snooze carry no escalation penalty —
 * real-world scores would decay faster when streaks accumulate.
 */
function simulateDays({
    startScore,
    days,
    activeTasks,
    tier,
    completionsPerDay,
    missesPerDay,
    snoozesPerDay = 0,
    skipsPerDay   = 0,
}: SimOptions): number {
    const M = taskScaleMultiplier(activeTasks);
    const noStreak = streakDepthMultiplier(0); // = 1.0

    const dailyDelta =
        completionsPerDay * tierCompletionReward(tier) * M
        - missesPerDay    * missPenalty(tier)          * M
        - snoozesPerDay   * snoozePenalty(tier)        * M * noStreak
        - skipsPerDay     * skipPenalty(tier)          * M * noStreak;

    let score = startScore;
    for (let day = 0; day < days; day++) {
        score = Math.max(SCORE_FLOOR, Math.min(SCORE_CEILING, score + dailyDelta));
    }
    return score;
}

// ── Daily math sanity-check ───────────────────────────────────────────────────
//
// These tests confirm the building-block math that the scenarios rely on.
// Numbers match the header comment in scoring.ts (tier 3, N=10).

describe('per-day score change math (tier 3, N=10 reference scale)', () => {
    const tier: ConsequenceTier = 3;
    const N = 10;

    test('a perfect day earns +5 pts', () => {
        const delta = N * tierCompletionReward(tier) * taskScaleMultiplier(N); // 10 × 0.5 × 1
        assert.strictEquals(delta, 5);
    });

    test('a full-miss day loses 75 pts', () => {
        const delta = N * missPenalty(tier) * taskScaleMultiplier(N); // 10 × 7.5 × 1
        assert.strictEquals(delta, 75);
    });

    test('a full-snooze day (no streak) loses 15 pts', () => {
        const delta = N * snoozePenalty(tier) * taskScaleMultiplier(N) * streakDepthMultiplier(0);
        assert.strictEquals(delta, 15);
    });

    test('a full-skip day (no streak) loses 30 pts', () => {
        const delta = N * skipPenalty(tier) * taskScaleMultiplier(N) * streakDepthMultiplier(0);
        assert.strictEquals(delta, 30);
    });

    test('half complete / half miss nets −35 pts per day', () => {
        const gain = (N / 2) * tierCompletionReward(tier) * taskScaleMultiplier(N); //  2.5
        const loss = (N / 2) * missPenalty(tier)          * taskScaleMultiplier(N); // 37.5
        assert.strictEquals(gain - loss, -35);
    });
});

// ── Scenario A: absolute neglect ──────────────────────────────────────────────

describe('scenario A: doing absolutely nothing → rock bottom within 5 days', () => {
    // Miss penalty at any task count is severe enough to cross into rock bottom
    // in a single day (at N=10: 100 − 75 = 25).  5 days is intentionally generous.

    test('few commitments (N=3) — each task matters more, still collapses fast', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 5,
            activeTasks: 3,
            tier: 3,
            completionsPerDay: 0,
            missesPerDay: 3,
        });
        // N=3: multiplier ≈ 3.33 → daily loss = 3 × 7.5 × 3.33 ≈ 75; after day 1 = 25
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });

    test('medium commitments (N=10) — reference scale', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 5,
            activeTasks: 10,
            tier: 3,
            completionsPerDay: 0,
            missesPerDay: 10,
        });
        // N=10: multiplier = 1.0 → daily loss = 75; after day 1 = 25
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });

    test('many commitments (N=30) — floor keeps individual tasks meaningful', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 5,
            activeTasks: 30,
            tier: 3,
            completionsPerDay: 0,
            missesPerDay: 30,
        });
        // N=30: multiplier = 0.5 (floor) → daily loss = 30 × 7.5 × 0.5 = 112.5; day 1 = 0
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });
});

// ── Scenario B: half-effort ───────────────────────────────────────────────────

describe('scenario B: complete 50%, miss 50% every day → rock bottom within 14 days', () => {
    // "About half your tasks" = half completions, half misses.
    // Net is always negative because missPenalty >> completionReward (×15 ratio at tier 3).
    // Two days of this sends anyone below rock bottom; 14 days is the generous cap.

    test('few commitments (N=3)', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 14,
            activeTasks: 3,
            tier: 3,
            completionsPerDay: 1.5,
            missesPerDay: 1.5,
        });
        // Net ≈ −35 pts/day → after day 2: 30 → rock bottom
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });

    test('medium commitments (N=10)', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 14,
            activeTasks: 10,
            tier: 3,
            completionsPerDay: 5,
            missesPerDay: 5,
        });
        // Net = −35 pts/day → after day 2: 30 → rock bottom
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });

    test('many commitments (N=30)', () => {
        const score = simulateDays({
            startScore: INITIAL_SCORE,
            days: 14,
            activeTasks: 30,
            tier: 3,
            completionsPerDay: 15,
            missesPerDay: 15,
        });
        // Net ≈ −52.5 pts/day → after day 2: floor at 0 → rock bottom
        assert.isBelow(score, ROCK_BOTTOM, `expected rock bottom (< ${ROCK_BOTTOM}), got ${score}`);
    });
});

// ── Scenario C: sustained perfection ─────────────────────────────────────────

describe('scenario C: perfect execution from the floor → patriot within 90 days', () => {
    // Starting at score 0 (worst possible), doing everything every day.
    // At tier 3, N=10: +5 pts/day → patriot (130) in 26 days → well within 90.
    // At N=3 the multiplier is higher, but total daily gain is the same (≈5 pts).
    // At N=30 the 0.5 floor means total daily gain is 7.5 pts → even faster.

    test('few commitments (N=3) — fewer tasks, bigger per-task weight', () => {
        const score = simulateDays({
            startScore: 0,
            days: 90,
            activeTasks: 3,
            tier: 3,
            completionsPerDay: 3,
            missesPerDay: 0,
        });
        // 3 × 0.5 × (10/3) = 5 pts/day → patriot after 26 days; after 90: capped at 200
        assert.isAtLeast(score, PATRIOT, `expected patriot (≥ ${PATRIOT}), got ${score}`);
    });

    test('medium commitments (N=10) — reference scale', () => {
        const score = simulateDays({
            startScore: 0,
            days: 90,
            activeTasks: 10,
            tier: 3,
            completionsPerDay: 10,
            missesPerDay: 0,
        });
        // 10 × 0.5 × 1.0 = 5 pts/day → patriot after 26 days; after 90: capped at 200
        assert.isAtLeast(score, PATRIOT, `expected patriot (≥ ${PATRIOT}), got ${score}`);
    });

    test('many commitments (N=30) — floor means more tasks still earn more total', () => {
        const score = simulateDays({
            startScore: 0,
            days: 90,
            activeTasks: 30,
            tier: 3,
            completionsPerDay: 30,
            missesPerDay: 0,
        });
        // 30 × 0.5 × 0.5 = 7.5 pts/day → patriot after 18 days; after 90: capped at 200
        assert.isAtLeast(score, PATRIOT, `expected patriot (≥ ${PATRIOT}), got ${score}`);
    });
});

// ── Bonus: snooze vs. miss comparison ────────────────────────────────────────

describe('conscious action (snooze) is always less damaging than neglect (miss)', () => {
    // After 5 days: full-snooze leaves 25 pts (100 − 5×15), full-miss floors at 0.
    // Both eventually hit 0, so compare within the window where the gap is visible.

    test('5 days of snoozeing all tasks (N=10, no streak) ends higher than 5 days of missing', () => {
        const snoozeScore = simulateDays({
            startScore: INITIAL_SCORE,
            days: 5,
            activeTasks: 10,
            tier: 3,
            completionsPerDay: 0,
            missesPerDay: 0,
            snoozesPerDay: 10,
        });
        const missScore = simulateDays({
            startScore: INITIAL_SCORE,
            days: 5,
            activeTasks: 10,
            tier: 3,
            completionsPerDay: 0,
            missesPerDay: 10,
        });
        // snooze: 100 − 5×15 = 25; miss: day 1 = 25, floors at 0 → 0
        assert.isAbove(snoozeScore, missScore);
    });
});
