import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {
    advanceRecurrence,
    getCurrentPeriod,
    initialiseRecurrence,
    nextOccurrenceOfWeekday,
    nthWeekdayOfMonth,
    rolloverIfNeeded,
} from './recurrence.js';
import {date, makeRecurrence, makeTask} from './test-fixtures.js';

describe('getCurrentPeriod', () => {
    test('weekly period spans Sunday → Saturday', () => {
        const wed = date('2026-05-13'); // Wednesday
        const p = getCurrentPeriod('weekly', wed);
        assert.strictEquals(new Date(p.start).getDay(), 0); // Sunday
        assert.strictEquals(new Date(p.end).getDay(), 6);   // Saturday
        assert.strictEquals(p.lengthDays, 7);
    });

    test('monthly period spans 1st → last day of month', () => {
        const p = getCurrentPeriod('monthly', date('2026-02-15'));
        assert.strictEquals(new Date(p.start).getDate(), 1);
        assert.strictEquals(new Date(p.end).getDate(), 28); // 2026 is not leap
        assert.strictEquals(p.lengthDays, 28);
    });

    test('quarterly period rolls correctly across quarters', () => {
        const p = getCurrentPeriod('quarterly', date('2026-05-15'));
        assert.strictEquals(new Date(p.start).getMonth(), 3); // Apr
        assert.strictEquals(new Date(p.end).getMonth(), 5);   // Jun
    });

    test('yearly period spans Jan 1 → Dec 31', () => {
        const p = getCurrentPeriod('yearly', date('2026-07-04'));
        assert.strictEquals(new Date(p.start).getMonth(), 0);
        assert.strictEquals(new Date(p.end).getMonth(), 11);
        assert.strictEquals(new Date(p.end).getDate(), 31);
    });
});

describe('nextOccurrenceOfWeekday', () => {
    test('returns same day when dow already matches', () => {
        const sat = date('2026-05-09'); // Saturday (dow=6)
        const r = nextOccurrenceOfWeekday(sat, 6);
        assert.strictEquals(r.toDateString(), sat.toDateString());
    });

    test('finds next future day', () => {
        const sat = date('2026-05-09'); // Saturday
        const nextThu = nextOccurrenceOfWeekday(sat, 4); // Thursday
        assert.strictEquals(nextThu.toDateString(), date('2026-05-14').toDateString());
    });

    test('wraps around the week (Saturday → next Sunday)', () => {
        const sat = date('2026-05-09');
        const r = nextOccurrenceOfWeekday(sat, 0); // Sunday
        assert.strictEquals(r.toDateString(), date('2026-05-10').toDateString());
    });
});

describe('nthWeekdayOfMonth', () => {
    test('1st Thursday of May 2026 = May 7', () => {
        const r = nthWeekdayOfMonth(2026, 4, 1, 4);
        assert.strictEquals(r.toDateString(), date('2026-05-07').toDateString());
    });

    test('3rd Thursday of May 2026 = May 21', () => {
        const r = nthWeekdayOfMonth(2026, 4, 3, 4);
        assert.strictEquals(r.toDateString(), date('2026-05-21').toDateString());
    });

    test('last (-1) Thursday of May 2026 = May 28', () => {
        const r = nthWeekdayOfMonth(2026, 4, -1, 4);
        assert.strictEquals(r.toDateString(), date('2026-05-28').toDateString());
    });

    test('5-occurrence month: last Sunday of May 2026 = May 31', () => {
        const r = nthWeekdayOfMonth(2026, 4, -1, 0);
        assert.strictEquals(r.toDateString(), date('2026-05-31').toDateString());
    });

    test('first day of month = target dow', () => {
        // Feb 2026 starts on Sunday (dow=0). 1st Sunday should be Feb 1.
        const r = nthWeekdayOfMonth(2026, 1, 1, 0);
        assert.strictEquals(r.toDateString(), date('2026-02-01').toDateString());
    });
});

describe('initialiseRecurrence', () => {
    test('weekly with hardDayOfWeek lands on next occurrence (not last week\'s)', () => {
        const sat = date('2026-05-09');
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'weekly', hardDayOfWeek: 4}), // Thursday
            sat,
        );
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-05-14').toDateString(),
        );
    });

    test('weekly anchored to today picks today, not 7 days from now', () => {
        const sat = date('2026-05-09'); // Saturday
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'weekly', hardDayOfWeek: 6}),
            sat,
        );
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            sat.toDateString(),
        );
    });

    test('monthly Nth-weekday: this month if not yet passed', () => {
        const may1 = date('2026-05-01'); // Friday
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'monthly', hardDayOfWeek: 4, ordinalWeek: 3}),
            may1,
        );
        // 3rd Thursday of May 2026 is May 21
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-05-21').toDateString(),
        );
    });

    test('monthly Nth-weekday: rolls to next month if this month\'s already passed', () => {
        const may22 = date('2026-05-22'); // day after the 3rd Thursday (May 21)
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'monthly', hardDayOfWeek: 4, ordinalWeek: 3}),
            may22,
        );
        // 3rd Thursday of June 2026 = June 18
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-06-18').toDateString(),
        );
    });

    test('flexible window sets windowDeadline to period end', () => {
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'weekly'}),
            date('2026-05-13'), // Wednesday
        );
        assert.strictEquals(new Date(init.windowDeadline!).getDay(), 6); // Saturday
    });

    test('hard window has no windowDeadline', () => {
        const init = initialiseRecurrence(
            {windowType: 'hard', suggestedDate: null},
            makeRecurrence({cadence: 'weekly', hardDayOfWeek: 4}),
            date('2026-05-09'),
        );
        assert.strictEquals(init.windowDeadline, null);
    });
});

describe('advanceRecurrence', () => {
    test('one-time task: just stamps completedAt', () => {
        const t = makeTask();
        const completedAt = date('2026-05-09');
        const r = advanceRecurrence(t, completedAt);
        assert.strictEquals(r.completedAt, completedAt.getTime());
        assert.strictEquals(r.recurrence, null);
    });

    test('rolling weekly: next due = completion + 7 days', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'weekly', scheduleMode: 'rolling'})});
        const r = advanceRecurrence(t, date('2026-05-13')); // Wed
        // next suggested = next Wed, May 20
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-20').toDateString(),
        );
    });

    test('fixed weekly with hardDayOfWeek: next due = next week\'s same dow', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', scheduleMode: 'fixed', hardDayOfWeek: 4}),
        });
        const r = advanceRecurrence(t, date('2026-05-14')); // Thu
        // next Thursday = May 21
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-21').toDateString(),
        );
    });

    test('fixed monthly Nth-weekday: next due = next month\'s Nth-dow', () => {
        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: 'monthly',
                scheduleMode: 'fixed',
                hardDayOfWeek: 4,
                ordinalWeek: 3,
            }),
        });
        const r = advanceRecurrence(t, date('2026-05-21'));
        // 3rd Thursday of June 2026 = June 18
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-06-18').toDateString(),
        );
    });

    test('clears snooze and completion fields', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly'}),
            snoozeCount: 3,
            snoozedUntil: Date.now() + 86400000,
            completedAt: Date.now(),
            completionsThisPeriod: 5,
        });
        const r = advanceRecurrence(t, date('2026-05-09'));
        assert.strictEquals(r.snoozeCount, 0);
        assert.strictEquals(r.snoozedUntil, null);
        assert.strictEquals(r.completedAt, null);
        assert.strictEquals(r.completionsThisPeriod, 0);
    });
});

describe('rolloverIfNeeded', () => {
    test('one-time task: no change', () => {
        const t = makeTask();
        const r = rolloverIfNeeded(t, date('2026-05-09'));
        assert.strictEquals(r, t);
    });

    test('initialises currentPeriodStart on first run', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly'}),
            currentPeriodStart: null,
        });
        const r = rolloverIfNeeded(t, date('2026-05-13'));
        assert.strictEquals(typeof r.currentPeriodStart, 'number');
        assert.strictEquals(new Date(r.currentPeriodStart!).getDay(), 0); // Sunday
    });

    test('same period: no state changes', () => {
        const sun = date('2026-05-10');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly'}),
            currentPeriodStart: sun.getTime(),
            completionsThisPeriod: 2,
        });
        const r = rolloverIfNeeded(t, date('2026-05-13'));
        assert.strictEquals(r, t);
    });

    test('period rolled: resets state and computes new suggested date', () => {
        const lastWeekSun = date('2026-05-03');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', hardDayOfWeek: 4}),
            currentPeriodStart: lastWeekSun.getTime(),
            completionsThisPeriod: 2,
            snoozeCount: 5,
            completedAt: Date.now(),
        });
        const today = date('2026-05-13');
        const r = rolloverIfNeeded(t, today);
        assert.strictEquals(r.completionsThisPeriod, 0);
        assert.strictEquals(r.snoozeCount, 0);
        assert.strictEquals(r.completedAt, null);
        assert.strictEquals(new Date(r.currentPeriodStart!).getDay(), 0);
    });
});
