// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for BCR (Bureau of Civic Responsibility)
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type AppView = 'daily' | 'operations' | 'project';
export type Character = 'director' | 'agent';

export const SCHEMA_VERSION = 2;

// ── Project ──────────────────────────────────────────────────────────────────

export interface Project {
    id: string;
    name: string;
    description: string;
    colorKey: ProjectColor;
    createdAt: number; // unix timestamp ms
}

export type ProjectColor = 'red' | 'navy' | 'gold' | 'olive' | 'slate';

// ── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceCadence =
    | 'multiple_per_day'
    | 'daily'
    | 'multiple_per_week'
    | 'weekly'
    | 'multiple_per_month'
    | 'monthly'
    | 'multiple_per_quarter'
    | 'quarterly'
    | 'multiple_per_year'
    | 'yearly';

export type ScheduleMode =
    | 'fixed'    // next due anchored to calendar position (1st of month, every Wed)
    | 'rolling'; // next due = completion date + cadence length

export type WindowType =
    | 'hard'      // must happen on suggestedDate specifically (trash day)
    | 'flexible'  // can happen any day within the window
    | 'milestone'; // long-horizon task; track incremental progress until truly done

export interface RecurrenceConfig {
    cadence: RecurrenceCadence;
    /** 1 for standard cadences, N for multiple_per_X cadences. */
    frequencyPerPeriod: number;
    scheduleMode: ScheduleMode;
    /**
     * Anchor day-of-week for weekly cadence, or — combined with `ordinalWeek` —
     * for monthly cadence. 0 = Sunday … 6 = Saturday.
     */
    hardDayOfWeek?: number;
    /** Anchor day-of-month for monthly cadence (1–31, clamped to month length). */
    hardDayOfMonth?: number;
    /**
     * For monthly cadence with `hardDayOfWeek` set: which occurrence of that
     * weekday in the month. 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th, -1 = last.
     */
    ordinalWeek?: 1 | 2 | 3 | 4 | -1;
}

// ── Consequence and band types ───────────────────────────────────────────────

/**
 * 1 = Hard consequence (cat food — she will die)
 * 2 = Soft consequence (water softener — degrades over time)
 * 3 = Quality consequence (lawn — neighbors notice)
 * 4 = Aspirational/identity (bookbinding — I'm just not a bookbinder)
 */
export type ConsequenceTier = 1 | 2 | 3 | 4;

export type DailyBand = 'mandatory' | 'suggested' | 'radar' | 'backlog' | 'hidden';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'anytime';

export const TIME_OF_DAY_SLOTS: ReadonlyArray<TimeOfDay> = [
    'morning', 'afternoon', 'evening', 'bedtime', 'anytime',
];

export const TIME_OF_DAY_ORDER: Record<TimeOfDay, number> = {
    morning: 0, afternoon: 1, evening: 2, bedtime: 3, anytime: 4,
};

export function timeOfDayLabel(t: TimeOfDay): string {
    switch (t) {
        case 'morning':   return 'Morning';
        case 'afternoon': return 'Afternoon';
        case 'evening':   return 'Evening';
        case 'bedtime':   return 'Bedtime';
        case 'anytime':   return 'Anytime';
    }
}

// ── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description: string;
    timeOfDay: TimeOfDay;

    // ── Consequence and timing type ──
    consequenceTier: ConsequenceTier;
    windowType: WindowType;

    // ── Timing ──
    /** Target / recommended date (ms). For hard-date tasks this IS the day. */
    suggestedDate: number | null;
    /** Last valid day for window tasks (ms). End of the period. */
    windowDeadline: number | null;
    /** Total days in the current window period (cached for fast urgency math). */
    windowLengthDays: number | null;

    // ── Recurrence ──
    /** null = one-time task. */
    recurrence: RecurrenceConfig | null;
    /** Start of current recurrence period (ms). */
    currentPeriodStart: number | null;
    /** For multiple_per_period cadences: how many done so far this period. */
    completionsThisPeriod: number;

    // ── Milestone progress (only used when windowType === 'milestone') ──
    /** Number of times progress has been logged. */
    progressCount: number;

    // ── Snooze (resets to 0 on completion) ──
    snoozeCount: number;
    snoozedUntil: number | null;

    // ── Completion ──
    /** ms timestamp; null = incomplete for the current period. */
    completedAt: number | null;
    createdAt: number;

    // ── Legacy (Phase 1) — kept for backward compat ──
    /** @deprecated Use consequenceTier. Retained so old data still renders. */
    priority: Priority;
    /** @deprecated Use suggestedDate. Retained so old data still renders. */
    dueDate: number | null;
}

// ── Snooze severity (visual) ─────────────────────────────────────────────────

export const SNOOZE_WARNING = 1;    // yellow
export const SNOOZE_CAUTION = 2;    // orange
export const SNOOZE_DANGER = 4;     // red
export const SNOOZE_CRITICAL = 6;   // deep red, "UNDER REVIEW"

export type SnoozeSeverity = 'none' | 'warning' | 'caution' | 'danger' | 'critical';

export function getSnoozeSeverity(snoozeCount: number): SnoozeSeverity {
    if (snoozeCount === 0) return 'none';
    if (snoozeCount < SNOOZE_CAUTION) return 'warning';
    if (snoozeCount < SNOOZE_DANGER) return 'caution';
    if (snoozeCount < SNOOZE_CRITICAL) return 'danger';
    return 'critical';
}

// ── Cadence helpers ──────────────────────────────────────────────────────────

/** Whether the cadence supports multiple completions per period. */
export function isMultiplePerPeriodCadence(cadence: RecurrenceCadence): boolean {
    return cadence.startsWith('multiple_per_');
}

/** Human-readable label for a cadence (UI). */
export function cadenceLabel(cadence: RecurrenceCadence): string {
    switch (cadence) {
        case 'multiple_per_day':     return 'Multiple times per day';
        case 'daily':                return 'Daily';
        case 'multiple_per_week':    return 'Multiple times per week';
        case 'weekly':               return 'Weekly';
        case 'multiple_per_month':   return 'Multiple times per month';
        case 'monthly':              return 'Monthly';
        case 'multiple_per_quarter': return 'Multiple times per quarter';
        case 'quarterly':            return 'Quarterly';
        case 'multiple_per_year':    return 'Multiple times per year';
        case 'yearly':               return 'Yearly';
    }
}

/** Short cadence period word ("week", "month", etc.) for "1/3 this week" style labels. */
export function cadencePeriodWord(cadence: RecurrenceCadence): string {
    if (cadence === 'multiple_per_day' || cadence === 'daily') return 'day';
    if (cadence === 'multiple_per_week' || cadence === 'weekly') return 'week';
    if (cadence === 'multiple_per_month' || cadence === 'monthly') return 'month';
    if (cadence === 'multiple_per_quarter' || cadence === 'quarterly') return 'quarter';
    return 'year';
}

// ── Consequence tier helpers ─────────────────────────────────────────────────

export function tierLabel(tier: ConsequenceTier): string {
    switch (tier) {
        case 1: return 'Hard consequence';
        case 2: return 'Soft consequence';
        case 3: return 'Quality consequence';
        case 4: return 'Aspirational';
    }
}

export function tierShortLabel(tier: ConsequenceTier): string {
    switch (tier) {
        case 1: return 'TIER I';
        case 2: return 'TIER II';
        case 3: return 'TIER III';
        case 4: return 'TIER IV';
    }
}

export function tierDescription(tier: ConsequenceTier): string {
    switch (tier) {
        case 1: return 'Something bad happens if this slips.';
        case 2: return 'Things degrade over time.';
        case 3: return 'Nothing breaks, but quality drops.';
        case 4: return 'I want to be the kind of person who does this.';
    }
}

// ── Dialogue / app state ─────────────────────────────────────────────────────

export interface DialogueEntry {
    id: string;
    character: Character;
    message: string;
    timestamp: number;
    dismissed: boolean;
}

export interface AppState {
    readonly schemaVersion: number;
    readonly projects: ReadonlyArray<Project>;
    readonly tasks: ReadonlyArray<Task>;
    readonly view: AppView;
    readonly selectedProjectId: string | null;
    readonly patriotScore: number;
    readonly completionStreak: number;
    readonly dialogueQueue: ReadonlyArray<DialogueEntry>;
    readonly lastActiveDate: string; // YYYY-MM-DD
    /** ms timestamp of last dismissal; null = never dismissed (show on first load). */
    readonly reportNoticeDismissedAt: number | null;
}
