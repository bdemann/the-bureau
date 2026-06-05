import type {
    AnyCommitment,
    AppState,
    ConsequenceTier,
    DeadlineType,
    Goal,
    Idea,
    ItemKind,
    Task,
    TimeOfDay,
} from "./types.js";
import { SCHEMA_VERSION } from "./types.js";

const STORAGE_KEY = "bureau_v1";

export const DEFAULT_STATE: AppState = {
    schemaVersion: SCHEMA_VERSION,
    areas: [],
    commitments: [],
    view: "daily",
    selectedAreaId: null,
    patriotScore: 100,
    completionStreak: 0,
    dialogueQueue: [],
    lastActiveDate: "",
    reportNoticeDismissedAt: null,
};

// ── Load / save ─────────────────────────────────────────────────────────────

export function loadState(): AppState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw) as Partial<AppState> & Record<string, unknown>;
        const needsResave = !!(parsed as any).projects || // old key still present
            !!(parsed as any).tasks; // pre-v3 separate arrays still present
        // Merge with defaults so newly added top-level fields are populated.
        const merged = {
            ...structuredClone(DEFAULT_STATE),
            ...parsed,
        } as AppState;
        const migrated = migrateState(merged);
        if (needsResave) saveState(migrated); // write back under new keys immediately
        return migrated;
    } catch {
        return structuredClone(DEFAULT_STATE);
    }
}

export function saveState(state: AppState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage full — fail silently for now.
    }
}

// ── Schema migration ────────────────────────────────────────────────────────

/**
 * Migrate state from any earlier schema to the current SCHEMA_VERSION.
 * Idempotent — safe to run on already-migrated data.
 */
export function migrateState(state: AppState): AppState {
    const raw = state as any;
    const version = state.schemaVersion ?? 1;

    // Normalize the view value — Phase 1 used 'dashboard' for the area grid.
    const normalizedView =
        state.view === ("dashboard" as unknown as AppState["view"])
            ? "daily"
            : (state.view ?? "daily");

    // Rename migration: 'projects' → 'areas' (stored key changed during rename).
    const areas: AppState['areas'] =
        (state.areas?.length ?? 0) > 0 ? state.areas : (raw.projects ?? []);

    if (version >= SCHEMA_VERSION) {
        // Already at v5 — just normalise task shapes.
        return {
            ...state,
            areas,
            view: normalizedView,
            commitments: state.commitments.map((c) =>
                c.kind === "routine" || c.kind === "task"
                    ? ensureTaskShape(c)
                    : c,
            ) as AnyCommitment[],
        };
    }

    // v4 → v5: split windowType into deadlineType + isMilestone.
    if (version === 4) {
        return migrateState({
            ...state,
            schemaVersion: 5,
            commitments: state.commitments.map((c) => {
                if (c.kind !== 'task' && c.kind !== 'routine') return c;
                const raw = c as any;
                const wt: string = raw.windowType ?? 'flexible';
                return {
                    ...raw,
                    deadlineType: wt === 'hard' ? 'rigid' : 'flexible',
                    isMilestone: wt === 'milestone',
                };
            }) as AnyCommitment[],
        });
    }

    // v3 → v4: rename cadence 'yearly' → 'annually'.
    if (version === 3) {
        return migrateState({
            ...state,
            schemaVersion: 4,
            commitments: state.commitments.map((c) => {
                if ((c.kind !== 'task' && c.kind !== 'routine') || !(c as any).recurrence) return c;
                const rec = (c as any).recurrence;
                if (rec.cadence !== 'yearly') return c;
                return { ...c, recurrence: { ...rec, cadence: 'annually' } };
            }) as AnyCommitment[],
        });
    }

    // v1 or v2 — old separate arrays need merging.
    const rawTasks: any[] = raw.tasks ?? [];
    const rawGoals: any[] = raw.goals ?? [];
    const rawIdeas: any[] = raw.ideas ?? [];

    const migratedTasks: Task[] =
        version < 2
            ? rawTasks.map(migrateTaskV1ToV2)
            : rawTasks.map(ensureTaskShape);

    const migratedGoals: Goal[] = rawGoals.map(
        (g: any): Goal => ({
            kind: "goal",
            id: g.id,
            areaId: g.areaId ?? null,
            goalId: null,
            title: g.title ?? "",
            description: g.description ?? "",
            status: g.status ?? "active",
            targetDate: g.targetDate ?? null,
            createdAt: g.createdAt ?? Date.now(),
        }),
    );

    const migratedIdeas: Idea[] = rawIdeas.map(
        (i: any): Idea => ({
            kind: "idea",
            id: i.id,
            title: i.title ?? "",
            description: i.description ?? "",
            areaId: i.areaId ?? null,
            goalId: i.goalId ?? null,
            createdAt: i.createdAt ?? Date.now(),
        }),
    );

    // Concat: preserve task order (user-reordered), goals then ideas at end.
    const commitments: AnyCommitment[] = [
        ...migratedTasks,
        ...migratedGoals,
        ...migratedIdeas,
    ];

    return {
        ...state,
        areas,
        schemaVersion: SCHEMA_VERSION,
        view: normalizedView,
        commitments,
    };
}

/**
 * Convert a Phase 1 task (priority + dueDate, no consequence/window/recurrence
 * fields) into a Phase 2 task with sensible defaults.
 */
function migrateTaskV1ToV2(raw: any): Task {
    return ensureTaskShape({
        ...raw,
        consequenceTier: raw.consequenceTier ?? priorityToTier(raw.priority),
        windowType: raw.windowType ?? "flexible", // kept for ensureTaskShape fallback
        suggestedDate: raw.suggestedDate ?? raw.dueDate ?? null,
        windowDeadline: raw.windowDeadline ?? null,
        windowLengthDays: raw.windowLengthDays ?? null,
        recurrence: raw.recurrence ?? null,
        currentPeriodStart: raw.currentPeriodStart ?? null,
        completionsThisPeriod: raw.completionsThisPeriod ?? 0,
    });
}

// Maps removed multiple_per_* cadences to their base cadence.
const CADENCE_MIGRATIONS: Record<string, string> = {
    multiple_per_week:    'weekly',
    multiple_per_month:   'monthly',
    multiple_per_quarter: 'quarterly',
    multiple_per_year:    'annually',
};

function normalizeRecurrence(raw: any): any {
    const cadence = CADENCE_MIGRATIONS[raw.cadence] ?? raw.cadence;
    const isWeekly = cadence === 'weekly';
    // Migrate single hardDayOfWeek → hardDaysOfWeek for weekly cadences
    const hardDaysOfWeek = isWeekly
        ? (raw.hardDaysOfWeek ??
          (raw.hardDayOfWeek !== undefined ? [raw.hardDayOfWeek] : undefined))
        : raw.hardDaysOfWeek;
    return { ...raw, cadence, endMode: raw.endMode ?? "never", hardDaysOfWeek };
}

/**
 * Defensive — fill any missing fields with defaults so the UI never crashes
 * on partially-shaped tasks (e.g., from a half-finished migration).
 */
function ensureTaskShape(raw: any): Task {
    return {
        id: raw.id,
        areaId: raw.areaId ?? raw.projectId ?? null,
        title: raw.title ?? "",
        description: raw.description ?? "",
        timeOfDay: (raw.timeOfDay ?? "anytime") as TimeOfDay,
        // Migrate: existing recurring + no-end tasks become 'routine', others 'task'.
        kind: (raw.kind ??
            (raw.recurrence && (raw.recurrence.endMode ?? "never") === "never"
                ? "routine"
                : "task")) as ItemKind,
        consequenceTier: (raw.consequenceTier ?? 3) as ConsequenceTier,
        deadlineType: (raw.deadlineType ?? (raw.windowType === 'hard' ? 'rigid' : 'flexible')) as DeadlineType,
        isMilestone: raw.isMilestone ?? (raw.windowType === 'milestone'),
        suggestedDate: raw.suggestedDate ?? null,
        windowDeadline: raw.windowDeadline ?? null,
        windowLengthDays: raw.windowLengthDays ?? null,
        recurrence: raw.recurrence ? normalizeRecurrence(raw.recurrence) : null,
        currentPeriodStart: raw.currentPeriodStart ?? null,
        completionsThisPeriod: raw.completionsThisPeriod ?? 0,
        totalCompletions: raw.totalCompletions ?? 0,
        progressCount: raw.progressCount ?? 0,
        // Optional fields — undefined when absent from old data (backward compat).
        lastProgressAt: raw.lastProgressAt ?? null,
        progressCadence: raw.progressCadence ?? null,
        progressCompletionsThisPeriod: raw.progressCompletionsThisPeriod ?? 0,
        currentProgressPeriodStart: raw.currentProgressPeriodStart ?? null,
        // Migrate: radarLeadDays (old hard-date-only field) → leadTimeDays.
        leadTimeDays:
            "leadTimeDays" in raw
                ? raw.leadTimeDays
                : "radarLeadDays" in raw && raw.radarLeadDays !== undefined
                  ? raw.radarLeadDays
                  : undefined,
        pausedUntil: raw.pausedUntil ?? null,
        pausedIndefinitely: raw.pausedIndefinitely ?? false,
        snoozeCount: raw.snoozeCount ?? 0,
        snoozedUntil: raw.snoozedUntil ?? null,
        totalSnoozes: raw.totalSnoozes ?? 0,
        totalSkips: raw.totalSkips ?? 0,
        totalMisses: raw.totalMisses ?? 0,
        missedAt: raw.missedAt ?? null,
        taskCompletionStreak: raw.taskCompletionStreak ?? 0,
        maxTaskCompletionStreak: raw.maxTaskCompletionStreak ?? 0,
        skipStreak: raw.skipStreak ?? 0,
        remediationCount: raw.remediationCount ?? 0,
        completedAt: raw.completedAt ?? null,
        createdAt: raw.createdAt ?? Date.now(),
        goalId: raw.goalId ?? raw.linkedGoalId ?? null,
        dueDate: raw.dueDate ?? null,
    };
}

function priorityToTier(priority: string | undefined): ConsequenceTier {
    switch (priority) {
        case "critical":
            return 1;
        case "high":
            return 2;
        case "medium":
            return 3;
        case "low":
            return 4;
        default:
            return 3;
    }
}

// ── Utility helpers ─────────────────────────────────────────────────────────

export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Start-of-day (local) for a given date. */
export function startOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
}

/** Whole-day difference (b - a), using local midnight boundaries. */
export function daysBetween(a: Date | number, b: Date | number): number {
    const ms =
        startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime();
    return Math.round(ms / 86_400_000);
}

export function isCurrentlySnoozed(task: Pick<Task, "snoozedUntil">): boolean {
    return task.snoozedUntil !== null && task.snoozedUntil > Date.now();
}

export function isCurrentlyPaused(
    task: Pick<Task, "pausedUntil" | "pausedIndefinitely">,
): boolean {
    if (task.pausedIndefinitely) return true;
    return task.pausedUntil !== null && task.pausedUntil > Date.now();
}

export function isTaskCompleteForPeriod(task: Task): boolean {
    if (task.recurrence && task.recurrence.frequencyPerPeriod > 1) {
        return task.completionsThisPeriod >= task.recurrence.frequencyPerPeriod;
    }
    return task.completedAt !== null;
}

/**
 * Phase 1 helper retained for back-compat: returns true if task is incomplete
 * AND not currently snoozed or paused. Used by legacy components — daily view
 * uses urgency.ts/getDailyBand instead.
 */
export function isTaskVisible(
    task: Pick<
        Task,
        "snoozedUntil" | "completedAt" | "pausedUntil" | "pausedIndefinitely"
    > & { missedAt?: number | null },
): boolean {
    if (task.completedAt !== null) return false;
    // eslint-disable-next-line eqeqeq
    if (task.missedAt != null) return false;
    if (task.snoozedUntil !== null && task.snoozedUntil > Date.now())
        return false;
    if (isCurrentlyPaused(task)) return false;
    return true;
}

export function isTaskOverdue(
    task: Pick<Task, "suggestedDate" | "dueDate" | "completedAt">,
): boolean {
    if (task.completedAt !== null) return false;
    const due = task.suggestedDate ?? task.dueDate;
    if (due === null || due === undefined) return false;
    return due < startOfDay(new Date()).getTime();
}
