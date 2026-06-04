// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for BCR (Bureau of Civic Responsibility)
// ─────────────────────────────────────────────────────────────────────────────

export type ItemKind = "routine" | "task";
export type CommitmentKind = "routine" | "task" | "goal" | "idea";
export type FormKind = "routine" | "task" | "goal" | "idea";
export type AppView =
    | "daily"
    | "areas"
    | "area"
    | "insights"
    | "ideas"
    | "goals"
    | "all-tasks"
    | "all-routines"
    | "all-commitments"
    | "unlinked";
export type Character = "director" | "agent";

export const SCHEMA_VERSION = 3;

// ── Goal ─────────────────────────────────────────────────────────────────────

export type GoalStatus = "active" | "achieved" | "abandoned";

export interface Goal {
    kind: "goal";
    id: string;
    /** The area this goal belongs to. */
    areaId: string | null;
    /** Parent goal (for sub-goals). null = top-level. */
    goalId: string | null;
    title: string;
    description: string;
    status: GoalStatus;
    /** ms timestamp (midnight local); null = no deadline. */
    targetDate: number | null;
    createdAt: number;
}

// ── Idea ─────────────────────────────────────────────────────────────────────

export interface Idea {
    kind: "idea";
    id: string;
    title: string;
    description: string;
    /** The area this idea belongs to. */
    areaId: string | null;
    /** The goal this idea is fleshing out (optional). */
    goalId: string | null;
    createdAt: number;
}

// ── Area ─────────────────────────────────────────────────────────────────────

export interface Area {
    id: string;
    name: string;
    description: string;
    colorKey: AreaColor;
    createdAt: number; // unix timestamp ms
}

export type AreaColor = "red" | "navy" | "gold" | "olive" | "slate";

// ── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceCadence =
    | "multiple_per_day" // legacy — will be replaced by time-slot selection (see issue #1)
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "yearly";

export type ScheduleMode =
    | "fixed" // next due anchored to calendar position (1st of month, every Wed)
    | "rolling"; // next due = completion date + cadence length

export type WindowType =
    | "hard" // must happen on suggestedDate specifically (trash day)
    | "flexible" // can happen any day within the window
    | "milestone"; // long-horizon task; track incremental progress until truly done

/**
 * How often the user intends to make progress on a milestone within a period.
 * Simpler than RecurrenceConfig — no schedule mode, anchor days, or end conditions.
 */
export interface MilestoneProgressCadence {
    cadence: RecurrenceCadence;
    frequencyPerPeriod: number;
}

export type RecurrenceEndMode = "never" | "after_count" | "after_date";

export interface RecurrenceConfig {
    cadence: RecurrenceCadence;
    /** 1 for standard cadences, N for multiple_per_X cadences. */
    frequencyPerPeriod: number;
    scheduleMode: ScheduleMode;
    /**
     * Selected days of the week for weekly cadence (multi-select).
     * 0 = Sunday … 6 = Saturday. Replaces the deprecated hardDayOfWeek for weekly tasks.
     */
    hardDaysOfWeek?: number[];
    /**
     * @deprecated Use hardDaysOfWeek for weekly cadence. Still used for monthly ordinal
     * (combined with ordinalWeek). 0 = Sunday … 6 = Saturday.
     */
    hardDayOfWeek?: number;
    /** Anchor day-of-month for monthly cadence (1–31, clamped to month length). */
    hardDayOfMonth?: number;
    /**
     * For quarterly cadence: which month within the quarter the task fires in.
     * 0 = first month of quarter (Jan/Apr/Jul/Oct),
     * 1 = second month (Feb/May/Aug/Nov),
     * 2 = third month (Mar/Jun/Sep/Dec).
     * When absent, falls back to the month-within-quarter of suggestedDate.
     * Combined with hardDayOfMonth or hardDaysOfMonth for the day(s).
     */
    hardMonthOfQuarter?: 0 | 1 | 2;
    /**
     * Multi-select days-of-month for monthly cadence (each value 1–31).
     * When set, the task cycles through these days in order within each month,
     * advancing to the next selected day after each completion (wrapping to the
     * first day of the following month when the last selected day passes).
     * Supersedes hardDayOfMonth when present.
     */
    hardDaysOfMonth?: number[];
    /**
     * For monthly cadence with `hardDayOfWeek` set: which occurrence of that
     * weekday in the month. 1 = 1st, 2 = 2nd, 3 = 3rd, 4 = 4th, 5 = 5th (when
     * it exists — months without a 5th occurrence are skipped), -1 = last.
     */
    ordinalWeek?: 1 | 2 | 3 | 4 | 5 | -1;
    /** When the recurrence should stop. Defaults to 'never'. */
    endMode: RecurrenceEndMode;
    /** Required when endMode === 'after_count'. Total lifetime completions after which the task ends. */
    endAfterCount?: number;
    /** Required when endMode === 'after_date'. ms timestamp (midnight local) of the last day. */
    endAfterDate?: number;
    /**
     * Optional ms timestamp (midnight local). The directive is invisible and
     * does not advance until this date arrives. Useful for scheduling future
     * routines (e.g., add a Christmas tradition in October, starts December 1).
     */
    startDate?: number;
    /**
     * For yearly cadence: which month (0=Jan … 11=Dec) the task fires in.
     * When absent, falls back to the month of suggestedDate.
     */
    hardMonthOfYear?: number;
    /**
     * Days of the week to skip for daily / multiple_per_day cadences (0=Sun … 6=Sat).
     * On a skip day the task is hidden, the period does not advance, and no miss is
     * counted — equivalent to the day not existing in the schedule.
     */
    skipDays?: number[];
    /**
     * Shift applied after computing an ordinal weekday date (monthly/yearly cadences).
     * Negative = days before the anchor; positive = days after.
     * 0 or absent = on the anchor day itself.
     *
     * Examples:
     *   ordinalWeek: 3, hardDayOfWeek: 1, ordinalOffset: -1  → Sunday before 3rd Monday
     *   ordinalWeek: 4, hardDayOfWeek: 4, ordinalOffset: -2  → Tuesday before Thanksgiving
     */
    ordinalOffset?: number;
}

// ── Consequence and band types ───────────────────────────────────────────────

/**
 * 1 = Hard consequence (cat food — she will die)
 * 2 = Soft consequence (water softener — degrades over time)
 * 3 = Quality consequence (lawn — neighbors notice)
 * 4 = Aspirational/identity (bookbinding — I'm just not a bookbinder)
 */
export type ConsequenceTier = 1 | 2 | 3 | 4;

export type DailyBand =
    | "mandatory"
    | "suggested"
    | "radar"
    | "backlog"
    | "hidden";

export type TimeOfDay =
    | "morning"
    | "afternoon"
    | "evening"
    | "bedtime"
    | "anytime";

export const TIME_OF_DAY_SLOTS: ReadonlyArray<TimeOfDay> = [
    "morning",
    "afternoon",
    "evening",
    "bedtime",
    "anytime",
];

export const TIME_OF_DAY_ORDER: Record<TimeOfDay, number> = {
    morning: 0,
    afternoon: 1,
    evening: 2,
    bedtime: 3,
    anytime: 4,
};

export function timeOfDayLabel(t: TimeOfDay): string {
    switch (t) {
        case "morning":
            return "Morning";
        case "afternoon":
            return "Afternoon";
        case "evening":
            return "Evening";
        case "bedtime":
            return "Bedtime";
        case "anytime":
            return "Anytime";
    }
}

// ── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
    id: string;
    areaId: string | null;
    title: string;
    description: string;
    timeOfDay: TimeOfDay;
    kind: ItemKind;

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
    /** Lifetime completion count across all periods (used for after_count end mode). */
    totalCompletions: number;

    // ── Milestone progress (only used when windowType === 'milestone') ──
    /** Number of times progress has been logged (lifetime). */
    progressCount: number;
    /**
     * ms timestamp of the last time progress was logged. Used to hide the
     * milestone from the daily view for the rest of the day after progress is
     * recorded, so it doesn't nag again until tomorrow.
     * null = no progress yet (or never used this feature).
     */
    lastProgressAt?: number | null;
    /**
     * How often the user wants to make progress on this milestone per period.
     * null / undefined = legacy behaviour (hide for the rest of today after any progress).
     */
    progressCadence?: MilestoneProgressCadence | null;
    /** How many times progress has been logged in the current progress period. */
    progressCompletionsThisPeriod?: number;
    /** Start of the current progress period (ms). null = no period started yet. */
    currentProgressPeriodStart?: number | null;

    // ── Lead time ────────────────────────────────────────────────────────────
    /**
     * How many days before suggestedDate (or window deadline) this directive
     * becomes visible in the daily view at all. Applies to all window types.
     *
     *   undefined → system default (hard-date: 3 days; flexible/milestone: window %)
     *   null      → hidden until mandatory/due; never appears in backlog or radar
     *   number    → task surfaces this many days before suggestedDate / deadline
     */
    leadTimeDays?: number | null;

    // ── Pause (deliberate suspension — no score/streak impact) ──
    /**
     * When set, the directive is hidden from the daily view and rollover does
     * not count misses. null = not paused. Unlike snooze, pause is intentional
     * and does not penalize the patriot score.
     *
     * Use Infinity (serialized as null in JSON — stored alongside
     * pausedIndefinitely flag) or a future ms timestamp.
     */
    pausedUntil: number | null;
    /** True when the directive is paused with no end date. */
    pausedIndefinitely: boolean;

    // ── Snooze (resets to 0 on completion) ──
    snoozeCount: number;
    snoozedUntil: number | null;

    // ── Lifetime insight counters ──
    totalSnoozes: number;
    totalSkips: number;
    totalMisses: number;
    /** ms timestamp when a one-time hard-date task's date passed unaddressed. null = not missed. */
    missedAt: number | null;
    /** Consecutive periods completed without a miss or skip (per-task streak). */
    taskCompletionStreak: number;
    /** Highest ever taskCompletionStreak for this task. */
    maxTaskCompletionStreak: number;
    /** Consecutive periods skipped (advanced without completion). */
    skipStreak: number;
    /**
     * Consecutive skips before this T2 daily/daily-like task escalates to mandatory.
     * undefined = use SKIP_ESCALATION_THRESHOLD default.
     */
    skipEscalationThreshold?: number;

    // ── Remediation ──
    /**
     * Number of consecutive completions still needed before the skip/snooze
     * streak is forgiven.  Set to max(skipStreak, snoozeCount) on the first
     * completion after a streak; decremented by each subsequent completion;
     * reset to 0 when cleared.  If the task is skipped/snoozed again while
     * remediationCount > 0, the new streak starts at remediationCount rather
     * than 1.
     */
    remediationCount: number;

    // ── Completion ──
    /** ms timestamp; null = incomplete for the current period. */
    completedAt: number | null;
    createdAt: number;

    /** Goal this commitment is contributing to. null = not linked to a goal. */
    goalId?: string | null;

    // ── Legacy (Phase 1) — kept for backward compat ──
    /** @deprecated Use suggestedDate. Retained so old data still renders. */
    dueDate: number | null;
}

// ── Unified commitment type ───────────────────────────────────────────────────

/** Discriminated union of all four commitment types. */
export type AnyCommitment = Task | Goal | Idea;

// ── Snooze severity (visual) ─────────────────────────────────────────────────

export const SNOOZE_WARNING = 1; // yellow
export const SNOOZE_CAUTION = 2; // orange
export const SNOOZE_DANGER = 4; // red
export const SNOOZE_CRITICAL = 6; // deep red, "UNDER REVIEW"

export type SnoozeSeverity =
    | "none"
    | "warning"
    | "caution"
    | "danger"
    | "critical";

export function getSnoozeSeverity(snoozeCount: number): SnoozeSeverity {
    if (snoozeCount === 0) return "none";
    if (snoozeCount < SNOOZE_CAUTION) return "warning";
    if (snoozeCount < SNOOZE_DANGER) return "caution";
    if (snoozeCount < SNOOZE_CRITICAL) return "danger";
    return "critical";
}

// ── Skip severity ────────────────────────────────────────────────────────────

export const SKIP_CAUTION = 2;
export const SKIP_DANGER = 4;
export const SKIP_CRITICAL = 6;

export type SkipSeverity =
    | "none"
    | "warning"
    | "caution"
    | "danger"
    | "critical";

export function getSkipSeverity(skipStreak: number): SkipSeverity {
    if (skipStreak === 0) return "none";
    if (skipStreak < SKIP_CAUTION) return "warning";
    if (skipStreak < SKIP_DANGER) return "caution";
    if (skipStreak < SKIP_CRITICAL) return "danger";
    return "critical";
}

// ── Cadence helpers ──────────────────────────────────────────────────────────

/** Whether the cadence supports multiple completions per period. */
export function isMultiplePerPeriodCadence(
    cadence: RecurrenceCadence,
): boolean {
    return cadence === 'multiple_per_day';
}

/** Human-readable label for a cadence (UI). */
export function cadenceLabel(cadence: RecurrenceCadence): string {
    switch (cadence) {
        case "multiple_per_day":
            return "Multiple times per day";
        case "daily":
            return "Daily";
        case "weekly":
            return "Weekly";
        case "monthly":
            return "Monthly";
        case "quarterly":
            return "Quarterly";
        case "yearly":
            return "Annually";
    }
}

/** Short cadence period word ("week", "month", etc.) for "1/3 this week" style labels. */
export function cadencePeriodWord(cadence: RecurrenceCadence): string {
    if (cadence === "multiple_per_day" || cadence === "daily") return "day";
    if (cadence === "weekly") return "week";
    if (cadence === "monthly") return "month";
    if (cadence === "quarterly") return "quarter";
    return "year";
}

// ── Consequence tier helpers ─────────────────────────────────────────────────

export function tierLabel(tier: ConsequenceTier): string {
    switch (tier) {
        case 1:
            return "Hard consequence";
        case 2:
            return "Soft consequence";
        case 3:
            return "Quality consequence";
        case 4:
            return "Aspirational";
    }
}

export function tierShortLabel(tier: ConsequenceTier): string {
    switch (tier) {
        case 1:
            return "TIER I";
        case 2:
            return "TIER II";
        case 3:
            return "TIER III";
        case 4:
            return "TIER IV";
    }
}

export function tierDescription(tier: ConsequenceTier): string {
    switch (tier) {
        case 1:
            return "Something bad happens if this slips.";
        case 2:
            return "Things degrade over time.";
        case 3:
            return "Nothing breaks, but quality drops.";
        case 4:
            return "I want to be the kind of person who does this.";
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
    readonly areas: ReadonlyArray<Area>;
    readonly commitments: ReadonlyArray<AnyCommitment>;
    readonly view: AppView;
    readonly selectedAreaId: string | null;
    readonly patriotScore: number;
    readonly completionStreak: number;
    readonly dialogueQueue: ReadonlyArray<DialogueEntry>;
    readonly lastActiveDate: string; // YYYY-MM-DD
    /** ms timestamp of last dismissal; null = never dismissed (show on first load). */
    readonly reportNoticeDismissedAt: number | null;
}
