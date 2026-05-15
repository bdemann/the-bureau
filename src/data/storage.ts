import type {
    AppState,
    ConsequenceTier,
    ItemKind,
    Task,
    TimeOfDay,
} from './types.js';
import {SCHEMA_VERSION} from './types.js';

const STORAGE_KEY = 'bureau_v1';

export const DEFAULT_STATE: AppState = {
    schemaVersion: SCHEMA_VERSION,
    projects: [],
    tasks: [],
    view: 'daily',
    selectedProjectId: null,
    patriotScore: 100,
    completionStreak: 0,
    dialogueQueue: [],
    lastActiveDate: '',
    reportNoticeDismissedAt: null,
};

// ── Load / save ─────────────────────────────────────────────────────────────

export function loadState(): AppState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw) as Partial<AppState>;
        // Merge with defaults so newly added top-level fields are populated.
        const merged = {...structuredClone(DEFAULT_STATE), ...parsed} as AppState;
        return migrateState(merged);
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
    const version = state.schemaVersion ?? 1;
    // Normalize the view value — Phase 1 used 'dashboard' for the project grid.
    // Phase 2 splits the top level into 'daily' (default) and 'operations' (the
    // grid). Map the old name forward but pop the user back to 'daily' so they
    // see the new landing view on their first Phase 2 launch.
    const normalizedView = state.view === ('dashboard' as unknown as AppState['view'])
        ? 'daily'
        : state.view ?? 'daily';

    if (version >= SCHEMA_VERSION) {
        return {
            ...state,
            view: normalizedView,
            tasks: state.tasks.map(ensureTaskShape),
        };
    }
    return {
        ...state,
        schemaVersion: SCHEMA_VERSION,
        view: normalizedView,
        tasks: state.tasks.map(migrateTaskV1ToV2),
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
        windowType: raw.windowType ?? 'flexible',
        suggestedDate: raw.suggestedDate ?? raw.dueDate ?? null,
        windowDeadline: raw.windowDeadline ?? null,
        windowLengthDays: raw.windowLengthDays ?? null,
        recurrence: raw.recurrence ?? null,
        currentPeriodStart: raw.currentPeriodStart ?? null,
        completionsThisPeriod: raw.completionsThisPeriod ?? 0,
    });
}

function normalizeRecurrence(raw: any): any {
    const isWeekly = raw.cadence === 'weekly' || raw.cadence === 'multiple_per_week';
    // Migrate single hardDayOfWeek → hardDaysOfWeek for weekly cadences
    const hardDaysOfWeek = isWeekly
        ? (raw.hardDaysOfWeek ?? (raw.hardDayOfWeek !== undefined ? [raw.hardDayOfWeek] : undefined))
        : raw.hardDaysOfWeek;
    return {...raw, endMode: raw.endMode ?? 'never', hardDaysOfWeek};
}

/**
 * Defensive — fill any missing fields with defaults so the UI never crashes
 * on partially-shaped tasks (e.g., from a half-finished migration).
 */
function ensureTaskShape(raw: any): Task {
    return {
        id: raw.id,
        projectId: raw.projectId,
        title: raw.title ?? '',
        description: raw.description ?? '',
        timeOfDay: (raw.timeOfDay ?? 'anytime') as TimeOfDay,
        // Migrate: existing recurring + no-end tasks become 'routine', others 'task'.
        kind: (raw.kind ?? (
            raw.recurrence && (raw.recurrence.endMode ?? 'never') === 'never'
                ? 'routine'
                : 'task'
        )) as ItemKind,
        consequenceTier: (raw.consequenceTier ?? 3) as ConsequenceTier,
        windowType: raw.windowType ?? 'flexible',
        suggestedDate: raw.suggestedDate ?? null,
        windowDeadline: raw.windowDeadline ?? null,
        windowLengthDays: raw.windowLengthDays ?? null,
        recurrence: raw.recurrence
            ? normalizeRecurrence(raw.recurrence)
            : null,
        currentPeriodStart: raw.currentPeriodStart ?? null,
        completionsThisPeriod: raw.completionsThisPeriod ?? 0,
        totalCompletions: raw.totalCompletions ?? 0,
        progressCount: raw.progressCount ?? 0,
        snoozeCount: raw.snoozeCount ?? 0,
        snoozedUntil: raw.snoozedUntil ?? null,
        completedAt: raw.completedAt ?? null,
        createdAt: raw.createdAt ?? Date.now(),
        dueDate: raw.dueDate ?? null,
    };
}

function priorityToTier(priority: string | undefined): ConsequenceTier {
    switch (priority) {
        case 'critical': return 1;
        case 'high':     return 2;
        case 'medium':   return 3;
        case 'low':      return 4;
        default:         return 3;
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
    const ms = startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime();
    return Math.round(ms / 86_400_000);
}

export function isCurrentlySnoozed(task: Pick<Task, 'snoozedUntil'>): boolean {
    return task.snoozedUntil !== null && task.snoozedUntil > Date.now();
}

export function isTaskCompleteForPeriod(task: Task): boolean {
    if (task.recurrence && task.recurrence.frequencyPerPeriod > 1) {
        return task.completionsThisPeriod >= task.recurrence.frequencyPerPeriod;
    }
    return task.completedAt !== null;
}

/**
 * Phase 1 helper retained for back-compat: returns true if task is incomplete
 * AND not currently snoozed. Used by legacy components — daily view uses
 * urgency.ts/getDailyBand instead.
 */
export function isTaskVisible(task: Pick<Task, 'snoozedUntil' | 'completedAt'>): boolean {
    if (task.completedAt !== null) return false;
    if (task.snoozedUntil !== null && task.snoozedUntil > Date.now()) return false;
    return true;
}

export function isTaskOverdue(task: Pick<Task, 'suggestedDate' | 'dueDate' | 'completedAt'>): boolean {
    if (task.completedAt !== null) return false;
    const due = task.suggestedDate ?? task.dueDate;
    if (due === null || due === undefined) return false;
    return due < startOfDay(new Date()).getTime();
}
