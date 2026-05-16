// ─────────────────────────────────────────────────────────────────────────────
// Recurrence engine — pure functions, no I/O.
// Computes period boundaries, advances tasks across recurrence boundaries,
// and resets state at period rollover.
// ─────────────────────────────────────────────────────────────────────────────

import type {RecurrenceCadence, RecurrenceConfig, Task} from './types.js';
import {isMultiplePerPeriodCadence} from './types.js';
import {startOfDay} from './storage.js';

// ── Period boundary computation ─────────────────────────────────────────────

export interface Period {
    /** ms timestamp at the start (00:00 local) of the period. */
    start: number;
    /** ms timestamp at the END (23:59:59.999 local) of the last day of the period. */
    end: number;
    /** Whole days in the period (inclusive). */
    lengthDays: number;
}

/**
 * Period containing the given reference date for a cadence.
 * Weeks are Sunday → Saturday (matching JS getDay()).
 * Months / quarters / years follow the calendar.
 */
export function getCurrentPeriod(
    cadence: RecurrenceCadence,
    referenceDate: Date | number,
): Period {
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);

    if (cadence === 'daily' || cadence === 'multiple_per_day') {
        const start = new Date(ref);
        const end = endOfDay(new Date(ref));
        return makePeriod(start, end);
    }

    if (cadence === 'weekly' || cadence === 'multiple_per_week') {
        const start = new Date(ref);
        start.setDate(start.getDate() - start.getDay()); // back up to Sunday
        const end = endOfDay(addDays(start, 6));
        return makePeriod(start, end);
    }

    if (cadence === 'monthly' || cadence === 'multiple_per_month') {
        const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
        const end = endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
        return makePeriod(start, end);
    }

    if (cadence === 'quarterly' || cadence === 'multiple_per_quarter') {
        const qStartMonth = Math.floor(ref.getMonth() / 3) * 3;
        const start = new Date(ref.getFullYear(), qStartMonth, 1);
        const end = endOfDay(new Date(ref.getFullYear(), qStartMonth + 3, 0));
        return makePeriod(start, end);
    }

    // yearly / multiple_per_year
    const start = new Date(ref.getFullYear(), 0, 1);
    const end = endOfDay(new Date(ref.getFullYear(), 11, 31));
    return makePeriod(start, end);
}

function makePeriod(start: Date, end: Date): Period {
    const lengthMs = endOfDay(end).getTime() - startOfDay(start).getTime();
    const lengthDays = Math.round(lengthMs / 86_400_000);
    return {start: start.getTime(), end: end.getTime(), lengthDays};
}

// ── Suggested-date computation ──────────────────────────────────────────────

/**
 * Pick the next suggested date for a recurring task once the current period
 * is complete. Honours fixed vs. rolling mode.
 *
 * @param task        the recurring task
 * @param completedAt when the task was completed
 * @param nextPeriod  the upcoming period (after the current one closes)
 */
export function getNextSuggestedDate(
    task: Task,
    completedAt: Date,
    nextPeriod: Period,
): Date {
    const cfg = task.recurrence;
    if (!cfg) return new Date(nextPeriod.start);

    if (cfg.scheduleMode === 'rolling') {
        return addCadenceLength(completedAt, cfg.cadence);
    }

    // Fixed mode — keep relative position within the period.
    if (cfg.cadence === 'weekly' || cfg.cadence === 'multiple_per_week') {
        const days = cfg.hardDaysOfWeek;
        if (days && days.length > 0) {
            if (days.length === 1) {
                // Single day: place in next period (existing behaviour).
                const d = new Date(nextPeriod.start);
                d.setDate(d.getDate() + days[0]);
                return d;
            }
            // Multi-day: cycle — find the next selected day strictly after completedAt.
            // This allows the task to resurface in the same week (e.g. Wed→Fri).
            const dayAfter = addDays(startOfDay(completedAt), 1);
            return nextOccurrenceOfSelectedDays(dayAfter, days);
        }
        // Fallback (no hardDaysOfWeek — e.g. rolling mode or legacy data).
        const dow = cfg.hardDayOfWeek ?? (task.suggestedDate
            ? new Date(task.suggestedDate).getDay()
            : 0);
        const d = new Date(nextPeriod.start);
        d.setDate(d.getDate() + dow);
        return d;
    }
    if (cfg.cadence === 'monthly' || cfg.cadence === 'multiple_per_month') {
        const start = new Date(nextPeriod.start);
        // Ordinal weekday ("3rd Thursday of the month") wins if both fields set.
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            return nthWeekdayOfMonth(
                start.getFullYear(), start.getMonth(), cfg.ordinalWeek, cfg.hardDayOfWeek);
        }
        const dom = cfg.hardDayOfMonth ?? (task.suggestedDate
            ? new Date(task.suggestedDate).getDate()
            : 1);
        const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        return new Date(start.getFullYear(), start.getMonth(), Math.min(dom, lastDay));
    }
    if (cfg.cadence === 'quarterly' || cfg.cadence === 'multiple_per_quarter') {
        // Preserve "month-within-quarter and day-of-month" of the current
        // suggestedDate, clamped to the new quarter.
        const ref = task.suggestedDate ? new Date(task.suggestedDate) : new Date(nextPeriod.start);
        const monthOffset = ref.getMonth() % 3;
        const dom = ref.getDate();
        const start = new Date(nextPeriod.start);
        const target = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        return new Date(target.getFullYear(), target.getMonth(), Math.min(dom, lastDay));
    }
    if (cfg.cadence === 'yearly' || cfg.cadence === 'multiple_per_year') {
        const ref = task.suggestedDate ? new Date(task.suggestedDate) : new Date(nextPeriod.start);
        const start = new Date(nextPeriod.start);
        return new Date(start.getFullYear(), ref.getMonth(), ref.getDate());
    }
    // daily / multiple_per_day
    return new Date(nextPeriod.start);
}

// ── Advance to next period ──────────────────────────────────────────────────

/**
 * Given a recurring task that has just been "completed for the period," return
 * the same task with state advanced to the next period:
 *   - completionsThisPeriod = 0
 *   - snoozeCount / snoozedUntil reset
 *   - completedAt = null
 *   - currentPeriodStart, suggestedDate, windowDeadline, windowLengthDays
 *     recomputed for the next period
 *
 * For one-time tasks (recurrence === null) this is a no-op other than
 * recording completedAt — the caller should handle that separately.
 */
export function advanceRecurrence(task: Task, completedAt: Date): Task {
    if (!task.recurrence) {
        return {...task, completedAt: completedAt.getTime()};
    }

    const currentPeriod = getCurrentPeriod(task.recurrence.cadence, completedAt);
    const nextPeriodRef = new Date(currentPeriod.end + 1); // first ms of next period
    const nextPeriod = getCurrentPeriod(task.recurrence.cadence, nextPeriodRef);
    const nextSuggested = getNextSuggestedDate(task, completedAt, nextPeriod);
    // For multi-day weekly, the next occurrence may land in the *current* week
    // rather than the next period. Use the period that actually contains the
    // next occurrence so currentPeriodStart is always accurate.
    const nextOccurrencePeriod = getCurrentPeriod(task.recurrence.cadence, nextSuggested);

    return {
        ...task,
        completionsThisPeriod: 0,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        currentPeriodStart: nextOccurrencePeriod.start,
        suggestedDate: startOfDay(nextSuggested).getTime(),
        windowDeadline: task.windowType === 'flexible' ? nextOccurrencePeriod.end : null,
        windowLengthDays: nextOccurrencePeriod.lengthDays,
    };
}

/**
 * If today is past the current period's end, the task hasn't been completed
 * for that period — return a fresh task in the *new* (current) period.
 * Used at app startup so stale tasks roll forward without manual intervention.
 *
 * If the task is one-time, returns it unchanged.
 * If the task already has currentPeriodStart in or after today's period, returns unchanged.
 */
export function rolloverIfNeeded(task: Task, today: Date): Task {
    if (!task.recurrence) return task;

    // If the end date has passed, permanently retire the task without rolling over.
    const cfg = task.recurrence;
    if (cfg.endMode === 'after_date'
        && cfg.endAfterDate !== undefined
        && startOfDay(today).getTime() > cfg.endAfterDate) {
        return {
            ...task,
            completedAt: task.completedAt ?? today.getTime(),
            recurrence: null,
        };
    }

    const todayPeriod = getCurrentPeriod(task.recurrence.cadence, today);

    // No period set yet — initialise.
    if (task.currentPeriodStart === null) {
        return {
            ...task,
            currentPeriodStart: todayPeriod.start,
            windowDeadline: task.windowType === 'flexible' ? todayPeriod.end : task.windowDeadline,
            windowLengthDays: todayPeriod.lengthDays,
            suggestedDate: task.suggestedDate ?? todayPeriod.start,
        };
    }

    // Same period as before — nothing to do.
    if (task.currentPeriodStart >= todayPeriod.start) return task;

    // Period rolled over while task was incomplete — reset.
    // For multi-day weekly: find occurrence at-or-after today (include today
    // if it's a selected day). getNextSuggestedDate uses "strictly after" which
    // would skip today; bypass it here.
    const days = cfg.hardDaysOfWeek;
    const isMultiDay = (cfg.cadence === 'weekly' || cfg.cadence === 'multiple_per_week')
        && days !== undefined && days.length > 1;
    const nextSuggested = isMultiDay
        ? nextOccurrenceOfSelectedDays(today, days!)
        : getNextSuggestedDate(task, today, todayPeriod);
    const nextOccurrencePeriod = getCurrentPeriod(cfg.cadence, nextSuggested);
    return {
        ...task,
        completionsThisPeriod: 0,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        currentPeriodStart: nextOccurrencePeriod.start,
        suggestedDate: startOfDay(nextSuggested).getTime(),
        windowDeadline: task.windowType === 'flexible' ? nextOccurrencePeriod.end : null,
        windowLengthDays: nextOccurrencePeriod.lengthDays,
        totalMisses: task.totalMisses + 1,
        skipStreak: task.skipStreak + 1,
        taskCompletionStreak: 0,
    };
}

// ── Initial period setup for a new recurring task ───────────────────────────

/**
 * Compute the starting state for a brand-new recurring task. Used by the
 * task-creation form so a new task lands in a sensible period immediately.
 */
export function initialiseRecurrence(
    base: Pick<Task, 'windowType' | 'suggestedDate'>,
    recurrence: RecurrenceConfig,
    today: Date,
): {
    currentPeriodStart: number;
    suggestedDate: number;
    windowDeadline: number | null;
    windowLengthDays: number;
} {
    const period = getCurrentPeriod(recurrence.cadence, today);
    const suggested = base.suggestedDate ?? deriveInitialSuggested(recurrence, period, today);
    return {
        currentPeriodStart: period.start,
        suggestedDate: startOfDay(new Date(suggested)).getTime(),
        windowDeadline: base.windowType === 'flexible' ? period.end : null,
        windowLengthDays: period.lengthDays,
    };
}

function deriveInitialSuggested(cfg: RecurrenceConfig, period: Period, today: Date): number {
    if (cfg.cadence === 'weekly' || cfg.cadence === 'multiple_per_week') {
        const days = cfg.hardDaysOfWeek ?? (cfg.hardDayOfWeek !== undefined ? [cfg.hardDayOfWeek] : null);
        if (days && days.length > 0) {
            // Soonest occurrence today-or-later (include today if it's a selected day).
            return nextOccurrenceOfSelectedDays(today, days).getTime();
        }
    }
    if (cfg.cadence === 'monthly' || cfg.cadence === 'multiple_per_month') {
        // Ordinal weekday ("3rd Thursday of the month") — pick this month's
        // occurrence if it hasn't passed, else next month's.
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            const todayMs = startOfDay(today).getTime();
            const thisMonth = nthWeekdayOfMonth(
                today.getFullYear(), today.getMonth(), cfg.ordinalWeek, cfg.hardDayOfWeek);
            if (thisMonth.getTime() >= todayMs) return thisMonth.getTime();
            return nthWeekdayOfMonth(
                today.getFullYear(), today.getMonth() + 1, cfg.ordinalWeek, cfg.hardDayOfWeek).getTime();
        }
        if (cfg.hardDayOfMonth !== undefined) {
            const start = new Date(period.start);
            const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
            const dom = Math.min(cfg.hardDayOfMonth, lastDay);
            return new Date(start.getFullYear(), start.getMonth(), dom).getTime();
        }
    }
    return period.start;
}

// ── End-condition helpers ────────────────────────────────────────────────────

/**
 * Returns true if the task's recurrence should permanently end given the
 * current state. Call AFTER incrementing totalCompletions / updating dates.
 */
export function isRecurrenceEnded(task: Task, now: Date): boolean {
    const cfg = task.recurrence;
    if (!cfg || cfg.endMode === 'never') return false;
    if (cfg.endMode === 'after_count') {
        return task.totalCompletions >= (cfg.endAfterCount ?? Infinity);
    }
    if (cfg.endMode === 'after_date') {
        return cfg.endAfterDate !== undefined
            && startOfDay(now).getTime() >= cfg.endAfterDate;
    }
    return false;
}

// ── Multiple-per-period helpers ─────────────────────────────────────────────

export function isMultiplePerPeriod(task: Task): boolean {
    return !!task.recurrence
        && task.recurrence.frequencyPerPeriod > 1
        && isMultiplePerPeriodCadence(task.recurrence.cadence);
}

// ── Internal date helpers ───────────────────────────────────────────────────

function endOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

/**
 * Earliest date >= `from` whose day-of-week matches `dow` (0 = Sun … 6 = Sat).
 * If `from` already lands on `dow`, returns `from` (start-of-day).
 */
export function nextOccurrenceOfWeekday(from: Date, dow: number): Date {
    const r = startOfDay(new Date(from));
    const delta = (dow - r.getDay() + 7) % 7;
    r.setDate(r.getDate() + delta);
    return r;
}

/**
 * Earliest date >= `from` whose day-of-week is any of the values in `days`.
 * If `from` already lands on a selected day, returns `from` (start-of-day).
 * If `days` is empty, returns `from`.
 */
export function nextOccurrenceOfSelectedDays(from: Date, days: number[]): Date {
    if (days.length === 0) return startOfDay(new Date(from));
    const r = startOfDay(new Date(from));
    const fromDow = r.getDay();
    let minDelta = 7;
    for (const dow of days) {
        const delta = (dow - fromDow + 7) % 7;
        if (delta < minDelta) minDelta = delta;
    }
    r.setDate(r.getDate() + minDelta);
    return r;
}

/**
 * The Nth occurrence of a given weekday in a given calendar month.
 *   `ordinal`: 1, 2, 3, 4, or -1 (last)
 *   `dow`: 0 = Sun … 6 = Sat
 * `month` follows JS conventions (0 = Jan). Overflowing `month` wraps the year
 * automatically (so `month + 1` is safe at year-end).
 */
export function nthWeekdayOfMonth(
    year: number,
    month: number,
    ordinal: number,
    dow: number,
): Date {
    if (ordinal === -1) {
        const last = new Date(year, month + 1, 0); // last day of month
        const back = (last.getDay() - dow + 7) % 7;
        last.setDate(last.getDate() - back);
        return last;
    }
    const first = new Date(year, month, 1);
    const offset = (dow - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (ordinal - 1) * 7);
}

function addCadenceLength(d: Date, cadence: RecurrenceCadence): Date {
    const r = new Date(d);
    switch (cadence) {
        case 'daily':
        case 'multiple_per_day':
            r.setDate(r.getDate() + 1);
            return r;
        case 'weekly':
        case 'multiple_per_week':
            r.setDate(r.getDate() + 7);
            return r;
        case 'monthly':
        case 'multiple_per_month':
            r.setMonth(r.getMonth() + 1);
            return r;
        case 'quarterly':
        case 'multiple_per_quarter':
            r.setMonth(r.getMonth() + 3);
            return r;
        case 'yearly':
        case 'multiple_per_year':
            r.setFullYear(r.getFullYear() + 1);
            return r;
    }
}
