import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {
    advanceRecurrence,
    getCurrentPeriod,
    initialiseRecurrence,
    isRecurrenceEnded,
    isSkipDay,
    nextOccurrenceInQuarterlyTarget,
    nextOccurrenceOfSelectedDays,
    nextOccurrenceOfSelectedDoms,
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

describe('nextOccurrenceOfSelectedDays', () => {
    test('returns today when today is a selected day', () => {
        const wed = date('2026-05-13'); // Wednesday (3)
        const r = nextOccurrenceOfSelectedDays(wed, [1, 3, 5]); // Mon/Wed/Fri
        assert.strictEquals(r.toDateString(), wed.toDateString());
    });

    test('finds next selected day in same week', () => {
        const thu = date('2026-05-14'); // Thursday — not in Mon/Wed/Fri
        const r = nextOccurrenceOfSelectedDays(thu, [1, 3, 5]);
        assert.strictEquals(r.toDateString(), date('2026-05-15').toDateString()); // Friday
    });

    test('wraps to next week when no more selected days this week', () => {
        const fri = date('2026-05-15'); // Friday — last selected day this week
        const sat = date('2026-05-16'); // Saturday — not selected, look forward
        const r = nextOccurrenceOfSelectedDays(sat, [1, 3, 5]);
        assert.strictEquals(r.toDateString(), date('2026-05-18').toDateString()); // Mon next week
    });

    test('every day except Sunday: Saturday → Monday', () => {
        const sat = date('2026-05-16');
        const r = nextOccurrenceOfSelectedDays(sat, [1, 2, 3, 4, 5, 6]);
        assert.strictEquals(r.toDateString(), sat.toDateString()); // Saturday IS in list
    });

    test('empty days: returns from unchanged', () => {
        const wed = date('2026-05-13');
        const r = nextOccurrenceOfSelectedDays(wed, []);
        assert.strictEquals(r.toDateString(), wed.toDateString());
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

    test('5th Sunday of May 2026 = May 31', () => {
        // May 2026 has 5 Sundays: 3, 10, 17, 24, 31.
        const r = nthWeekdayOfMonth(2026, 4, 5, 0);
        assert.strictEquals(r.toDateString(), date('2026-05-31').toDateString());
    });

    test('5th weekday skips month with no 5th occurrence', () => {
        // September 2026 has only 4 Sundays (Sep 6, 13, 20, 27).
        // October 2026 has only 4 Sundays (Oct 4, 11, 18, 25).
        // November 2026 has 5 Sundays (Nov 1, 8, 15, 22, 29).
        const r = nthWeekdayOfMonth(2026, 8, 5, 0); // start from Sep 2026
        assert.strictEquals(r.toDateString(), date('2026-11-29').toDateString());
    });
});

describe('initialiseRecurrence', () => {
    test('weekly with hardDaysOfWeek lands on next occurrence (not last week\'s)', () => {
        const sat = date('2026-05-09');
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [4]}), // Thursday
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
            makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [6]}),
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

    test('monthly ordinalOffset -1: Sunday before 3rd Monday (GitHub #36)', () => {
        // 3rd Monday of May 2026 = May 18; Sunday before = May 17
        const may1 = date('2026-05-01');
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'monthly', hardDayOfWeek: 1, ordinalWeek: 3, ordinalOffset: -1}),
            may1,
        );
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-05-17').toDateString(),
        );
    });

    test('monthly ordinalOffset -1: advances to next month correctly', () => {
        // 3rd Monday of June 2026 = June 15; Sunday before = June 14
        const may18 = date('2026-05-18'); // after the Sunday (May 17)
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', hardDayOfWeek: 1, ordinalWeek: 3, ordinalOffset: -1}),
            suggestedDate: date('2026-05-17').getTime(),
            currentPeriodStart: date('2026-05-01').getTime(),
        });
        const advanced = advanceRecurrence(t, may18);
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2026-06-14').toDateString(),
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

    test('created late in week for next week\'s day: window deadline is next week, not this week', () => {
        // Regression: created Saturday May 16 targeting Wednesday (next week).
        // windowDeadline must be next Saturday (May 23), not this Saturday (May 16).
        const sat = date('2026-05-16');
        const init = initialiseRecurrence(
            {windowType: 'flexible', suggestedDate: null},
            makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [3]}), // Wednesday
            sat,
        );
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-05-20').toDateString(), // next Wednesday
        );
        assert.strictEquals(
            new Date(init.windowDeadline!).toDateString(),
            date('2026-05-23').toDateString(), // next Saturday — not May 16
        );
        assert.strictEquals(
            new Date(init.currentPeriodStart).toDateString(),
            date('2026-05-17').toDateString(), // next Sunday
        );
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

    test('fixed weekly with hardDaysOfWeek (single): next due = next week\'s same dow', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', scheduleMode: 'fixed', hardDaysOfWeek: [4]}),
        });
        const r = advanceRecurrence(t, date('2026-05-14')); // Thu
        // next Thursday = May 21
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-21').toDateString(),
        );
    });

    test('fixed weekly with hardDaysOfWeek (multi): cycles within week', () => {
        const t = makeTask({
            // Mon/Wed/Fri
            recurrence: makeRecurrence({cadence: 'weekly', scheduleMode: 'fixed', hardDaysOfWeek: [1, 3, 5]}),
        });
        const r = advanceRecurrence(t, date('2026-05-13')); // Wednesday May 13
        // Next occurrence: Friday May 15 (same week)
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-15').toDateString(),
        );
    });

    test('fixed weekly multi-day: last day of week wraps to next week\'s first day', () => {
        const t = makeTask({
            // Mon/Wed/Fri
            recurrence: makeRecurrence({cadence: 'weekly', scheduleMode: 'fixed', hardDaysOfWeek: [1, 3, 5]}),
        });
        const r = advanceRecurrence(t, date('2026-05-15')); // Friday May 15
        // Next occurrence: Monday May 18 (next week)
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-18').toDateString(),
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

describe('isRecurrenceEnded', () => {
    test('endMode=never: never ends', () => {
        const t = makeTask({
            recurrence: makeRecurrence({endMode: 'never'}),
            totalCompletions: 1000,
        });
        assert.isFalse(isRecurrenceEnded(t, date('2026-05-14')));
    });

    test('endMode=after_count: ends when count >= target', () => {
        const t = makeTask({
            recurrence: makeRecurrence({endMode: 'after_count', endAfterCount: 5}),
            totalCompletions: 5,
        });
        assert.isTrue(isRecurrenceEnded(t, date('2026-05-14')));
    });

    test('endMode=after_count: not ended when count < target', () => {
        const t = makeTask({
            recurrence: makeRecurrence({endMode: 'after_count', endAfterCount: 5}),
            totalCompletions: 4,
        });
        assert.isFalse(isRecurrenceEnded(t, date('2026-05-14')));
    });

    test('endMode=after_date: ends on or after end date', () => {
        const endDate = date('2026-05-14');
        const t = makeTask({
            recurrence: makeRecurrence({endMode: 'after_date', endAfterDate: endDate.getTime()}),
            totalCompletions: 1,
        });
        assert.isTrue(isRecurrenceEnded(t, date('2026-05-14')));
        assert.isTrue(isRecurrenceEnded(t, date('2026-05-15')));
    });

    test('endMode=after_date: not ended before end date', () => {
        const endDate = date('2026-05-14');
        const t = makeTask({
            recurrence: makeRecurrence({endMode: 'after_date', endAfterDate: endDate.getTime()}),
            totalCompletions: 1,
        });
        assert.isFalse(isRecurrenceEnded(t, date('2026-05-13')));
    });

    test('no recurrence: never ended', () => {
        const t = makeTask({recurrence: null});
        assert.isFalse(isRecurrenceEnded(t, date('2026-05-14')));
    });
});

describe('rolloverIfNeeded — end conditions', () => {
    test('after_date: retires task when today is past end date', () => {
        const endDate = date('2026-05-31');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', endMode: 'after_date', endAfterDate: endDate.getTime()}),
            currentPeriodStart: date('2026-05-25').getTime(),
        });
        const r = rolloverIfNeeded(t, date('2026-06-01'));
        assert.strictEquals(r.recurrence, null);
        assert.isTrue(r.completedAt !== null);
    });

    test('after_date: does NOT retire when today is on the end date', () => {
        const endDate = date('2026-05-31');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', endMode: 'after_date', endAfterDate: endDate.getTime()}),
            currentPeriodStart: date('2026-05-25').getTime(),
        });
        const r = rolloverIfNeeded(t, date('2026-05-31'));
        assert.strictEquals(r.recurrence, t.recurrence);
    });

    test('after_count: does NOT retire via rollover — only via completion', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', endMode: 'after_count', endAfterCount: 3}),
            currentPeriodStart: date('2026-05-03').getTime(),
            totalCompletions: 3,
        });
        // rolloverIfNeeded should roll over normally — end-count only triggers on completion
        const r = rolloverIfNeeded(t, date('2026-05-13'));
        assert.strictEquals(typeof r.recurrence, 'object');
        assert.isTrue(r.recurrence !== null);
    });
});

describe('rolloverIfNeeded — startDate', () => {
    test('task with future startDate does not roll over and does not accrue a miss', () => {
        const startDate = date('2026-12-01');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', startDate: startDate.getTime()}),
            currentPeriodStart: date('2026-04-01').getTime(),
        });
        const result = rolloverIfNeeded(t, date('2026-05-17'));
        // Should be unchanged — startDate hasn't arrived yet.
        assert.strictEquals(result, t);
    });

    test('task with past startDate rolls over normally', () => {
        const startDate = date('2026-01-01');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', startDate: startDate.getTime()}),
            currentPeriodStart: date('2026-04-01').getTime(),
        });
        const result = rolloverIfNeeded(t, date('2026-05-17'));
        // Should have rolled over (period changed).
        assert.strictEquals(new Date(result.currentPeriodStart!).getMonth(), 4); // May
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
            recurrence: makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [4]}),
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

    test('multi-day: rollover when today is a selected day picks today', () => {
        const lastWeekSun = date('2026-05-03');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [1, 3, 5]}),
            currentPeriodStart: lastWeekSun.getTime(),
        });
        // Today is Wednesday May 13 — a selected day
        const r = rolloverIfNeeded(t, date('2026-05-13'));
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-13').toDateString(),
        );
    });

    test('multi-day: rollover on non-selected day picks next selected day', () => {
        const lastWeekSun = date('2026-05-03');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'weekly', hardDaysOfWeek: [1, 3, 5]}),
            currentPeriodStart: lastWeekSun.getTime(),
        });
        // Today is Thursday May 14 — not in Mon/Wed/Fri
        const r = rolloverIfNeeded(t, date('2026-05-14'));
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-15').toDateString(), // Friday
        );
    });
});

describe('nextOccurrenceOfSelectedDoms', () => {
    test('returns today when today is a selected dom', () => {
        const r = nextOccurrenceOfSelectedDoms(date('2026-05-01'), [1, 15]);
        assert.strictEquals(r.toDateString(), date('2026-05-01').toDateString());
    });

    test('returns next selected dom later this month', () => {
        const r = nextOccurrenceOfSelectedDoms(date('2026-05-08'), [1, 15]);
        assert.strictEquals(r.toDateString(), date('2026-05-15').toDateString());
    });

    test('wraps to first dom of next month when all doms passed', () => {
        const r = nextOccurrenceOfSelectedDoms(date('2026-05-20'), [1, 15]);
        assert.strictEquals(r.toDateString(), date('2026-06-01').toDateString());
    });

    test('clamps dom to month length (Feb has no 31st)', () => {
        // If [28, 31] and we are in Feb 10: next is Feb 28 (31 doesn't exist).
        const r = nextOccurrenceOfSelectedDoms(date('2026-02-10'), [28, 31]);
        assert.strictEquals(r.toDateString(), date('2026-02-28').toDateString());
    });
});

describe('monthly multi-dom (hardDaysOfMonth)', () => {
    test('initialiseRecurrence picks today when today is a selected dom', () => {
        const today = date('2026-05-01');
        const cfg = makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(new Date(init.suggestedDate).toDateString(), today.toDateString());
    });

    test('initialiseRecurrence picks next dom later this month', () => {
        const today = date('2026-05-08');
        const cfg = makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-05-15').toDateString(),
        );
    });

    test('advanceRecurrence cycles to next dom in same month', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]}),
            suggestedDate: date('2026-05-01').getTime(),
            currentPeriodStart: date('2026-05-01').getTime(),
        });
        const advanced = advanceRecurrence(t, date('2026-05-01'));
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2026-05-15').toDateString(),
        );
    });

    test('advanceRecurrence wraps to first dom of next month after last dom', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]}),
            suggestedDate: date('2026-05-15').getTime(),
            currentPeriodStart: date('2026-05-01').getTime(),
        });
        const advanced = advanceRecurrence(t, date('2026-05-15'));
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2026-06-01').toDateString(),
        );
    });

    test('rolloverIfNeeded for multi-dom picks today when today is a selected dom', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]}),
            currentPeriodStart: date('2026-04-01').getTime(),
            suggestedDate: date('2026-04-15').getTime(),
        });
        const r = rolloverIfNeeded(t, date('2026-05-01'));
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-01').toDateString(),
        );
    });

    test('rolloverIfNeeded for multi-dom picks next dom when today is not selected', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'monthly', hardDaysOfMonth: [1, 15]}),
            currentPeriodStart: date('2026-04-01').getTime(),
            suggestedDate: date('2026-04-15').getTime(),
        });
        const r = rolloverIfNeeded(t, date('2026-05-08'));
        assert.strictEquals(
            new Date(r.suggestedDate!).toDateString(),
            date('2026-05-15').toDateString(),
        );
    });
});

describe('nextOccurrenceInQuarterlyTarget', () => {
    // Q2 2026 = Apr 1 – Jun 30.  monthOfQuarter=1 → May (2nd month).
    const q2Start = date('2026-04-01');

    test('from before target month: returns first dom of target month', () => {
        const r = nextOccurrenceInQuarterlyTarget([1, 15], date('2026-04-10'), q2Start, 1);
        assert.strictEquals(r.toDateString(), date('2026-05-01').toDateString());
    });

    test('from = first dom in target month: returns that dom', () => {
        const r = nextOccurrenceInQuarterlyTarget([1, 15], date('2026-05-01'), q2Start, 1);
        assert.strictEquals(r.toDateString(), date('2026-05-01').toDateString());
    });

    test('from between doms in target month: returns next dom', () => {
        const r = nextOccurrenceInQuarterlyTarget([1, 15], date('2026-05-08'), q2Start, 1);
        assert.strictEquals(r.toDateString(), date('2026-05-15').toDateString());
    });

    test('from after last dom in target month: wraps to next quarter', () => {
        const r = nextOccurrenceInQuarterlyTarget([1, 15], date('2026-05-20'), q2Start, 1);
        assert.strictEquals(r.toDateString(), date('2026-08-01').toDateString()); // Q3 May+3=Aug
    });
});

describe('quarterly — hardMonthOfQuarter anchor', () => {
    test('initialiseRecurrence quarterly picks target month in current quarter', () => {
        // Today = May 8 (Q2). hardMonthOfQuarter=1 (2nd month=May). dom=15.
        const today = date('2026-05-08');
        const cfg = makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDayOfMonth: 15});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(new Date(init.suggestedDate).toDateString(), date('2026-05-15').toDateString());
    });

    test('initialiseRecurrence quarterly with multi-dom picks next dom', () => {
        // Today = May 8. doms=[1,15]. Next dom at-or-after May 8 in May = 15.
        const today = date('2026-05-08');
        const cfg = makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDaysOfMonth: [1, 15]});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(new Date(init.suggestedDate).toDateString(), date('2026-05-15').toDateString());
    });

    test('advanceRecurrence quarterly single-dom places in next quarter target month', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDayOfMonth: 15}),
            suggestedDate: date('2026-05-15').getTime(),
            currentPeriodStart: date('2026-04-01').getTime(),
        });
        const advanced = advanceRecurrence(t, date('2026-05-15'));
        assert.strictEquals(new Date(advanced.suggestedDate!).toDateString(), date('2026-08-15').toDateString());
    });

    test('advanceRecurrence quarterly multi-dom cycles to next dom in same quarter', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDaysOfMonth: [1, 15]}),
            suggestedDate: date('2026-05-01').getTime(),
            currentPeriodStart: date('2026-04-01').getTime(),
        });
        const advanced = advanceRecurrence(t, date('2026-05-01'));
        assert.strictEquals(new Date(advanced.suggestedDate!).toDateString(), date('2026-05-15').toDateString());
    });

    test('advanceRecurrence quarterly multi-dom wraps to next quarter after last dom', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDaysOfMonth: [1, 15]}),
            suggestedDate: date('2026-05-15').getTime(),
            currentPeriodStart: date('2026-04-01').getTime(),
        });
        const advanced = advanceRecurrence(t, date('2026-05-15'));
        assert.strictEquals(new Date(advanced.suggestedDate!).toDateString(), date('2026-08-01').toDateString());
    });

    test('rolloverIfNeeded quarterly multi-dom: picks today when today is selected dom in target month', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDaysOfMonth: [1, 15]}),
            currentPeriodStart: date('2026-01-01').getTime(),
            suggestedDate: date('2026-02-15').getTime(),
        });
        const r = rolloverIfNeeded(t, date('2026-05-01'));
        assert.strictEquals(new Date(r.suggestedDate!).toDateString(), date('2026-05-01').toDateString());
    });

    test('rolloverIfNeeded quarterly: before target month → picks first dom of target month', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'quarterly', hardMonthOfQuarter: 1, hardDaysOfMonth: [1, 15]}),
            currentPeriodStart: date('2026-01-01').getTime(),
            suggestedDate: date('2026-02-15').getTime(),
        });
        // Today = Apr 10 (Q2), before May (2nd month of Q2)
        const r = rolloverIfNeeded(t, date('2026-04-10'));
        assert.strictEquals(new Date(r.suggestedDate!).toDateString(), date('2026-05-01').toDateString());
    });
});

describe('annually — hardMonthOfYear anchor', () => {
    test('initialiseRecurrence with hardMonthOfYear picks this-year occurrence when in future', () => {
        // Today = May 17; target month = September (8), dom = 1 → Sep 1 2026
        const today = date('2026-05-17');
        const cfg = makeRecurrence({cadence: 'yearly', hardMonthOfYear: 8, hardDayOfMonth: 1});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2026-09-01').toDateString(),
        );
    });

    test('initialiseRecurrence with hardMonthOfYear rolls to next year when this-year date passed', () => {
        // Today = May 17; target month = January (0), dom = 15 → Jan 15 2027
        const today = date('2026-05-17');
        const cfg = makeRecurrence({cadence: 'yearly', hardMonthOfYear: 0, hardDayOfMonth: 15});
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            date('2027-01-15').toDateString(),
        );
    });

    test('getNextSuggestedDate for yearly preserves hardMonthOfYear year-over-year', () => {
        const today = date('2026-05-17');
        // Task was due Sep 1 2026 — now advance it
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'yearly', hardMonthOfYear: 8, hardDayOfMonth: 1}),
            suggestedDate: date('2026-09-01').getTime(),
            currentPeriodStart: date('2026-01-01').getTime(),
        });
        const advanced = advanceRecurrence(t, today);
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2027-09-01').toDateString(),
        );
    });

    test('getNextSuggestedDate for yearly clamps day to month length', () => {
        // target: Feb 31 → clamps to Feb 28 (non-leap 2027)
        const today = date('2026-05-17');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'yearly', hardMonthOfYear: 1, hardDayOfMonth: 31}),
            suggestedDate: date('2026-02-28').getTime(),
            currentPeriodStart: date('2026-01-01').getTime(),
        });
        const advanced = advanceRecurrence(t, today);
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2027-02-28').toDateString(),
        );
    });
});

// ── GitHub #35: yearly ordinal weekday ───────────────────────────────────────

describe('annually — ordinal weekday anchor (GitHub #35)', () => {
    // Thanksgiving: 4th Thursday of November
    const thanksgiving2026 = date('2026-11-26'); // 4th Thu of Nov 2026
    const thanksgiving2027 = date('2027-11-25'); // 4th Thu of Nov 2027

    test('initialiseRecurrence picks this-year ordinal when in future', () => {
        // Today = May 17; target = 4th Thursday of November → Nov 26 2026
        const today = date('2026-05-17');
        const cfg = makeRecurrence({
            cadence: 'yearly',
            hardMonthOfYear: 10, // November = 10
            ordinalWeek: 4,
            hardDayOfWeek: 4, // Thursday
        });
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            thanksgiving2026.toDateString(),
        );
    });

    test('initialiseRecurrence rolls to next year when this-year ordinal has passed', () => {
        // Today = Dec 1 (past Thanksgiving); should return 2027
        const today = date('2026-12-01');
        const cfg = makeRecurrence({
            cadence: 'yearly',
            hardMonthOfYear: 10,
            ordinalWeek: 4,
            hardDayOfWeek: 4,
        });
        const init = initialiseRecurrence({windowType: 'flexible', suggestedDate: null}, cfg, today);
        assert.strictEquals(
            new Date(init.suggestedDate).toDateString(),
            thanksgiving2027.toDateString(),
        );
    });

    test('getNextSuggestedDate advances to the next year ordinal occurrence', () => {
        const today = date('2026-11-27'); // day after Thanksgiving 2026
        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: 'yearly',
                hardMonthOfYear: 10,
                ordinalWeek: 4,
                hardDayOfWeek: 4,
            }),
            suggestedDate: thanksgiving2026.getTime(),
            currentPeriodStart: date('2026-01-01').getTime(),
        });
        const advanced = advanceRecurrence(t, today);
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            thanksgiving2027.toDateString(),
        );
    });

    test('ordinalOffset -2: Tuesday before Thanksgiving (2 days before 4th Thu of Nov)', () => {
        // Thanksgiving 2026 = Nov 26; Tuesday before = Nov 24
        const dayAfterThanksgiving = date('2026-11-27');
        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: 'yearly',
                hardMonthOfYear: 10,
                ordinalWeek: 4,
                hardDayOfWeek: 4,
                ordinalOffset: -2,
            }),
            suggestedDate: date('2026-11-24').getTime(), // Tuesday before Thanksgiving 2026
            currentPeriodStart: date('2026-01-01').getTime(),
        });
        const advanced = advanceRecurrence(t, dayAfterThanksgiving);
        // 2027: Thanksgiving = Nov 25; Tuesday before = Nov 23
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            date('2027-11-23').toDateString(),
        );
    });

    test('getNextSuggestedDate: 2nd Sunday of May (Mother\'s Day) — 2026 and 2027', () => {
        // Mother's Day 2026 = May 10; 2027 = May 9
        const mothersDay2026 = date('2026-05-10');
        const mothersDay2027 = date('2027-05-09');
        const today = date('2026-05-11'); // day after

        const t = makeTask({
            recurrence: makeRecurrence({
                cadence: 'yearly',
                hardMonthOfYear: 4, // May = 4
                ordinalWeek: 2,
                hardDayOfWeek: 0, // Sunday
            }),
            suggestedDate: mothersDay2026.getTime(),
            currentPeriodStart: date('2026-01-01').getTime(),
        });
        const advanced = advanceRecurrence(t, today);
        assert.strictEquals(
            new Date(advanced.suggestedDate!).toDateString(),
            mothersDay2027.toDateString(),
        );
    });
});

// ── skipDays ─────────────────────────────────────────────────────────────────

describe('isSkipDay', () => {
    // 2026-05-10 is a Sunday (getDay() = 0)
    const sunday = date('2026-05-10');
    const monday = date('2026-05-11');

    test('returns true when today is a skip day (Sunday skipped)', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]})});
        assert.strictEquals(isSkipDay(t, sunday), true);
    });

    test('returns false when today is not a skip day', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]})});
        assert.strictEquals(isSkipDay(t, monday), false);
    });

    test('returns false when skipDays is empty', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'daily', skipDays: []})});
        assert.strictEquals(isSkipDay(t, sunday), false);
    });

    test('returns false when skipDays is absent', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'daily'})});
        assert.strictEquals(isSkipDay(t, sunday), false);
    });

    test('returns false for non-daily cadences even if day matches', () => {
        const t = makeTask({recurrence: makeRecurrence({cadence: 'weekly', skipDays: [0]})});
        assert.strictEquals(isSkipDay(t, sunday), false);
    });
});

describe('skipDays — getNextSuggestedDate skips forward', () => {
    // Sunday = 0; Monday = 1 (2026-05-11)
    const monday = date('2026-05-11');

    test('next suggested date skips Sunday when Sunday is in skipDays', () => {
        // Completing on Saturday → next period starts Sunday → should advance to Monday.
        const saturday = date('2026-05-09');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]}),
            currentPeriodStart: saturday.getTime(),
        });
        const advanced = advanceRecurrence(t, saturday);
        assert.strictEquals(new Date(advanced.suggestedDate!).getDay(), 1); // Monday
    });

    test('next suggested date is tomorrow when it is not a skip day', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]}),
            currentPeriodStart: monday.getTime(),
        });
        const advanced = advanceRecurrence(t, monday);
        assert.strictEquals(new Date(advanced.suggestedDate!).getDay(), 2); // Tuesday
    });

    test('skips multiple consecutive skip days', () => {
        // Skip Sat (6) + Sun (0): completing on Friday → next suggested is Monday.
        const friday = date('2026-05-08');
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily', skipDays: [0, 6]}),
            currentPeriodStart: friday.getTime(),
        });
        const advanced = advanceRecurrence(t, friday);
        assert.strictEquals(new Date(advanced.suggestedDate!).getDay(), 1); // Monday
    });
});

describe('skipDays — rolloverIfNeeded does not count miss on skip day', () => {
    // Sunday = 0 (2026-05-10)
    const sunday = date('2026-05-10');
    const monday = date('2026-05-11');

    test('no miss when rolling over from a skip day', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]}),
            currentPeriodStart: sunday.getTime(), // stale period is Sunday (a skip day)
            totalMisses: 0,
            skipStreak: 0,
            taskCompletionStreak: 3,
        });
        const rolled = rolloverIfNeeded(t, monday);
        assert.strictEquals(rolled.totalMisses, 0); // no miss
        assert.strictEquals(rolled.skipStreak, 0);  // no streak
        assert.strictEquals(rolled.taskCompletionStreak, 3); // streak preserved
    });

    test('miss is counted when rolling over from a non-skip day', () => {
        const t = makeTask({
            recurrence: makeRecurrence({cadence: 'daily', skipDays: [0]}),
            currentPeriodStart: date('2026-05-09').getTime(), // Saturday — not a skip day
            totalMisses: 0,
            skipStreak: 0,
            taskCompletionStreak: 3,
        });
        const rolled = rolloverIfNeeded(t, monday);
        assert.strictEquals(rolled.totalMisses, 1);
        assert.strictEquals(rolled.skipStreak, 1);
        assert.strictEquals(rolled.taskCompletionStreak, 0);
    });
});
