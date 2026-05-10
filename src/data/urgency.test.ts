import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {getDailyBand, getSnoozeBand, maxBand} from './urgency.js';
import {date, makeRecurrence, makeTask} from './test-fixtures.js';

const DAY_MS = 86_400_000;

describe('getDailyBand — Step 0 (visibility)', () => {
    test('completed one-time task is hidden', () => {
        const t = makeTask({completedAt: Date.now()});
        assert.strictEquals(getDailyBand(t, date('2026-05-09')), 'hidden');
    });

    test('multi-per-period task at completion target is hidden', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'multiple_per_week', frequencyPerPeriod: 3}),
            completionsThisPeriod: 3,
        });
        assert.strictEquals(getDailyBand(t, date('2026-05-09')), 'hidden');
    });

    test('currently-snoozed task is hidden', () => {
        const t = makeTask({snoozedUntil: Date.now() + DAY_MS});
        assert.strictEquals(getDailyBand(t, date('2026-05-09')), 'hidden');
    });

    test('recurring task whose currentPeriodStart is in the future is hidden', () => {
        // advanceRecurrence sets completedAt=null and currentPeriodStart to next period.
        // The task should be hidden even though completedAt is null.
        const today = date('2026-05-09');
        const tomorrow = date('2026-05-10');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily'}),
            completedAt: null,
            currentPeriodStart: tomorrow.getTime(),
        });
        assert.strictEquals(getDailyBand(t, today), 'hidden');
    });
});

describe('getDailyBand — Step 1 (mandatory)', () => {
    test('daily cadence is always mandatory', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'daily'})});
        assert.strictEquals(getDailyBand(t, date('2026-05-09')), 'mandatory');
    });

    test('hard-date task due today is mandatory', () => {
        const today = date('2026-05-09');
        const t = makeTask({windowType: 'hard', suggestedDate: today.getTime()});
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });

    test('hard-date task overdue is mandatory', () => {
        const today = date('2026-05-09');
        const t = makeTask({windowType: 'hard', suggestedDate: today.getTime() - 3 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });

    test('flexible window with deadline today is mandatory', () => {
        const today = date('2026-05-09');
        const t = makeTask({windowType: 'flexible', windowDeadline: today.getTime()});
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });
});

describe('getDailyBand — Step 2 (hard-date timing)', () => {
    const today = date('2026-05-09');

    test('1 day out → radar', () => {
        const t = makeTask({windowType: 'hard', suggestedDate: today.getTime() + 1 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'radar');
    });

    test('3 days out → radar', () => {
        const t = makeTask({windowType: 'hard', suggestedDate: today.getTime() + 3 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'radar');
    });

    test('4 days out → backlog', () => {
        const t = makeTask({windowType: 'hard', suggestedDate: today.getTime() + 4 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'backlog');
    });
});

describe('getDailyBand — Step 2 (flexible window)', () => {
    const today = date('2026-05-09');

    test('past suggested date but inside window → suggested', () => {
        const t = makeTask({
            windowType: 'flexible',
            suggestedDate: today.getTime() - 2 * DAY_MS,
            windowDeadline: today.getTime() + 5 * DAY_MS,
            windowLengthDays: 7,
        });
        assert.strictEquals(getDailyBand(t, today), 'suggested');
    });

    test('window 25% remaining → radar (any tier)', () => {
        const t = makeTask({
            windowType: 'flexible',
            consequenceTier: 4,
            suggestedDate: today.getTime() + 5 * DAY_MS,
            windowDeadline: today.getTime() + 2 * DAY_MS, // 2/10 = 20%
            windowLengthDays: 10,
        });
        assert.strictEquals(getDailyBand(t, today), 'radar');
    });

    test('window 50% remaining + tier 1/2 → radar', () => {
        const t = makeTask({
            windowType: 'flexible',
            consequenceTier: 2,
            suggestedDate: today.getTime() + 7 * DAY_MS,
            windowDeadline: today.getTime() + 5 * DAY_MS, // 5/10 = 50%
            windowLengthDays: 10,
        });
        assert.strictEquals(getDailyBand(t, today), 'radar');
    });

    test('window 50% remaining + tier 3 → backlog', () => {
        const t = makeTask({
            windowType: 'flexible',
            consequenceTier: 3,
            suggestedDate: today.getTime() + 7 * DAY_MS,
            windowDeadline: today.getTime() + 5 * DAY_MS,
            windowLengthDays: 10,
        });
        assert.strictEquals(getDailyBand(t, today), 'backlog');
    });
});

describe('getDailyBand — Step 2 (multiple-per-period ratio)', () => {
    const today = date('2026-05-09');

    test('high ratio (urgent) → mandatory', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'multiple_per_week', frequencyPerPeriod: 5}),
            completionsThisPeriod: 0,
            windowDeadline: today.getTime() + 2 * DAY_MS, // need 5 in 2 days = 2.5 ratio
        });
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });

    test('moderate ratio → suggested', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'multiple_per_week', frequencyPerPeriod: 3}),
            completionsThisPeriod: 0,
            windowDeadline: today.getTime() + 3 * DAY_MS, // 3/3 = 1.0 ratio
        });
        assert.strictEquals(getDailyBand(t, today), 'suggested');
    });

    test('low ratio → backlog', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'multiple_per_week', frequencyPerPeriod: 2}),
            completionsThisPeriod: 0,
            windowDeadline: today.getTime() + 7 * DAY_MS, // 2/7 = ~0.28
        });
        assert.strictEquals(getDailyBand(t, today), 'backlog');
    });
});

describe('getDailyBand — Step 2 (milestone)', () => {
    const today = date('2026-05-09');

    test('no deadline → backlog', () => {
        const t = makeTask({windowType: 'milestone', windowDeadline: null});
        assert.strictEquals(getDailyBand(t, today), 'backlog');
    });

    test('deadline >30 days away → backlog', () => {
        const t = makeTask({windowType: 'milestone', windowDeadline: today.getTime() + 60 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'backlog');
    });

    test('deadline ≤30 days away → radar', () => {
        const t = makeTask({windowType: 'milestone', windowDeadline: today.getTime() + 20 * DAY_MS});
        assert.strictEquals(getDailyBand(t, today), 'radar');
    });

    test('deadline today → mandatory', () => {
        const t = makeTask({windowType: 'milestone', windowDeadline: today.getTime()});
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });

    test('completed milestone is hidden', () => {
        const t = makeTask({windowType: 'milestone', completedAt: Date.now()});
        assert.strictEquals(getDailyBand(t, today), 'hidden');
    });
});

describe('getSnoozeBand', () => {
    test('zero snoozes is always backlog', () => {
        for (const tier of [1, 2, 3, 4] as const) {
            assert.strictEquals(getSnoozeBand(tier, 0), 'backlog');
        }
    });

    test('tier 1 escalates fastest', () => {
        assert.strictEquals(getSnoozeBand(1, 1), 'radar');
        assert.strictEquals(getSnoozeBand(1, 3), 'suggested');
        assert.strictEquals(getSnoozeBand(1, 5), 'mandatory');
    });

    test('tier 4 never escalates from snooze alone', () => {
        for (const n of [1, 5, 10, 100]) {
            assert.strictEquals(getSnoozeBand(4, n), 'backlog');
        }
    });

    test('tier 3 caps at suggested', () => {
        assert.strictEquals(getSnoozeBand(3, 5), 'radar');
        assert.strictEquals(getSnoozeBand(3, 15), 'suggested');
        assert.strictEquals(getSnoozeBand(3, 100), 'suggested');
    });
});

describe('maxBand (final = max(timing, snooze))', () => {
    test('returns the more urgent band', () => {
        assert.strictEquals(maxBand('backlog', 'radar'), 'radar');
        assert.strictEquals(maxBand('suggested', 'radar'), 'suggested');
        assert.strictEquals(maxBand('mandatory', 'backlog'), 'mandatory');
    });

    test('snooze can lift a backlog task to mandatory', () => {
        const today = date('2026-05-09');
        const t = makeTask({
            consequenceTier: 1,
            windowType: 'hard',
            suggestedDate: today.getTime() + 30 * DAY_MS, // very far out
            snoozeCount: 5,
        });
        // timing alone = backlog; tier 1 + snooze 5 = mandatory; final = mandatory
        assert.strictEquals(getDailyBand(t, today), 'mandatory');
    });
});
