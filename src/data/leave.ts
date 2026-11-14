// ─────────────────────────────────────────────────────────────────────────────
// Authorized Leave (GitHub #60) — pure helpers.
//
// Leave is an app-level state: while it is active every commitment is treated
// as paused (see `isCurrentlyPaused`), and no commitment is ever written to.
// All days are app-day strings (`YYYY-MM-DD`, from `getAppDayString`), so the
// day-reset hour is already respected by whoever supplies "today".
// ─────────────────────────────────────────────────────────────────────────────

import type {Task} from './types.js';

/** An inclusive span of leave days. */
export interface LeaveSpan {
    readonly start: string;
    readonly end: string;
}

/** What rollover needs to know about leave. */
export interface LeaveContext {
    /** True while leave is active today. */
    readonly active: boolean;
    /** Leave spans (past and current), used to forgive periods that ended during leave. */
    readonly spans: ReadonlyArray<LeaveSpan>;
}

export const NO_LEAVE: LeaveContext = {active: false, spans: []};

export const LEAVE_PRESETS_DAYS: ReadonlyArray<number> = [3, 7];
export const LEAVE_MAX_DAYS = 7;
export const LEAVE_WINDOW_DAYS = 90;
export const LEAVE_WINDOW_ALLOWANCE_DAYS = 14;

// ── Day-string arithmetic (UTC, so DST can never shift a date) ──────────────

function dayToUtcMs(day: string): number {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!);
}

export function addDays(day: string, n: number): string {
    return new Date(dayToUtcMs(day) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b − a). */
export function dayDiff(a: string, b: string): number {
    return Math.round((dayToUtcMs(b) - dayToUtcMs(a)) / 86_400_000);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Leave is active on `today` when `leaveUntil` (the last leave day) is today or later. */
export function isOnLeave(leaveUntil: string | null | undefined, today: string): boolean {
    return !!leaveUntil && today <= leaveUntil;
}

/**
 * Leave days used in the rolling 90-day window ending on `today`. A leave
 * still running counts its full planned length, so the allowance is already
 * committed while it is active.
 */
export function leaveDaysUsed(history: ReadonlyArray<LeaveSpan>, today: string): number {
    const windowStart = addDays(today, -(LEAVE_WINDOW_DAYS - 1));
    let used = 0;
    for (const span of history) {
        const from = span.start > windowStart ? span.start : windowStart;
        used += span.end < from ? 0 : dayDiff(from, span.end) + 1;
    }
    return used;
}

/** Days still available in the rolling 90-day window (never negative). */
export function leaveDaysRemaining(history: ReadonlyArray<LeaveSpan>, today: string): number {
    return Math.max(0, LEAVE_WINDOW_ALLOWANCE_DAYS - leaveDaysUsed(history, today));
}

/** The longest leave that can start today, given the per-leave and rolling limits. */
export function maxLeaveDaysAvailable(history: ReadonlyArray<LeaveSpan>, today: string): number {
    return Math.min(LEAVE_MAX_DAYS, leaveDaysRemaining(history, today));
}

/** Whether a leave of `days` can be taken starting today. */
export function isPresetAvailable(
    days: number,
    history: ReadonlyArray<LeaveSpan>,
    today: string,
): boolean {
    return days >= 1 && days <= maxLeaveDaysAvailable(history, today);
}

/** The last leave day for a leave of `days` starting today. */
export function leaveLastDay(today: string, days: number): string {
    return addDays(today, days - 1);
}

/** The first day back for a leave of `days` starting today. */
export function leaveReturnDay(today: string, days: number): string {
    return addDays(today, days);
}

// ── Transitions ──────────────────────────────────────────────────────────────

export interface LeaveFields {
    readonly leaveUntil: string | null;
    readonly leaveHistory: ReadonlyArray<LeaveSpan>;
}

/** Drop spans that ended before the rolling window began. */
export function pruneLeaveHistory(
    history: ReadonlyArray<LeaveSpan>,
    today: string,
): LeaveSpan[] {
    const windowStart = addDays(today, -(LEAVE_WINDOW_DAYS - 1));
    return history.filter((s) => s.end >= windowStart);
}

/**
 * Begin a leave of `days` starting today. Returns null when not allowed:
 * already on leave, more than 7 days, or more than the rolling allowance left.
 * There is no way to start in the past or the future.
 */
export function startLeave(fields: LeaveFields, days: number, today: string): LeaveFields | null {
    if (isOnLeave(fields.leaveUntil, today)) return null;
    const history = pruneLeaveHistory(fields.leaveHistory, today);
    if (!isPresetAvailable(days, history, today)) return null;
    const end = leaveLastDay(today, days);
    return {leaveUntil: end, leaveHistory: [...history, {start: today, end}]};
}

/**
 * End leave now. The leave then covers only the days before today, so only
 * days actually taken count; one that began today is removed entirely.
 */
export function endLeaveNow(fields: LeaveFields, today: string): LeaveFields {
    if (!isOnLeave(fields.leaveUntil, today)) return {...fields, leaveUntil: null};
    const plannedEnd = fields.leaveUntil!;
    const yesterday = addDays(today, -1);
    const history: LeaveSpan[] = [];
    for (const span of fields.leaveHistory) {
        if (span.end !== plannedEnd || span.start > today) {
            history.push(span);
            continue;
        }
        if (span.start <= yesterday) history.push({start: span.start, end: yesterday});
    }
    return {leaveUntil: null, leaveHistory: history};
}

/** Startup normalisation: clear an expired `leaveUntil` and prune old history. */
export function normalizeLeave(fields: LeaveFields, today: string): LeaveFields {
    return {
        leaveUntil: isOnLeave(fields.leaveUntil, today) ? fields.leaveUntil : null,
        leaveHistory: pruneLeaveHistory(fields.leaveHistory, today),
    };
}

/** The rollover context for `today`. */
export function leaveContextFor(fields: LeaveFields, today: string): LeaveContext {
    return {active: isOnLeave(fields.leaveUntil, today), spans: fields.leaveHistory};
}

/** True when `day` falls inside any leave span. */
export function isDayOnLeave(spans: ReadonlyArray<LeaveSpan>, day: string): boolean {
    return spans.some((s) => day >= s.start && day <= s.end);
}

/** True when every day strictly between `from` and `to` is on leave (and there is at least one). */
export function gapCoveredByLeave(
    spans: ReadonlyArray<LeaveSpan>,
    from: string,
    to: string,
): boolean {
    const missing = dayDiff(from, to) - 1;
    if (missing < 1) return false;
    for (let i = 1; i <= missing; i++) {
        if (!isDayOnLeave(spans, addDays(from, i))) return false;
    }
    return true;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a day for display, e.g. "Jun 12". */
export function formatLeaveDay(day: string): string {
    const [, m, d] = day.split('-').map(Number);
    return `${MONTHS[m! - 1]} ${d}`;
}

/**
 * Display-only projection: while on leave, every commitment is shown as paused
 * (in memory only; nothing is persisted and handlers keep using stored state).
 */
export function tasksForDisplay<T extends Task>(tasks: ReadonlyArray<T>, onLeave: boolean): ReadonlyArray<T> {
    if (!onLeave) return tasks;
    return tasks.map((t) => ({...t, pausedIndefinitely: true}));
}
