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

    it('skip streak below 5 clears cleanly without remediation (grace period)', () => {
        const result = computeRemediationOnComplete(3, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('skip streak at threshold (5) enters remediation — skipStreak preserved', () => {
        const result = computeRemediationOnComplete(5, 0, 0);
        assert.deepEquals(result, {skipStreak: 5, snoozeCount: 0, remediationCount: 5});
    });

    it('skip streak above threshold enters remediation — capped at REMEDIATION_CAP', () => {
        const result = computeRemediationOnComplete(8, 0, 0);
        assert.deepEquals(result, {skipStreak: 8, snoozeCount: 0, remediationCount: 5});
    });

    it('snooze count alone does not trigger remediation', () => {
        const result = computeRemediationOnComplete(0, 8, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('snooze count does not affect remediation target — only skipStreak counts', () => {
        const result = computeRemediationOnComplete(5, 8, 0);
        assert.deepEquals(result, {skipStreak: 5, snoozeCount: 0, remediationCount: 5});
    });

    it('decrements remediationCount by 1 when already in remediation — skipStreak preserved', () => {
        const result = computeRemediationOnComplete(3, 0, 4);
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 0, remediationCount: 3});
    });

    it('clears skipStreak when last remediation completion completes', () => {
        const result = computeRemediationOnComplete(3, 0, 1);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('snoozeCount always resets on completion even while in remediation', () => {
        const result = computeRemediationOnComplete(3, 6, 4);
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 0, remediationCount: 3});
    });

    it('does not go below 0 if remediationCount is already 0', () => {
        const result = computeRemediationOnComplete(0, 0, 0);
        assert.deepEquals(result, {skipStreak: 0, snoozeCount: 0, remediationCount: 0});
    });

    it('prioritises remediation path when remediationCount > 0 — streaks preserved until done', () => {
        const result = computeRemediationOnComplete(3, 2, 5);
        assert.deepEquals(result, {skipStreak: 3, snoozeCount: 0, remediationCount: 4});
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
    it('increments snooze count from zero', () => {
        const result = computeRemediationOnSnooze(0);
        assert.deepEquals(result, {snoozeCount: 1});
    });

    it('continues incrementing snooze count', () => {
        const result = computeRemediationOnSnooze(2);
        assert.deepEquals(result, {snoozeCount: 3});
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
    it('skip × 3 clears cleanly on completion — no remediation (grace period)', () => {
        let skipStreak = 0;
        let snoozeCount = 0;
        let remediationCount = 0;

        for (let i = 0; i < 3; i++) {
            const r = computeRemediationOnSkip(skipStreak, remediationCount);
            skipStreak = r.skipStreak;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 3);

        const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
        assert.strictEquals(r.skipStreak, 0);
        assert.strictEquals(r.remediationCount, 0);
    });

    it('full redemption arc: skip × 5, complete × 6, cleared', () => {
        let skipStreak = 0;
        let snoozeCount = 0;
        let remediationCount = 0;

        for (let i = 0; i < 5; i++) {
            const r = computeRemediationOnSkip(skipStreak, remediationCount);
            skipStreak = r.skipStreak;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 5);

        // First completion — enters remediation(5), skipStreak preserved
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(skipStreak, 5);
        assert.strictEquals(remediationCount, 5);

        // Four more completions — skipStreak still preserved until remediationCount hits 0
        for (let i = 0; i < 4; i++) {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 1);
        assert.strictEquals(skipStreak, 5);

        // Final completion — fully cleared
        {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 0);
        assert.strictEquals(skipStreak, 0);
    });

    it('relapse mid-remediation: skip increments normally from current streak', () => {
        let skipStreak = 5;
        let snoozeCount = 0;
        let remediationCount = 0;

        const first = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
        skipStreak = first.skipStreak;
        snoozeCount = first.snoozeCount;
        remediationCount = first.remediationCount;
        assert.strictEquals(remediationCount, 5);
        assert.strictEquals(skipStreak, 5);

        for (let i = 0; i < 2; i++) {
            const r = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
            skipStreak = r.skipStreak;
            snoozeCount = r.snoozeCount;
            remediationCount = r.remediationCount;
        }
        assert.strictEquals(remediationCount, 3);
        assert.strictEquals(skipStreak, 5);

        const relapse = computeRemediationOnSkip(skipStreak, remediationCount);
        assert.deepEquals(relapse, {skipStreak: 6, remediationCount: 0});
    });

    it('snoozed tasks do not interact with remediation progress', () => {
        let skipStreak = 5;
        let snoozeCount = 0;
        let remediationCount = 0;

        const entry = computeRemediationOnComplete(skipStreak, snoozeCount, remediationCount);
        skipStreak = entry.skipStreak;
        remediationCount = entry.remediationCount;
        assert.strictEquals(remediationCount, 5);

        // Snooze several times — remediationCount is unaffected
        for (let i = 0; i < 3; i++) {
            const r = computeRemediationOnSnooze(snoozeCount);
            snoozeCount = r.snoozeCount;
        }
        assert.strictEquals(snoozeCount, 3);
        assert.strictEquals(remediationCount, 5);
    });
});
