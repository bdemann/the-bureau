// ─────────────────────────────────────────────────────────────────────────────
// Urgency engine — pure functions.
// Decides which daily-band a task belongs to, given today's date.
// Algorithm follows HANDOFF.md §2B exactly. See that doc for design rationale.
// ─────────────────────────────────────────────────────────────────────────────

import type {ConsequenceTier, DailyBand, Task} from './types.js';
import {daysBetween, isCurrentlyPaused, isCurrentlySnoozed, startOfDay} from './storage.js';
import {isMultiplePerPeriod, isSkipDay} from './recurrence.js';
import {SKIP_ESCALATION_THRESHOLD} from './scoring.js';

// Order from least to most urgent — used for `maxBand`.
const BAND_RANK: Record<DailyBand, number> = {
    hidden:    0,
    backlog:   1,
    radar:     2,
    suggested: 3,
    mandatory: 4,
};

export function maxBand(a: DailyBand, b: DailyBand): DailyBand {
    return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}

// ── Top-level entry point ───────────────────────────────────────────────────

/**
 * Determine which daily-band a task should appear in for the given "today."
 * Returns 'hidden' if the task should not appear in the daily view at all.
 */
export function getDailyBand(task: Task, today: Date = new Date()): DailyBand {
    // Step 0 — Visibility
    if (isCompletedForPeriod(task, today)) return 'hidden';
    if (isCurrentlySnoozed(task))          return 'hidden';
    if (isCurrentlyPaused(task))           return 'hidden';
    if (task.missedAt !== null)            return 'hidden';
    // Skip day — task is hidden, no miss, no period advance.
    if (isSkipDay(task, today))            return 'hidden';
    // Not started yet — hide until startDate arrives.
    if (task.recurrence?.startDate !== undefined
        && startOfDay(today).getTime() < task.recurrence.startDate) return 'hidden';
    // Milestones hide for the rest of today after any progress — applies even
    // when the deadline has arrived (step 1 mandatory would otherwise skip step 2).
    if (task.isMilestone && task.lastProgressAt != null) {
        if (startOfDay(new Date(task.lastProgressAt)).getTime() === startOfDay(today).getTime()) {
            return 'hidden';
        }
    }

    // Step 1 — Hard overdue / due today
    const step1 = step1HardMandatory(task, today);

    // Step 1.5 — T2 daily-like skip escalation (overrides suggested → mandatory)
    if (step1 === 'unresolved' && task.consequenceTier === 2 && isDailyLike(task)) {
        const threshold = task.skipEscalationThreshold ?? SKIP_ESCALATION_THRESHOLD;
        if (task.skipStreak >= threshold) return 'mandatory';
    }

    // Step 2 — Timing band (only if step 1 didn't already pin it MANDATORY)
    const timing = step1 === 'mandatory' ? 'mandatory' : step2Timing(task, today);

    // 'hidden' from step 2 is a hard gate — snooze cannot surface a task that
    // isn't due yet, has logged progress today, or has met its period quota.
    if (timing === 'hidden') return 'hidden';

    // Step 3 — Snooze escalation band
    const snooze = step3Snooze(task);

    // Step 4 — Final = max(timing, snooze), capped at 'suggested' for T4.
    const final = maxBand(timing, snooze);
    return task.consequenceTier === 4 && final === 'mandatory' ? 'suggested' : final;
}

// ── Step 0 helpers ──────────────────────────────────────────────────────────

function isCompletedForPeriod(task: Task, today: Date): boolean {
    if (isMultiplePerPeriod(task)) {
        const target = task.recurrence!.frequencyPerPeriod;
        return task.completionsThisPeriod >= target;
    }
    if (task.recurrence && task.currentPeriodStart !== null) {
        const todayMs = startOfDay(today).getTime();
        // Standard: period has been advanced past today → done for this period.
        if (task.currentPeriodStart > todayMs) return true;
        // Multi-day weekly tasks: each selected day is its own occurrence.
        // advanceRecurrence sets suggestedDate to the NEXT occurrence day but
        // keeps currentPeriodStart at the current week's Sunday, so the standard
        // check above would always return false within the same week.
        // Use suggestedDate directly: if it's strictly in the future, today's
        // occurrence has already been completed and the next one hasn't arrived.
        const cfg = task.recurrence;
        // Multi-occurrence tasks where the next occurrence lands in the same
        // period: advanceRecurrence keeps currentPeriodStart at the current
        // period's start (≤ today), so check suggestedDate directly instead.
        // Applies to: multi-day weekly, multi-dom monthly, multi-dom quarterly.
        const isMultiOccurrenceWithinPeriod =
            (cfg.cadence === 'weekly' && cfg.hardDaysOfWeek !== undefined && cfg.hardDaysOfWeek.length > 1) ||
            ((cfg.cadence === 'monthly' || cfg.cadence === 'quarterly') && cfg.hardDaysOfMonth !== undefined && cfg.hardDaysOfMonth.length > 1);
        if (isMultiOccurrenceWithinPeriod
                && task.suggestedDate !== null
                && task.suggestedDate > todayMs) {
            return true;
        }
        return false;
    }
    return task.completedAt !== null;
}

// ── Daily-like helper ────────────────────────────────────────────────────────

/**
 * "Daily-like" = daily/multiple_per_day cadence, OR weekly with 2+ committed days.
 * These tasks recur so frequently that they are treated differently from
 * once-a-week commitments: T2/T3/T4 start in suggested rather than mandatory.
 */
function isDailyLike(task: Task): boolean {
    const cadence = task.recurrence?.cadence;
    if (cadence === 'daily' || cadence === 'multiple_per_day') return true;
    if (cadence === 'weekly'
            && task.recurrence?.hardDaysOfWeek !== undefined
            && task.recurrence.hardDaysOfWeek.length >= 2) return true;
    return false;
}

// ── Step 1: hard mandatory cases ────────────────────────────────────────────

function step1HardMandatory(task: Task, today: Date): DailyBand | 'unresolved' {
    // T4 (Aspirational) is never mandatory regardless of timing.
    if (task.consequenceTier === 4) return 'unresolved';

    const cadence = task.recurrence?.cadence;

    // Daily-like cadences: only T1 is mandatory; T2/T3 fall through to step 2.
    if (cadence === 'daily' || cadence === 'multiple_per_day') {
        return task.consequenceTier === 1 ? 'mandatory' : 'unresolved';
    }

    // Weekly task with specific committed days: today being one of those days
    // means the commitment is due today.  Daily-like (2+ days/week) → T1 only;
    // single committed-day weekly → T1 mandatory as before.
    if (cadence === 'weekly' && task.recurrence?.hardDaysOfWeek?.includes(today.getDay())) {
        const isMultiDay = (task.recurrence?.hardDaysOfWeek?.length ?? 0) >= 2;
        if (isMultiDay) {
            return task.consequenceTier === 1 ? 'mandatory' : 'unresolved';
        }
        return 'mandatory';
    }

    // Hard-date task whose date has arrived.
    if (task.deadlineType === 'rigid' && task.suggestedDate !== null) {
        if (daysBetween(today, task.suggestedDate) <= 0) return 'mandatory';
    }

    // Flexible window whose deadline has arrived.
    if (task.deadlineType === 'flexible' && task.windowDeadline !== null) {
        if (daysBetween(today, task.windowDeadline) <= 0) return 'mandatory';
    }

    return 'unresolved';
}

// ── Step 2: timing band ─────────────────────────────────────────────────────

function step2Timing(task: Task, today: Date): DailyBand {
    // Daily-like tasks (T2/T3/T4) that weren't pinned mandatory in step 1
    // belong in suggested — they show up every day and should not loom as mandatory.
    if (isDailyLike(task)) return 'suggested';

    if (isMultiplePerPeriod(task)) {
        return step2MultiplePerPeriod(task, today);
    }
    if (task.deadlineType === 'rigid') {
        return step2HardDate(task, today);
    }
    if (task.isMilestone) {
        return step2Milestone(task, today);
    }
    return step2FlexibleWindow(task, today);
}

function step2HardDate(task: Task, today: Date): DailyBand {
    if (task.suggestedDate === null) return 'backlog';
    const days = daysBetween(today, task.suggestedDate);
    if (days <= 0) return 'mandatory'; // safety net (Step 1 should catch this)

    // null = hidden until due day; number = radar window size; undefined = default 3.
    const hasLeadTime = 'leadTimeDays' in task && task.leadTimeDays !== undefined;
    const lead: number | null = hasLeadTime ? (task.leadTimeDays ?? null) : 3;

    if (lead === null) return 'hidden'; // no lead time → invisible until mandatory
    if (days <= lead) return 'radar';
    return 'backlog';
}

function step2FlexibleWindow(task: Task, today: Date): DailyBand {
    const tier = task.consequenceTier;
    const todayMs = startOfDay(today).getTime();

    // No suggested or deadline at all — can't compute window urgency.
    if (task.suggestedDate === null && task.windowDeadline === null) {
        return 'backlog';
    }

    // leadTimeDays === null → hidden until suggestedDate arrives.
    if (task.leadTimeDays === null) {
        if (task.suggestedDate !== null && task.suggestedDate > todayMs) return 'hidden';
        // No suggestedDate but has deadline: hide until the last 25% of window.
        if (task.suggestedDate === null && task.windowDeadline !== null && task.windowLengthDays !== null) {
            const daysUntilDeadline = daysBetween(today, task.windowDeadline);
            if (daysUntilDeadline / task.windowLengthDays > 0.25) return 'hidden';
        }
    }

    // leadTimeDays as a number → hide until that many days before suggestedDate.
    if (typeof task.leadTimeDays === 'number' && task.suggestedDate !== null) {
        const daysToSuggested = daysBetween(today, task.suggestedDate);
        if (daysToSuggested > task.leadTimeDays) return 'hidden';
    }

    // Past suggested date but inside window → SUGGESTED.
    if (task.suggestedDate !== null && task.suggestedDate <= todayMs) {
        // Could still be RADAR if we want to escalate further, but per spec,
        // suggested-date-arrived means SUGGESTED. Snooze step can lift higher.
        return 'suggested';
    }

    // Window urgency by % remaining.
    if (task.windowDeadline !== null && task.windowLengthDays !== null && task.windowLengthDays > 0) {
        const daysUntilDeadline = daysBetween(today, task.windowDeadline);
        const pctRemaining = daysUntilDeadline / task.windowLengthDays;
        if (pctRemaining <= 0.25) return 'radar';
        if (pctRemaining <= 0.5 && tier <= 2) return 'radar';
    }
    return 'backlog';
}

function step2Milestone(task: Task, today: Date): DailyBand {
    // Progress-cadence mode: hide when this period's quota is met.
    if (task.progressCadence != null) {
        const completions = task.progressCompletionsThisPeriod ?? 0;
        if (completions >= task.progressCadence.frequencyPerPeriod) return 'hidden';
    }

    // Hide for the rest of today after any progress (both cadence modes).
    if (task.lastProgressAt != null) {
        const progressDay = startOfDay(new Date(task.lastProgressAt)).getTime();
        const todayDay    = startOfDay(today).getTime();
        if (progressDay === todayDay) return 'hidden';
    }

    // No deadline set — stays in backlog until snooze escalation lifts it.
    if (task.windowDeadline === null) {
        // leadTimeDays === null with no deadline → hidden until manually surfaced.
        if (task.leadTimeDays === null) return 'hidden';
        return 'backlog';
    }

    const daysLeft = daysBetween(today, task.windowDeadline);
    if (daysLeft <= 0) return 'mandatory';

    // leadTimeDays === null → hidden until deadline is imminent (radar threshold).
    if (task.leadTimeDays === null) {
        if (daysLeft <= 30) return 'radar';
        return 'hidden';
    }

    // leadTimeDays as a number → hide until that many days before deadline.
    if (typeof task.leadTimeDays === 'number') {
        if (daysLeft > task.leadTimeDays) return 'hidden';
    }

    if (daysLeft <= 30) return 'radar';
    if (daysLeft <= 90) return 'backlog';
    return 'backlog';
}

function step2MultiplePerPeriod(task: Task, today: Date): DailyBand {
    if (!task.recurrence) return 'backlog';
    const target = task.recurrence.frequencyPerPeriod;
    const remaining = target - task.completionsThisPeriod;
    if (remaining <= 0) return 'hidden'; // covered by Step 0, defensive

    if (task.windowDeadline === null) return 'backlog';
    const daysLeft = daysBetween(today, task.windowDeadline);
    if (daysLeft <= 0) return 'mandatory';

    const ratio = remaining / daysLeft;
    if (ratio > 1.5) return 'mandatory';
    if (ratio > 0.8) return 'suggested';
    if (ratio > 0.3) return 'radar';
    return 'backlog';
}

// ── Step 3: snooze escalation ───────────────────────────────────────────────

function step3Snooze(task: Task): DailyBand {
    return getSnoozeBand(task.consequenceTier, task.snoozeCount);
}

export function getSnoozeBand(tier: ConsequenceTier, snoozeCount: number): DailyBand {
    if (snoozeCount <= 0) return 'backlog';
    switch (tier) {
        case 1:
            if (snoozeCount >= 5) return 'mandatory';
            if (snoozeCount >= 3) return 'suggested';
            if (snoozeCount >= 1) return 'radar';
            return 'backlog';
        case 2:
            if (snoozeCount >= 8) return 'mandatory';
            if (snoozeCount >= 5) return 'suggested';
            if (snoozeCount >= 2) return 'radar';
            return 'backlog';
        case 3:
            if (snoozeCount >= 15) return 'suggested';
            if (snoozeCount >= 5) return 'radar';
            return 'backlog';
        case 4:
            return 'backlog';
    }
}

// ── Public helpers used by UI / tests ───────────────────────────────────────

/**
 * Returns true when the task's next scheduled occurrence is tomorrow, meaning
 * a +24 h snooze would bring it back on the next committed day anyway —
 * making the snooze pointless.
 *
 * Two cases:
 *  1. Multi-day weekly task (`hardDaysOfWeek` with 2+ days): tomorrow's
 *     day-of-week is one of the committed days.
 *  2. Any task whose `suggestedDate` lands exactly on tomorrow midnight
 *     (daily except Sunday, hard-date tasks one day out, etc.).
 *
 * Used by both the UI (`canSnooze` logic) and the app handler (`onTaskSnoozed`
 * guard) so the check is authoritative in one place.
 */
export function isNextOccurrenceTomorrow(task: Task, today: Date = new Date()): boolean {
    const tomorrowMs = startOfDay(today).getTime() + 86_400_000; // tomorrow midnight

    // Multi-day weekly: if tomorrow is a committed day, snooze is futile.
    const cfg = task.recurrence;
    if (cfg
            && (cfg.cadence === 'weekly')
            && cfg.hardDaysOfWeek !== undefined
            && cfg.hardDaysOfWeek.length > 1) {
        const tomorrowDow = new Date(tomorrowMs).getDay();
        return cfg.hardDaysOfWeek.includes(tomorrowDow);
    }

    // General: suggestedDate is tomorrow — snooze would just bring it back.
    return task.suggestedDate !== null && task.suggestedDate === tomorrowMs;
}

