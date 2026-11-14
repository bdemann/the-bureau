// ─────────────────────────────────────────────────────────────────────────────
// Scoring scenario tests — settling-score simulations (GitHub #58).
//
// These run the same pure functions the app runs (share, applyCompletion,
// applyPenalty, applyRolloverMisses) over many days on a fixed task list, with
// deterministic (non-random) completion patterns, and check that the score
// settles where `200p / (p + k(1 - p))` says it should.
//
// The equilibrium sims leave out the docket-cleared bonus (it is a separate,
// once-a-day bonus; the formula does not include it). Streak depth is the
// task's consecutive-failure count (failures are spread so depth stays ~1,
// i.e. a x1.1 multiplier the closed-form formula does not include). Each
// simulated day applies its failures first, then its completions, and the
// score is read at the end of the day.
// ─────────────────────────────────────────────────────────────────────────────

import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {
    applyCompletion,
    applyDocketCleared,
    applyPenalty,
    applyRolloverMisses,
    dailyLoad,
    lossRatioFor,
    MAX_SCORE,
    MIN_SCORE,
    share,
} from './scoring.js';
import type {ConsequenceTier, Task} from './types.js';

// ── Fixed task list: 20 daily routines, T1 x3, T2 x6, T3 x11 ──────────────────

function dailyTask(id: number, tier: ConsequenceTier): Task {
    return {
        id: `t${id}`,
        areaId: null,
        title: `Task ${id}`,
        description: '',
        timeOfDay: 'anytime',
        kind: 'routine',
        consequenceTier: tier,
        deadlineType: 'flexible',
        isMilestone: false,
        suggestedDate: null,
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: {cadence: 'daily', frequencyPerPeriod: 1, scheduleMode: 'fixed'},
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
        createdAt: 0,
        dueDate: null,
        remediationCount: 0,
    } as Task;
}

const TIERS: ConsequenceTier[] = [
    ...Array<ConsequenceTier>(3).fill(1),
    ...Array<ConsequenceTier>(6).fill(2),
    ...Array<ConsequenceTier>(11).fill(3),
];
const TASKS: Task[] = TIERS.map((tier, i) => dailyTask(i, tier));
const LOAD = dailyLoad(TASKS);
const SHARES = TASKS.map((t) => share(t, LOAD));

// ── Simulation ────────────────────────────────────────────────────────────────

type FailureMix = 'miss' | 'skip' | 'mixed';

/** Blended loss ratio k for each failure mix. Mixed alternates skip and miss. */
const K: Record<FailureMix, number> = {miss: 5, skip: 2.5, mixed: 3.75};

function equilibrium(p: number, k: number): number {
    return (200 * p) / (p + k * (1 - p));
}

/**
 * Deterministic completion pattern: over any long run, a fraction `rate` of
 * events complete, spread evenly (Bresenham-style).
 */
function completes(event: number, rate: number): boolean {
    return Math.floor((event + 1) * rate + 1e-9) > Math.floor(event * rate + 1e-9);
}

function simulate(start: number, days: number, rate: number, mix: FailureMix): number {
    let score = start;
    const failStreak = TASKS.map(() => 0);
    let failures = 0;
    for (let day = 0; day < days; day++) {
        const done = TASKS.map((_, i) => completes(day + i * PHASE_STEP, rate));
        // The day's failures land first (misses at rollover, skips in the
        // morning), then its completions; the score is sampled at day's end.
        for (let i = 0; i < TASKS.length; i++) {
            if (done[i]) {
                failStreak[i] = 0;
                continue;
            }
            failStreak[i]++;
            const asSkip = mix === 'skip' || (mix === 'mixed' && failures % 2 === 0);
            failures++;
            const ratio = asSkip
                ? lossRatioFor('skip', 'mandatory')
                : lossRatioFor('miss', 'mandatory');
            score = applyPenalty(score, SHARES[i], ratio, failStreak[i]);
        }
        for (let i = 0; i < TASKS.length; i++) {
            if (done[i]) score = applyCompletion(score, SHARES[i]);
        }
    }
    return score;
}

/** Phase offset between tasks' completion patterns (a prime, so they spread out). */
const PHASE_STEP = 7;

const RATES = [0.5, 0.62, 0.75, 0.85, 0.95];
const MIXES: FailureMix[] = ['miss', 'skip', 'mixed'];
const TOLERANCE = 8;

describe('fixed task list sanity', () => {
    test('shares across one day sum to 1', () => {
        const total = SHARES.reduce((a, b) => a + b, 0);
        assert.isTrue(Math.abs(total - 1) < 1e-9);
    });
});

describe('settling: 120 days at a fixed completion rate lands near 200p / (p + k(1 - p))', () => {
    const rows: string[] = ['rate  mix    k     predicted  simulated'];
    for (const mix of MIXES) {
        for (const rate of RATES) {
            const predicted = equilibrium(rate, K[mix]);
            test(`${Math.round(rate * 100)}% completion, failures = ${mix}`, () => {
                const final = simulate(100, 120, rate, mix);
                rows.push(
                    `${String(Math.round(rate * 100)).padStart(3)}%  ${mix.padEnd(5)}  ${K[mix].toFixed(2)}  ${predicted.toFixed(1).padStart(8)}  ${final.toFixed(1).padStart(8)}`,
                );
                assert.isTrue(
                    Math.abs(final - predicted) <= TOLERANCE,
                    `${mix} @ ${rate}: simulated ${final.toFixed(1)} vs predicted ${predicted.toFixed(1)}`,
                );
            });
        }
    }
    test('(report) equilibrium table', () => {
        console.log('\n' + rows.join('\n'));
    });
});

describe('settling does not depend on the starting score', () => {
    test('from 0 and from 200 at 75% / mixed, both land in the same place', () => {
        const fromBottom = simulate(0, 240, 0.75, 'mixed');
        const fromTop = simulate(200, 240, 0.75, 'mixed');
        assert.isTrue(Math.abs(fromBottom - fromTop) <= 2);
    });
    test('score always stays within 0-200', () => {
        for (const rate of [0, 0.5, 1]) {
            for (const mix of MIXES) {
                const s = simulate(100, 60, rate, mix);
                assert.isTrue(s >= MIN_SCORE && s <= MAX_SCORE);
            }
        }
    });
});

describe('headline scenarios', () => {
    test('from 0, 14 perfect days (with the daily docket bonus) reach at least 125', () => {
        let score = 0;
        for (let day = 0; day < 14; day++) {
            for (let i = 0; i < TASKS.length; i++) {
                score = applyCompletion(score, SHARES[i]);
            }
            score = applyDocketCleared(score);
        }
        console.log(`14 perfect days from 0 -> ${score.toFixed(1)}`);
        assert.isTrue(score >= 125, `got ${score}`);
    });

    test('from 0, 14 perfect days even without the docket bonus reach at least 125', () => {
        let score = 0;
        for (let day = 0; day < 14; day++) {
            for (let i = 0; i < TASKS.length; i++) {
                score = applyCompletion(score, SHARES[i]);
            }
        }
        console.log(`14 perfect days (no docket) from 0 -> ${score.toFixed(1)}`);
        assert.isTrue(score >= 125, `got ${score}`);
    });

    test('from 130, one fully missed day (all mandatory) lands between 80 and 100', () => {
        let score = 130;
        for (let i = 0; i < TASKS.length; i++) {
            score = applyPenalty(score, SHARES[i], lossRatioFor('miss', 'mandatory'), 1);
        }
        console.log(`one fully missed day from 130 -> ${score.toFixed(1)}`);
        assert.isTrue(score >= 80 && score <= 100, `got ${score}`);
    });

    test('a 10-day absence costs no more than a 2-day absence', () => {
        const away = (days: number): number => {
            let score = 130;
            for (let i = 0; i < TASKS.length; i++) {
                score = applyRolloverMisses(score, SHARES[i], 'mandatory', days, 0);
            }
            return score;
        };
        const twoDays = away(2);
        const tenDays = away(10);
        console.log(`absence from 130: 2 days -> ${twoDays.toFixed(1)}, 10 days -> ${tenDays.toFixed(1)}`);
        assert.isTrue(130 - tenDays <= 130 - twoDays + 1e-9);
    });
});

describe('band-aware outcomes', () => {
    test('ignored radar/backlog tasks cost nothing; cleared mandatory keeps the score', () => {
        let score = 100;
        for (let i = 0; i < TASKS.length; i++) {
            score = applyRolloverMisses(score, SHARES[i], 'backlog', 1, 0);
        }
        assert.strictEquals(score, 100);
    });

    test('a suggested-band miss costs less than a mandatory-band miss', () => {
        const suggested = applyRolloverMisses(100, 0.2, 'suggested', 1, 0);
        const mandatory = applyRolloverMisses(100, 0.2, 'mandatory', 1, 0);
        assert.isAbove(suggested, mandatory);
    });

    test('completing from backlog earns 1.5x', () => {
        const normal = applyCompletion(100, 0.2) - 100;
        const early = applyCompletion(100, 0.2, true) - 100;
        assert.isTrue(Math.abs(early / normal - 1.5) < 1e-9);
    });

    test('skipping costs the same loss ratio in every band', () => {
        assert.strictEquals(lossRatioFor('skip', 'suggested'), lossRatioFor('skip', 'backlog'));
    });
});
