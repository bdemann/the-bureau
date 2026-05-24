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

    it('enters remediation from a skip streak', () => {
        const result = computeRemediationOnComplete(3, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 3});
    });

    it('enters remediation from a snooze count', () => {
        const result = computeRemediationOnComplete(0, 5, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 5});
    });

    it('uses the larger of skipStreak and snoozeCount as the remediation target', () => {
        const result = computeRemediationOnComplete(2, 6, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 6});
    });

    it('decrements remediationCount by 1 when already in remediation', () => {
        const result = computeRemediationOnComplete(0, 0, 4);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 3});
    });

    it('clears remediationCount to 0 when last completion needed', () => {
        const result = computeRemediationOnComplete(0, 0, 1);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('does not go below 0 if remediationCount is already 0', () => {
        const result = computeRemediationOnComplete(0, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('prioritises remediation path over streak path when both present (shouldn\'t happen in practice but is safe)', () => {
        // remediationCount > 0 takes priority regardless of streaks
        const result = computeRemediationOnComplete(3, 2, 5);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 4});
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

    it('starts skip streak at remediationCount when in remediation', () => {
        const result = computeRemediationOnSkip(0, 4);
        assert.deepEquals(result, {skipStreak: 4, remediationCount: 0});
    });

    it('clears remediationCount after using it as skip start', () => {
        const result = computeRemediationOnSkip(0, 2);
        assert.deepEquals(result, {skipStreak: 2, remediationCount: 0});
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

    it('starts snooze count at remediationCount when in remediation', () => {
        const result = computeRemediationOnSnooze(0, 3);
        assert.deepEquals(result, {snoozeCount: 3, remediationCount: 0});
    });

    it('clears remediationCount after using it as snooze start', () => {
        const result = computeRemediationOnSnooze(0, 5);
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
    it('full redemption arc: skip × 3, complete × 3, cleared', () => {
        // Start: 3 skips
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
        assert.strictEquals(remediationCount, 0);

        // First completion — enters remediation(3)
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 0);
        assert.strictEquals(remediationCount, 3);

        // Second completion — remediation(2)
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 2);

        // Third completion — remediation(1)
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 1);

        // Fourth completion — fully cleared
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 0);
    });

    it('relapse mid-remediation: skip restarts at remediation level', () => {
        // Skip × 4, one completion puts in remediation(4)
        let skipStreak = 4;
        let snoozeCount = 0;
        let remediationCount = 0;

        const first = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
        skipStreak = first.skipStreak;
        snoozeCount = first.snoozeCount;
        remediationCount = first.remediationCount;
        assert.strictEquals(remediationCount, 4);

        // Complete twice more: remediation → 2
        for (let i = 0; i < 2; i++) {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 2);

        // Skip again — should restart at 2, not 1
        const relapse = computeRemediationOnSkip(skipStreak, remediationCount);
        assert.deepEquals(relapse, {skipStreak: 2, remediationCount: 0});
    });
});
