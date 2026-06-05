// ─────────────────────────────────────────────────────────────────────────────
// Recurrence engine — pure functions, no I/O.
// Computes period boundaries, advances tasks across recurrence boundaries,
// and resets state at period rollover.
// ─────────────────────────────────────────────────────────────────────────────

import type {RecurrenceCadence, RecurrenceConfig, Task} from './types.js';
import {isCurrentlyPaused, startOfDay} from './storage.js';

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

    if (cadence === 'weekly') {
        const start = new Date(ref);
        start.setDate(start.getDate() - start.getDay()); // back up to Sunday
        const end = endOfDay(addDays(start, 6));
        return makePeriod(start, end);
    }

    if (cadence === 'monthly') {
        const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
        const end = endOfDay(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
        return makePeriod(start, end);
    }

    if (cadence === 'quarterly') {
        const qStartMonth = Math.floor(ref.getMonth() / 3) * 3;
        const start = new Date(ref.getFullYear(), qStartMonth, 1);
        const end = endOfDay(new Date(ref.getFullYear(), qStartMonth + 3, 0));
        return makePeriod(start, end);
    }

    // annually
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
    if (cfg.cadence === 'weekly') {
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
    if (cfg.cadence === 'monthly') {
        const start = new Date(nextPeriod.start);
        // Ordinal weekday ("3rd Thursday of the month") wins if both fields set.
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            const anchor = nthWeekdayOfMonth(
                start.getFullYear(), start.getMonth(), cfg.ordinalWeek, cfg.hardDayOfWeek);
            return cfg.ordinalOffset ? addDays(anchor, cfg.ordinalOffset) : anchor;
        }
        // Multi-dom: cycle through selected days, wrapping to next month as needed.
        if (cfg.hardDaysOfMonth && cfg.hardDaysOfMonth.length > 1) {
            const dayAfter = addDays(startOfDay(completedAt), 1);
            return nextOccurrenceOfSelectedDoms(dayAfter, cfg.hardDaysOfMonth);
        }
        const dom = (cfg.hardDaysOfMonth?.[0]) ?? cfg.hardDayOfMonth ?? (task.suggestedDate
            ? new Date(task.suggestedDate).getDate()
            : 1);
        const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        return new Date(start.getFullYear(), start.getMonth(), Math.min(dom, lastDay));
    }
    if (cfg.cadence === 'quarterly') {
        if (cfg.hardMonthOfQuarter !== undefined) {
            const doms = cfg.hardDaysOfMonth?.length ? cfg.hardDaysOfMonth : [cfg.hardDayOfMonth ?? 1];
            if (doms.length > 1) {
                // Multi-dom: cycle within the target month, wrapping to next quarter.
                const dayAfter = addDays(startOfDay(completedAt), 1);
                const currentQuarterPeriod = getCurrentPeriod(cfg.cadence, completedAt);
                return nextOccurrenceInQuarterlyTarget(
                    doms, dayAfter, new Date(currentQuarterPeriod.start), cfg.hardMonthOfQuarter,
                );
            }
            // Single dom: place in the configured month of the next quarter.
            const start = new Date(nextPeriod.start);
            const target = new Date(start.getFullYear(), start.getMonth() + cfg.hardMonthOfQuarter, 1);
            const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
            return new Date(target.getFullYear(), target.getMonth(), Math.min(doms[0]!, lastDay));
        }
        // Fallback: preserve month-within-quarter and day from suggestedDate.
        const ref = task.suggestedDate ? new Date(task.suggestedDate) : new Date(nextPeriod.start);
        const monthOffset = ref.getMonth() % 3;
        const dom = ref.getDate();
        const start = new Date(nextPeriod.start);
        const target = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        return new Date(target.getFullYear(), target.getMonth(), Math.min(dom, lastDay));
    }
    if (cfg.cadence === 'annually') {
        const ref = task.suggestedDate ? new Date(task.suggestedDate) : new Date(nextPeriod.start);
        const start = new Date(nextPeriod.start);
        const month = cfg.hardMonthOfYear ?? ref.getMonth();
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            const anchor = nthWeekdayOfMonth(start.getFullYear(), month, cfg.ordinalWeek, cfg.hardDayOfWeek);
            return cfg.ordinalOffset ? addDays(anchor, cfg.ordinalOffset) : anchor;
        }
        const dom = cfg.hardDayOfMonth ?? ref.getDate();
        const lastDayOfMonth = new Date(start.getFullYear(), month + 1, 0).getDate();
        return new Date(start.getFullYear(), month, Math.min(dom, lastDayOfMonth));
    }
    // daily / multiple_per_day — skip forward over any skip days.
    return skipForwardOverSkipDays(new Date(nextPeriod.start), cfg.skipDays);
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
        windowDeadline: task.deadlineType === 'flexible' ? nextOccurrencePeriod.end : null,
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
    // Progress-period rollover for milestones — runs regardless of outer recurrence.
    if (task.isMilestone && task.progressCadence != null && task.currentProgressPeriodStart != null) {
        const progressPeriod = getCurrentPeriod(task.progressCadence.cadence, today);
        if (task.currentProgressPeriodStart < progressPeriod.start) {
            task = {
                ...task,
                progressCompletionsThisPeriod: 0,
                currentProgressPeriodStart: progressPeriod.start,
            };
        }
    }

    if (!task.recurrence) return task;

    const cfg = task.recurrence;

    // If the end date has passed, permanently retire the task without rolling over.
    if (cfg.endMode === 'after_date'
        && cfg.endAfterDate !== undefined
        && startOfDay(today).getTime() > cfg.endAfterDate) {
        return {
            ...task,
            completedAt: task.completedAt ?? today.getTime(),
            recurrence: null,
        };
    }

    // Not started yet — don't roll over, don't count a miss.
    if (cfg.startDate !== undefined && startOfDay(today).getTime() < cfg.startDate) {
        return task;
    }

    // Paused — don't roll over, don't count a miss.
    if (isCurrentlyPaused(task)) return task;

    const todayPeriod = getCurrentPeriod(task.recurrence.cadence, today);

    // No period set yet — initialise.
    if (task.currentPeriodStart === null) {
        return {
            ...task,
            currentPeriodStart: todayPeriod.start,
            windowDeadline: task.deadlineType === 'flexible' ? todayPeriod.end : task.windowDeadline,
            windowLengthDays: todayPeriod.lengthDays,
            suggestedDate: task.suggestedDate ?? todayPeriod.start,
        };
    }

    // Same period as before — nothing to do.
    if (task.currentPeriodStart >= todayPeriod.start) return task;

    // Period rolled over while task was incomplete — reset.
    // For multi-day weekly/monthly: find occurrence at-or-after today (include today
    // if it's a selected day/dom). getNextSuggestedDate uses "strictly after" which
    // would skip today; bypass it here.
    const days = cfg.hardDaysOfWeek;
    const isMultiDay = (cfg.cadence === 'weekly')
        && days !== undefined && days.length > 1;
    const doms = cfg.hardDaysOfMonth;
    const isMultiDom = (cfg.cadence === 'monthly')
        && doms !== undefined && doms.length > 1;
    const isMultiDomQuarterly = (cfg.cadence === 'quarterly')
        && cfg.hardMonthOfQuarter !== undefined
        && doms !== undefined && doms.length > 1;
    const nextSuggested = isMultiDay
        ? nextOccurrenceOfSelectedDays(today, days!)
        : isMultiDom
        ? nextOccurrenceOfSelectedDoms(today, doms!)
        : isMultiDomQuarterly
        ? nextOccurrenceInQuarterlyTarget(doms!, today, new Date(todayPeriod.start), cfg.hardMonthOfQuarter!)
        : getNextSuggestedDate(task, today, todayPeriod);
    const nextOccurrencePeriod = getCurrentPeriod(cfg.cadence, nextSuggested);

    // Don't count a miss if the stale period was a skip day.
    const staleDay = new Date(task.currentPeriodStart!);
    const wasStaleDayASkipDay = isSkipDay(task, staleDay);

    return {
        ...task,
        completionsThisPeriod: 0,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        currentPeriodStart: nextOccurrencePeriod.start,
        suggestedDate: startOfDay(nextSuggested).getTime(),
        windowDeadline: task.deadlineType === 'flexible' ? nextOccurrencePeriod.end : null,
        windowLengthDays: nextOccurrencePeriod.lengthDays,
        totalMisses: wasStaleDayASkipDay ? task.totalMisses : task.totalMisses + 1,
        skipStreak: wasStaleDayASkipDay ? task.skipStreak : task.skipStreak + 1,
        taskCompletionStreak: wasStaleDayASkipDay ? task.taskCompletionStreak : 0,
    };
}

// ── Initial period setup for a new recurring task ───────────────────────────

/**
 * Compute the starting state for a brand-new recurring task. Used by the
 * task-creation form so a new task lands in a sensible period immediately.
 */
export function initialiseRecurrence(
    base: Pick<Task, 'deadlineType' | 'suggestedDate'>,
    recurrence: RecurrenceConfig,
    today: Date,
): {
    currentPeriodStart: number;
    suggestedDate: number;
    windowDeadline: number | null;
    windowLengthDays: number;
} {
    const todayPeriod = getCurrentPeriod(recurrence.cadence, today);
    const suggested = base.suggestedDate ?? deriveInitialSuggested(recurrence, todayPeriod, today);
    // Use the period that contains the suggested date so window boundaries
    // match when the task is actually due (e.g. created Saturday for Wednesday
    // → period is next week, not this week).
    const suggestedPeriod = getCurrentPeriod(recurrence.cadence, new Date(suggested));
    return {
        currentPeriodStart: suggestedPeriod.start,
        suggestedDate: startOfDay(new Date(suggested)).getTime(),
        windowDeadline: base.deadlineType === 'flexible' ? suggestedPeriod.end : null,
        windowLengthDays: suggestedPeriod.lengthDays,
    };
}

function deriveInitialSuggested(cfg: RecurrenceConfig, period: Period, today: Date): number {
    if (cfg.cadence === 'weekly') {
        const days = cfg.hardDaysOfWeek ?? (cfg.hardDayOfWeek !== undefined ? [cfg.hardDayOfWeek] : null);
        if (days && days.length > 0) {
            // Soonest occurrence today-or-later (include today if it's a selected day).
            return nextOccurrenceOfSelectedDays(today, days).getTime();
        }
    }
    if (cfg.cadence === 'monthly') {
        // Ordinal weekday ("3rd Thursday of the month") — pick this month's
        // occurrence if it hasn't passed, else next month's.
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            const todayMs = startOfDay(today).getTime();
            const applyOffset = (d: Date) => cfg.ordinalOffset ? addDays(d, cfg.ordinalOffset) : d;
            const thisMonth = applyOffset(nthWeekdayOfMonth(
                today.getFullYear(), today.getMonth(), cfg.ordinalWeek, cfg.hardDayOfWeek));
            if (thisMonth.getTime() >= todayMs) return thisMonth.getTime();
            return applyOffset(nthWeekdayOfMonth(
                today.getFullYear(), today.getMonth() + 1, cfg.ordinalWeek, cfg.hardDayOfWeek)).getTime();
        }
        if (cfg.hardDaysOfMonth && cfg.hardDaysOfMonth.length > 0) {
            return nextOccurrenceOfSelectedDoms(today, cfg.hardDaysOfMonth).getTime();
        }
        if (cfg.hardDayOfMonth !== undefined) {
            const start = new Date(period.start);
            const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
            const dom = Math.min(cfg.hardDayOfMonth, lastDay);
            return new Date(start.getFullYear(), start.getMonth(), dom).getTime();
        }
    }
    if (cfg.cadence === 'quarterly') {
        if (cfg.hardMonthOfQuarter !== undefined) {
            const doms = cfg.hardDaysOfMonth?.length ? cfg.hardDaysOfMonth : [cfg.hardDayOfMonth ?? 1];
            const todayQuarterPeriod = getCurrentPeriod(cfg.cadence, today);
            return nextOccurrenceInQuarterlyTarget(
                doms, today, new Date(todayQuarterPeriod.start), cfg.hardMonthOfQuarter,
            ).getTime();
        }
    }
    if (cfg.cadence === 'annually') {
        if (cfg.hardMonthOfYear !== undefined) {
            const todayMs = startOfDay(today).getTime();
            const month = cfg.hardMonthOfYear;
            if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
                const applyOffset = (d: Date) => cfg.ordinalOffset ? addDays(d, cfg.ordinalOffset) : d;
                const thisYear = applyOffset(nthWeekdayOfMonth(today.getFullYear(), month, cfg.ordinalWeek, cfg.hardDayOfWeek));
                if (thisYear.getTime() >= todayMs) return thisYear.getTime();
                return applyOffset(nthWeekdayOfMonth(today.getFullYear() + 1, month, cfg.ordinalWeek, cfg.hardDayOfWeek)).getTime();
            }
            const dom = cfg.hardDayOfMonth ?? 1;
            // This year's occurrence in the target month.
            const lastDayThis = new Date(today.getFullYear(), month + 1, 0).getDate();
            const thisYear = new Date(today.getFullYear(), month, Math.min(dom, lastDayThis));
            if (thisYear.getTime() >= todayMs) return thisYear.getTime();
            // Already passed this year — use next year's.
            const lastDayNext = new Date(today.getFullYear() + 1, month + 1, 0).getDate();
            return new Date(today.getFullYear() + 1, month, Math.min(dom, lastDayNext)).getTime();
        }
    }
    // daily / multiple_per_day — start from today, skip over any skip days.
    if (cfg.cadence === 'daily' || cfg.cadence === 'multiple_per_day') {
        return skipForwardOverSkipDays(today, cfg.skipDays).getTime();
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
    return !!task.recurrence && task.recurrence.frequencyPerPeriod > 1;
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
 * Earliest occurrence of one of `doms` at-or-after `from` within the configured
 * quarter month. If `from` is before the target month, returns the first dom of
 * that month. If all doms in that month have passed (or `from` is past the target
 * month), returns the first dom in the same-offset month of the next quarter.
 *
 * `quarterPeriodStart` is the first day of the current quarter.
 * `monthOfQuarter` is 0/1/2 (which month within the quarter).
 */
export function nextOccurrenceInQuarterlyTarget(
    doms: number[],
    from: Date,
    quarterPeriodStart: Date,
    monthOfQuarter: number,
): Date {
    const sorted = [...doms].sort((a, b) => a - b);
    const qStart = new Date(quarterPeriodStart);
    const targetDate = new Date(qStart.getFullYear(), qStart.getMonth() + monthOfQuarter, 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();

    // Before target month — return first dom of target month.
    if (startOfDay(from) < targetDate) {
        const firstDom = sorted.find(d => d <= lastDay) ?? 1;
        return new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.min(firstDom, lastDay));
    }

    // In target month — return next dom at-or-after from.
    if (from.getMonth() === targetDate.getMonth() && from.getFullYear() === targetDate.getFullYear()) {
        const fromDom = from.getDate();
        const nextDom = sorted.find(d => d >= fromDom && d <= lastDay);
        if (nextDom !== undefined) {
            return new Date(targetDate.getFullYear(), targetDate.getMonth(), nextDom);
        }
    }

    // Past target month (or no dom found in it) — advance to next quarter's target.
    const nextTarget = new Date(targetDate.getFullYear(), targetDate.getMonth() + 3, 1);
    const lastDayNext = new Date(nextTarget.getFullYear(), nextTarget.getMonth() + 1, 0).getDate();
    const firstDomNext = sorted.find(d => d <= lastDayNext) ?? 1;
    return new Date(nextTarget.getFullYear(), nextTarget.getMonth(), Math.min(firstDomNext, lastDayNext));
}

/**
 * Earliest date >= `from` whose day-of-month is any of the values in `doms`.
 * If `from`'s day-of-month is already in `doms`, returns `from` (start-of-day).
 * If `doms` is empty, returns `from`.
 * Clamps each candidate to the actual last day of its month.
 */
export function nextOccurrenceOfSelectedDoms(from: Date, doms: number[]): Date {
    if (doms.length === 0) return startOfDay(new Date(from));
    const r = startOfDay(new Date(from));
    const sorted = [...doms].sort((a, b) => a - b);
    const fromDom = r.getDate();
    // Check remaining selected days in this month (including today).
    for (const dom of sorted) {
        if (dom >= fromDom) {
            const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
            if (dom <= lastDay) {
                return new Date(r.getFullYear(), r.getMonth(), dom);
            }
        }
    }
    // Nothing left this month — advance to next month.
    const nextMonth = new Date(r.getFullYear(), r.getMonth() + 1, 1);
    const lastDayNext = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const firstDom = sorted.find(d => d <= lastDayNext) ?? sorted[0]!;
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(firstDom, lastDayNext));
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
    if (ordinal === 5) {
        // The 5th occurrence only exists in some months. Search forward from
        // the given month until we find one that has a 5th occurrence.
        for (let delta = 0; delta < 12; delta++) {
            const targetYear = year + Math.floor((month + delta) / 12);
            const targetMonth = (month + delta) % 12;
            const first = new Date(targetYear, targetMonth, 1);
            const offset = (dow - first.getDay() + 7) % 7;
            const day = 1 + offset + 4 * 7;
            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            if (day <= daysInMonth) return new Date(targetYear, targetMonth, day);
        }
        // Unreachable: every 7-month span has at least one 5th occurrence.
        return new Date(year, month, 1);
    }
    const first = new Date(year, month, 1);
    const offset = (dow - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (ordinal - 1) * 7);
}

// ── Skip-days helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the given date falls on a day that this daily task skips.
 * Only applies to daily / multiple_per_day cadences.
 */
export function isSkipDay(task: Task, date: Date): boolean {
    const skipDays = task.recurrence?.skipDays;
    if (!skipDays || skipDays.length === 0) return false;
    const cadence = task.recurrence?.cadence;
    if (cadence !== 'daily' && cadence !== 'multiple_per_day') return false;
    return skipDays.includes(date.getDay());
}

/**
 * Advance `date` forward until it lands on a day not in `skipDays`.
 * Returns `date` unchanged if `skipDays` is absent/empty or the date is already valid.
 * Guards against an infinite loop: if all 7 days are skipped, returns the original date.
 */
function skipForwardOverSkipDays(date: Date, skipDays: number[] | undefined): Date {
    if (!skipDays || skipDays.length === 0 || skipDays.length >= 7) return date;
    const r = startOfDay(new Date(date));
    let guard = 0;
    while (skipDays.includes(r.getDay()) && guard < 7) {
        r.setDate(r.getDate() + 1);
        guard++;
    }
    return r;
}

function addCadenceLength(d: Date, cadence: RecurrenceCadence): Date {
    const r = new Date(d);
    switch (cadence) {
        case 'daily':
        case 'multiple_per_day':
            r.setDate(r.getDate() + 1);
            return r;
        case 'weekly':
            r.setDate(r.getDate() + 7);
            return r;
        case 'monthly':
            r.setMonth(r.getMonth() + 1);
            return r;
        case 'quarterly':
            r.setMonth(r.getMonth() + 3);
            return r;
        case 'annually':
            r.setFullYear(r.getFullYear() + 1);
            return r;
    }
}
