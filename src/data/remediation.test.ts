import {describe, it} from 'node:test';
import {assert} from '@augment-vir/assert';
import {
    computeRemediationOnComplete,
    computeRemediationOnSkip,
    computeRemediationOnSnooze,
    getRemediationSeverity,
} from './remediation.js';

// ─────────────────────────────────────────────────────────────────────────────
// computeRemediationOnComplete
// ─────────────────────────────────────────────────────────────────────────────

describe('computeRemediationOnComplete', () => {
    it('does nothing when no streak and not in remediation', () => {
        const result = computeRemediationOnComplete(0, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('enters remediation from a skip streak — streaks preserved', () => {
        const result = computeRemediationOnComplete(3, 0, 0);
        // skipStreak stays at 3 until remediation clears; remediationCount = min(5, 3) = 3
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 0, remediationCount: 3});
    });

    it('enters remediation from a snooze count — streaks preserved', () => {
        const result = computeRemediationOnComplete(0, 5, 0);
        // snoozeCount stays at 5 until remediation clears; remediationCount = min(5, 5) = 5
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 5, remediationCount: 5});
    });

    it('caps remediationCount at REMEDIATION_CAP (5)', () => {
        const result = computeRemediationOnComplete(2, 8, 0);
        // max(2, 8) = 8; capped at 5; snoozeCount preserved
        assert.deepEquals(result, {skipStreak: 2, snoozeCount: 8, remediationCount: 5});
    });

    it('uses the larger of skipStreak and snoozeCount as remediation target', () => {
        const result = computeRemediationOnComplete(4, 2, 0);
        assert.deepEquals(result, {skipStreak: 4, snoozeCount: 2, remediationCount: 4});
    });

    it('decrements remediationCount by 1 when already in remediation — streaks preserved', () => {
        const result = computeRemediationOnComplete(3, 0, 4);
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 0, remediationCount: 3});
    });

    it('clears streaks when last remediation completion completes', () => {
        const result = computeRemediationOnComplete(3, 0, 1);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('does not go below 0 if remediationCount is already 0', () => {
        const result = computeRemediationOnComplete(0, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('prioritises remediation path when remediationCount > 0 — streaks preserved until done', () => {
        // remediationCount > 0 takes priority; streaks preserved until newCount === 0
        const result = computeRemediationOnComplete(3, 2, 5);
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 2, remediationCount: 4});
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRemediationOnSkip
// ─────────────────────────────────────────────────────────────────────────────

describe('computeRemediationOnSkip', () => {
    it('increments skip streak normally when not in remediation', () => {
        const result = computeRemediationOnSkip(0, 0);
        assert.deepEquals(result, {skipStreak: 1, remediationCount: 0});
    });

    it('continues a skip streak normally when not in remediation', () => {
        const result = computeRemediationOnSkip(3, 0);
        assert.deepEquals(result, {skipStreak: 4, remediationCount: 0});
    });

    it('increments streak normally even when in remediation (no punitive start)', () => {
        const result = computeRemediationOnSkip(0, 4);
        assert.deepEquals(result, {skipStreak: 1, remediationCount: 0});
    });

    it('clears remediationCount on skip regardless', () => {
        const result = computeRemediationOnSkip(2, 3);
        assert.deepEquals(result, {skipStreak: 3, remediationCount: 0});
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRemediationOnSnooze
// ─────────────────────────────────────────────────────────────────────────────

describe('computeRemediationOnSnooze', () => {
    it('increments snooze count normally when not in remediation', () => {
        const result = computeRemediationOnSnooze(0, 0);
        assert.deepEquals(result, {snoozeCount: 1, remediationCount: 0});
    });

    it('continues a snooze count normally when not in remediation', () => {
        const result = computeRemediationOnSnooze(2, 0);
        assert.deepEquals(result, {snoozeCount: 3, remediationCount: 0});
    });

    it('increments count normally even when in remediation (no punitive start)', () => {
        const result = computeRemediationOnSnooze(0, 3);
        assert.deepEquals(result, {snoozeCount: 1, remediationCount: 0});
    });

    it('clears remediationCount on snooze regardless', () => {
        const result = computeRemediationOnSnooze(4, 5);
        assert.deepEquals(result, {snoozeCount: 5, remediationCount: 0});
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getRemediationSeverity
// ─────────────────────────────────────────────────────────────────────────────

describe('getRemediationSeverity', () => {
    it('returns none for 0', () => {
        assert.strictEquals(getRemediationSeverity(0), 'none');
    });

    it('returns low for 1', () => {
        assert.strictEquals(getRemediationSeverity(1), 'low');
    });

    it('returns low for 2', () => {
        assert.strictEquals(getRemediationSeverity(2), 'low');
    });

    it('returns medium for 3', () => {
        assert.strictEquals(getRemediationSeverity(3), 'medium');
    });

    it('returns medium for 4', () => {
        assert.strictEquals(getRemediationSeverity(4), 'medium');
    });

    it('returns high for 5', () => {
        assert.strictEquals(getRemediationSeverity(5), 'high');
    });

    it('returns high for large values', () => {
        assert.strictEquals(getRemediationSeverity(10), 'high');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario: full lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('remediation lifecycle scenarios', () => {
    it('full redemption arc: skip × 3, complete × 4, cleared', () => {
        let skipStreak = 0;
        let snoozeCount = 0;
        let remediationCount = 0;

        // Three skips
        for (let i = 0; i < 3; i++) {
            const r = computeRemediationOnSkip(skipStreak, remediationCount);
            skipStreak = r.skipStreak;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 3);

        // First completion — enters remediation(3), streaks preserved
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 3);    // preserved
        assert.strictEquals(remediationCount, 3);

        // Three more completions — streaks still preserved until remediationCount hits 0
        for (let i = 0; i < 2; i++) {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 1);
        assert.strictEquals(skipStreak, 3);    // still preserved

        // Final completion — fully cleared
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 0);
        assert.strictEquals(skipStreak, 0);    // cleared on final completion
    });

    it('relapse mid-remediation: skip increments normally from current streak', () => {
        // Skip × 4, one completion puts in remediation(4), skipStreak preserved at 4
        let skipStreak = 4;
        let snoozeCount = 0;
        let remediationCount = 0;

        const first = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
        skipStreak = first.skipStreak;
        snoozeCount = first.snoozeCount;
        remediationCount = first.remediationCount;
        assert.strictEquals(remediationCount, 4);
        assert.strictEquals(skipStreak, 4);    // preserved

        // Complete twice more: remediation → 2, skipStreak still 4
        for (let i = 0; i < 2; i++) {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 2);
        assert.strictEquals(skipStreak, 4);    // still preserved

        // Skip again — increments normally from current skipStreak (4 → 5)
        const relapse = computeRemediationOnSkip(skipStreak, remediationCount);
        assert.deepEquals(relapse, {skipStreak: 5, remediationCount: 0});
    });
});
