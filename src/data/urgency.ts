// ─────────────────────────────────────────────────────────────────────────────
// Urgency engine — pure functions.
// Decides which daily-band a task belongs to, given today's date.
// Algorithm follows HANDOFF.md §2B exactly. See that doc for design rationale.
// ─────────────────────────────────────────────────────────────────────────────

import type {ConsequenceTier, DailyBand, Task} from './types.js';
import {daysBetween, isCurrentlyPaused, isCurrentlySnoozed, startOfDay} from './storage.js';
import {isMultiplePerPeriod} from './recurrence.js';

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
    // Not started yet — hide until startDate arrives.
    if (task.recurrence?.startDate !== undefined
        && startOfDay(today).getTime() < task.recurrence.startDate) return 'hidden';

    // Step 1 — Hard overdue / due today
    const step1 = step1HardMandatory(task, today);

    // Step 2 — Timing band (only if step 1 didn't already pin it MANDATORY)
    const timing = step1 === 'mandatory' ? 'mandatory' : step2Timing(task, today);

    // Step 3 — Snooze escalation band
    const snooze = step3Snooze(task);

    // Step 4 — Final = max(timing, snooze)
    return maxBand(timing, snooze);
}

// ── Step 0 helpers ──────────────────────────────────────────────────────────

function isCompletedForPeriod(task: Task, today: Date): boolean {
    if (isMultiplePerPeriod(task)) {
        const target = task.recurrence!.frequencyPerPeriod;
        return task.completionsThisPeriod >= target;
    }
    // After completing a single-occurrence recurring task, advanceRecurrence
    // sets completedAt = null and advances currentPeriodStart to the next
    // period. If currentPeriodStart is beyond today, the task is done for
    // the current period even though completedAt is null.
    if (task.recurrence && task.currentPeriodStart !== null) {
        return task.currentPeriodStart > startOfDay(today).getTime();
    }
    return task.completedAt !== null;
}

// ── Step 1: hard mandatory cases ────────────────────────────────────────────

function step1HardMandatory(task: Task, today: Date): DailyBand | 'unresolved' {
    const cadence = task.recurrence?.cadence;
    if (cadence === 'daily' || cadence === 'multiple_per_day') {
        return 'mandatory';
    }

    // Weekly task with specific committed days: today being one of those days
    // means the commitment is due today — mandatory, not merely suggested.
    if ((cadence === 'weekly' || cadence === 'multiple_per_week')
            && task.recurrence?.hardDaysOfWeek?.includes(today.getDay())) {
        return 'mandatory';
    }

    // Hard-date task whose date has arrived.
    if (task.windowType === 'hard' && task.suggestedDate !== null) {
        if (daysBetween(today, task.suggestedDate) <= 0) return 'mandatory';
    }

    // Flexible window whose deadline has arrived.
    if (task.windowType === 'flexible' && task.windowDeadline !== null) {
        if (daysBetween(today, task.windowDeadline) <= 0) return 'mandatory';
    }

    return 'unresolved';
}

// ── Step 2: timing band ─────────────────────────────────────────────────────

function step2Timing(task: Task, today: Date): DailyBand {
    if (isMultiplePerPeriod(task)) {
        return step2MultiplePerPeriod(task, today);
    }
    if (task.windowType === 'hard') {
        return step2HardDate(task, today);
    }
    if (task.windowType === 'milestone') {
        return step2Milestone(task, today);
    }
    return step2FlexibleWindow(task, today);
}

function step2HardDate(task: Task, today: Date): DailyBand {
    if (task.suggestedDate === null) return 'backlog';
    const days = daysBetween(today, task.suggestedDate);
    if (days <= 0) return 'mandatory'; // safety net (Step 1 should catch this)

    // leadTimeDays takes precedence over deprecated radarLeadDays.
    // null = hidden until due day; number = radar window size.
    const hasLeadTime = 'leadTimeDays' in task && task.leadTimeDays !== undefined;
    const lead: number | null = hasLeadTime
        ? (task.leadTimeDays ?? null)
        : (task.radarLeadDays ?? 3);

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
    // Progress logged today → hide for the rest of the day so it doesn't nag.
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

