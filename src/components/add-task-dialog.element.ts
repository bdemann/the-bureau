import {
    css,
    defineElement,
    defineElementEvent,
    html,
    listen,
} from "element-vir";
import {
    ViraButton,
    ViraColorVariant,
    ViraEmphasis,
    ViraInput,
    ViraInputType,
    ViraSelect,
    ViraSize,
    ViraTextArea,
} from "vira";
import type {
    ConsequenceTier,
    FormKind,
    Goal,
    Idea,
    ItemKind,
    Area,
    MilestoneProgressCadence,
    RecurrenceConfig,
    RecurrenceEndMode,
    Task,
    TimeOfDay,
    WindowType,
} from "../data/types.js";

function msToDateString(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
import {
    TIME_OF_DAY_SLOTS,
    tierDescription,
    tierLabel,
    timeOfDayLabel,
} from "../data/types.js";
import { generateId, startOfDay } from "../data/storage.js";
import { initialiseRecurrence } from "../data/recurrence.js";
import { getActiveSkin } from "../skins/active-skin.js";
import {
    CadencePickerElement,
    buildRecurrenceAnchors,
    cadenceConfigFromRecurrence,
    defaultCadenceConfig,
} from "./cadence-picker.element.js";
import type { CadenceConfig } from "./cadence-picker.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// AddTaskDialogElement
// Bottom-sheet form for filing a new task. Phase 2: collects consequence tier,
// recurrence config (cadence, frequency, schedule mode), window type, and
// suggested / hard date.
// ─────────────────────────────────────────────────────────────────────────────


export const AddTaskDialogElement = defineElement<{
    areaId: string | null;
    open: boolean;
    editTask?: Task | null;
    editGoal?: Goal | null;
    editIdea?: Idea | null;
    areas?: ReadonlyArray<Area>;
    prefillTitle?: string | null;
    prefillDescription?: string | null;
    defaultKind?: FormKind;
    goals?: ReadonlyArray<Goal>;
    /** Pre-selects a goal in the Linked Objective picker (for task/routine/idea forms). */
    defaultGoalId?: string | null;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "add-task-dialog",

    events: {
        taskSubmitted: defineElementEvent<Task>(),
        taskUpdated: defineElementEvent<Task>(),
        taskDeleted: defineElementEvent<string>(), // task id
        goalSubmitted: defineElementEvent<Goal>(),
        goalUpdated: defineElementEvent<Goal>(),
        goalDeleted: defineElementEvent<string>(), // goal id
        ideaSubmitted: defineElementEvent<Idea>(),
        ideaUpdated: defineElementEvent<Idea>(),
        ideaDeleted: defineElementEvent<string>(), // idea id
        /** Fired when the submitted task should be linked to a goal. */
        taskGoalLinked: defineElementEvent<{
            taskId: string;
            goalId: string;
        }>(),
        /** Fired when the linked goal on a task changes during edit (oldGoalId may be null). */
        linkedGoalChanged: defineElementEvent<{
            taskId: string;
            oldGoalId: string | null;
            newGoalId: string | null;
        }>(),
        cancelled: defineElementEvent<void>(),
    },

    state: () => ({
        kind: "task" as FormKind,
        titleValue: "",
        description: "",
        consequenceTier: 3 as ConsequenceTier,
        timeOfDay: "anytime" as TimeOfDay,
        isRecurring: false,
        cadenceConfig: defaultCadenceConfig('weekly'),
        windowType: "hard" as WindowType,
        /**
         * Lead time selector state.
         * 'default' = system default (hard-date: 3 days radar; flexible: window %).
         * 'none'    = hidden until mandatory/due (leadTimeDays = null).
         * 'custom'  = user-specified number of days (leadTimeDays = number).
         */
        leadTimeMode: "default" as "default" | "none" | "custom",
        leadTimeCustomDays: 7,
        suggestedDate: msToDateString(Date.now()), // YYYY-MM-DD
        /** ID of the task currently being edited; null means add mode. */
        currentEditId: null as string | null,
        confirmingDelete: false,
        /** Which area this task belongs to; null = no area. */
        selectedAreaId: null as string | null,
        /** Tracks open transitions so add-mode form resets on each open. */
        wasOpen: false,
        // ── Start date ──
        hasStartDate: false,
        startDate: "", // YYYY-MM-DD
        // ── Snooze ──
        /** When true, snoozing is permanently disabled for this directive. */
        disableSnooze: false,
        // ── Pause ──
        pauseMode: "none" as "none" | "indefinite" | "until_date" | "for_days",
        pauseUntilDate: "", // YYYY-MM-DD
        pauseForDays: 7,
        // ── End condition ──
        hasEndCondition: false,
        endMode: "after_count" as "after_count" | "after_date",
        endAfterCount: 10,
        endAfterDate: "", // YYYY-MM-DD
        // ── Goal-specific ──
        goalTargetDate: msToDateString(Date.now()), // YYYY-MM-DD, defaults to today
        // ── Idea-specific ──
        ideaLinkedGoalId: null as string | null,
        // ── Task/routine linked objective ──
        linkedGoalId: null as string | null,
        /** The goal that linked to this task before editing started (for detecting changes). */
        originalLinkedGoalId: null as string | null,
        // ── Goal/idea edit tracking ──
        editGoalId: null as string | null,
        editIdeaId: null as string | null,
        /** Linked task IDs on the goal being edited (for dissociation warning). */
        goalLinkedTaskIds: [] as string[],
        // ── Kind-switch warning (when editing a goal with linked commitments) ──
        confirmingKindSwitch: false,
        pendingKindSwitch: null as FormKind | null,
        /** True after user confirmed a goal→other-type switch; clears links on save. */
        willDissociateLinks: false,
        // ── Milestone progress cadence ──
        hasProgressCadence: false,
        progressCadenceConfig: defaultCadenceConfig('weekly'),
    }),

    styles: css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(var(--color-primary-rgb), 0.65);
            z-index: 400;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        :host *,
        :host *::before,
        :host *::after {
            box-sizing: border-box;
        }

        .sheet {
            background: var(--color-surface);
            width: 100%;
            max-width: 600px;
            border-top: 4px solid var(--color-danger);
            padding: 20px 20px 32px;
            padding-bottom: max(32px, env(safe-area-inset-bottom, 0px));
            animation: sheet-in 0.2s ease-out;
            max-height: 92dvh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
        }

        @keyframes sheet-in {
            from {
                transform: translateY(40px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .sheet-title {
            font-family: var(--font-display);
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: var(--color-primary);
            border-bottom: 1px solid rgba(0, 0, 0, 0.15);
            padding-bottom: 8px;
            margin-bottom: 16px;
        }

        .field {
            margin-bottom: 14px;
        }

        .field-label {
            display: block;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 4px;
            font-family: var(--font-mono);
        }

        /* Vira inputs are inline-flex by default; expand them to full width inside our sheet */
        ${ViraInput}, ${ViraTextArea}, ${ViraSelect} {
            width: 100%;
        }

        /* Native date input — Vira doesn't ship a date picker. */
        input[type="date"] {
            width: 100%;
            background: var(--color-input-bg);
            border: 1px solid rgba(0, 0, 0, 0.25);
            padding: 8px 10px;
            font-family: var(--font-mono);
            font-size: 0.9rem;
            color: var(--color-text);
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input[type="date"]:focus {
            border-color: var(--color-primary);
        }

        /* All pill/toggle/grid button groups get a 44px minimum touch height */
        .tier-grid
            ${ViraButton},
            .tod-grid
            ${ViraButton},
            .seg
            ${ViraButton},
            .kind-toggle
            ${ViraButton},
            .dow-grid
            ${ViraButton},
            .ord-grid
            ${ViraButton},
            .month-grid
            ${ViraButton} {
            min-height: 44px;
        }

        .tier-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
        }

        .tier-grid ${ViraButton} {
            width: 100%;
        }

        .tod-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .tod-grid ${ViraButton} {
            flex: 1 1 calc(33% - 6px);
            min-width: 80px;
        }

        .tier-help {
            margin-top: 6px;
            font-size: 0.72rem;
            color: var(--color-text-muted);
            font-family: var(--font-mono);
            min-height: 1.1em;
        }

        .seg {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        .seg ${ViraButton} {
            width: 100%;
        }

        .recurring-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
        }
        .recurring-row label {
            font-family: var(--font-mono);
            font-size: 0.85rem;
            color: var(--color-text);
            cursor: pointer;
            user-select: none;
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .grow {
            flex: 1;
        }

        /* Day-of-week segmented picker (Sun..Sat) — 7 per row on wide, wraps on narrow */
        .dow-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        .dow-grid ${ViraButton} {
            flex: 1 1 calc(14% - 4px);
            min-width: 36px;
        }

        /* Ordinal-week segmented picker (1st..4th, Last) */
        .ord-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
        }
        .ord-grid ${ViraButton} {
            width: 100%;
        }

        /* Month-of-year picker (Jan..Dec) */
        .month-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
        }
        .month-grid ${ViraButton} {
            width: 100%;
        }

        /* Multi-day-of-month picker (1–31) */
        .dom-multi-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 3px;
        }
        .dom-multi-grid ${ViraButton} {
            width: 100%;
        }

        /* Day-of-month numeric input (narrow) */
        .dom-input {
            max-width: 8ch;
        }

        .anchor-summary {
            margin-top: 6px;
            font-size: 0.72rem;
            color: var(--color-text-muted);
            font-family: var(--font-mono);
        }

        .end-condition-section {
            border-top: 1px dashed rgba(0, 0, 0, 0.15);
            padding-top: 12px;
            margin-top: 4px;
        }

        .kind-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 16px;
        }
        .kind-toggle ${ViraButton} {
            width: 100%;
        }

        .area-select {
            width: 100%;
            font-family: var(--font-accent);
            font-size: 0.9rem;
            background: var(--color-card);
            border: 1px solid rgba(0, 0, 0, 0.2);
            padding: 8px 10px;
            color: var(--color-text);
            appearance: none;
            cursor: pointer;
            box-sizing: border-box;
        }
        .area-select:focus {
            outline: none;
            border-color: var(--color-primary);
        }

        .delete-section {
            border-top: 1px solid rgba(var(--color-danger-rgb), 0.2);
            margin-top: 20px;
            padding-top: 14px;
        }

        .task-delete-btn {
            background: none;
            border: 1px solid var(--color-danger);
            color: var(--color-danger);
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.2em;
            padding: 6px 14px;
            cursor: pointer;
            transition:
                background 0.15s,
                color 0.15s;
        }
        .task-delete-btn:hover {
            background: var(--color-danger);
            color: var(--color-surface);
        }

        .delete-confirm-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .delete-confirm-label {
            font-family: var(--font-mono);
            font-size: 0.78rem;
            color: var(--color-danger-dark);
            flex: 1;
        }

        .delete-confirm-yes {
            background: var(--color-danger);
            border: none;
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .delete-confirm-yes:hover {
            background: var(--color-danger-dark);
        }

        .delete-confirm-no {
            background: none;
            border: 1px solid var(--color-text-muted);
            color: var(--color-text-muted);
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .delete-confirm-no:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        .kind-switch-warning {
            background: #fff5e6;
            border: 1px solid var(--color-warning);
            padding: 12px 14px;
            margin-bottom: 14px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: #7a5c00;
        }
        .kind-switch-warning p {
            margin: 0 0 10px;
        }
        .kind-switch-warning-actions {
            display: flex;
            gap: 8px;
        }
        .kind-switch-proceed {
            background: var(--color-warning);
            border: none;
            color: #fff;
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .kind-switch-proceed:hover {
            background: #8b6600;
        }
        .kind-switch-cancel {
            background: none;
            border: 1px solid var(--color-warning);
            color: #7a5c00;
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .kind-switch-cancel:hover {
            background: rgba(184, 134, 11, 0.08);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();
        // Reset wasOpen when dialog closes so the next open is treated as fresh.
        if (!inputs.open) {
            if (state.wasOpen) updateState({ wasOpen: false });
            return html``;
        }

        const editTask = inputs.editTask ?? null;
        const editGoal = inputs.editGoal ?? null;
        const editIdea = inputs.editIdea ?? null;
        const isEditMode =
            editTask !== null || editGoal !== null || editIdea !== null;

        // On first render for a new editTask, populate form state from the task.
        if (editTask !== null && state.currentEditId !== editTask.id) {
            const t = editTask;
            const cfg = t.recurrence;
            const currentLinkedGoal =
                (inputs.goals ?? []).find((g) =>
                    g.linkedTaskIds.includes(t.id),
                ) ?? null;
            updateState({
                currentEditId: t.id,
                wasOpen: true,
                confirmingDelete: false,
                selectedAreaId: t.areaId,
                kind: t.kind ?? "task",
                titleValue: t.title,
                description: t.description,
                timeOfDay: t.timeOfDay ?? "anytime",
                consequenceTier: t.consequenceTier,
                isRecurring: cfg !== null,
                cadenceConfig: cfg ? cadenceConfigFromRecurrence(cfg) : defaultCadenceConfig('weekly'),
                windowType: t.windowType,
                suggestedDate: t.suggestedDate
                    ? msToDateString(t.suggestedDate)
                    : "",
                hasStartDate: cfg?.startDate !== undefined,
                startDate: cfg?.startDate ? msToDateString(cfg.startDate) : "",
                pauseMode: t.pausedIndefinitely
                    ? "indefinite"
                    : t.pausedUntil !== null && t.pausedUntil > Date.now()
                      ? "until_date"
                      : "none",
                pauseUntilDate:
                    t.pausedUntil !== null && !t.pausedIndefinitely
                        ? msToDateString(t.pausedUntil)
                        : "",
                pauseForDays: 7,
                hasEndCondition:
                    cfg !== null && (cfg.endMode ?? "never") !== "never",
                endMode:
                    cfg?.endMode === "after_date"
                        ? "after_date"
                        : "after_count",
                endAfterCount: cfg?.endAfterCount ?? 10,
                endAfterDate: cfg?.endAfterDate
                    ? msToDateString(cfg.endAfterDate)
                    : "",
                leadTimeMode:
                    "leadTimeDays" in t && t.leadTimeDays !== undefined
                        ? t.leadTimeDays === null
                            ? "none"
                            : "custom"
                        : "default",
                leadTimeCustomDays:
                    typeof t.leadTimeDays === "number" ? t.leadTimeDays : 7,
                disableSnooze: t.disableSnooze ?? false,
                linkedGoalId: currentLinkedGoal?.id ?? null,
                originalLinkedGoalId: currentLinkedGoal?.id ?? null,
                editGoalId: null,
                editIdeaId: null,
                goalLinkedTaskIds: [],
                confirmingKindSwitch: false,
                pendingKindSwitch: null,
                willDissociateLinks: false,
                hasProgressCadence: t.progressCadence != null,
                progressCadenceConfig: t.progressCadence
                    ? cadenceConfigFromRecurrence({ ...t.progressCadence, scheduleMode: 'fixed', endMode: 'never' })
                    : defaultCadenceConfig('weekly'),
            });
        }

        // On first render for a new editGoal, populate form state from the goal.
        if (editGoal !== null && state.currentEditId !== editGoal.id) {
            updateState({
                currentEditId: editGoal.id,
                wasOpen: true,
                confirmingDelete: false,
                kind: "goal",
                titleValue: editGoal.title,
                description: editGoal.description,
                selectedAreaId: editGoal.areaId,
                goalTargetDate: editGoal.targetDate
                    ? msToDateString(editGoal.targetDate)
                    : "",
                editGoalId: editGoal.id,
                goalLinkedTaskIds: [...editGoal.linkedTaskIds],
                editIdeaId: null,
                linkedGoalId: null,
                originalLinkedGoalId: null,
                ideaLinkedGoalId: null,
                confirmingKindSwitch: false,
                pendingKindSwitch: null,
                willDissociateLinks: false,
            });
        }

        // On first render for a new editIdea, populate form state from the idea.
        if (editIdea !== null && state.currentEditId !== editIdea.id) {
            updateState({
                currentEditId: editIdea.id,
                wasOpen: true,
                confirmingDelete: false,
                kind: "idea",
                titleValue: editIdea.title,
                description: editIdea.description,
                selectedAreaId: editIdea.areaId,
                ideaLinkedGoalId: editIdea.goalId,
                editIdeaId: editIdea.id,
                editGoalId: null,
                goalLinkedTaskIds: [],
                linkedGoalId: null,
                originalLinkedGoalId: null,
                confirmingKindSwitch: false,
                pendingKindSwitch: null,
                willDissociateLinks: false,
            });
        }

        // When dialog opens fresh in add mode, reset the form and seed the area selection.
        if (!isEditMode && !state.wasOpen) {
            updateState({
                wasOpen: true,
                selectedAreaId: inputs.areaId,
                titleValue: inputs.prefillTitle ?? "",
                description: inputs.prefillDescription ?? "",
                kind: inputs.defaultKind ?? "task",
                consequenceTier: 3,
                timeOfDay: "anytime",
                isRecurring: inputs.defaultKind === "routine",
                cadenceConfig: defaultCadenceConfig(
                    inputs.defaultKind === "routine" ? "daily" : "weekly",
                ),
                windowType: "hard",
                leadTimeMode: "default",
                leadTimeCustomDays: 7,
                disableSnooze: false,
                suggestedDate: msToDateString(Date.now()),
                hasStartDate: false,
                startDate: "",
                pauseMode: "none",
                pauseUntilDate: "",
                pauseForDays: 7,
                hasEndCondition: false,
                endMode: "after_count",
                endAfterCount: 10,
                endAfterDate: "",
                goalTargetDate: msToDateString(Date.now()),
                ideaLinkedGoalId: inputs.defaultGoalId ?? null,
                linkedGoalId: inputs.defaultGoalId ?? null,
                originalLinkedGoalId: null,
                editGoalId: null,
                editIdeaId: null,
                goalLinkedTaskIds: [],
                confirmingKindSwitch: false,
                pendingKindSwitch: null,
                willDissociateLinks: false,
                confirmingDelete: false,
                currentEditId: null,
                hasProgressCadence: false,
                progressCadenceConfig: defaultCadenceConfig('weekly'),
            });
        }

        // Anchor cadences derive their first occurrence from selected days/dates;
        // they don't need a separate date picker.
        const usesAnchor =
            state.isRecurring && state.cadenceConfig.cadence !== 'daily';

        const isTaskOrRoutine =
            state.kind === "routine" || state.kind === "task";

        // Daily routines cannot be snoozed by nature — the toggle is shown but disabled.
        const isNaturallyNotSnoozable =
            state.kind === "routine" &&
            state.isRecurring &&
            (state.cadenceConfig.cadence === "daily" || state.cadenceConfig.cadence === "multiple_per_day");

        const canSubmit =
            !state.confirmingKindSwitch &&
            state.titleValue.trim().length > 0 &&
            // Hard-date tasks need a date — unless an anchor implies one.
            (!isTaskOrRoutine ||
                state.windowType !== "hard" ||
                usesAnchor ||
                state.suggestedDate.length > 0) &&
            // Weekly anchor requires at least one day selected.
            (!usesAnchor ||
                state.cadenceConfig.cadence !== 'weekly' ||
                state.cadenceConfig.daysOfWeek.size > 0);

        // ── Kind-switch helpers ─────────────────────────────────────────────────

        function doKindSwitch(newKind: FormKind): void {
            const updates: Parameters<typeof updateState>[0] = {
                kind: newKind,
                confirmingKindSwitch: false,
                pendingKindSwitch: null,
            };
            // Routines must be recurring; only force it if not already set.
            if (newKind === "routine" && !state.isRecurring) {
                updates.isRecurring = true;
            }
            updateState(updates);
        }

        function onKindClick(newKind: FormKind): void {
            // Warn if we're converting a goal that has linked commitments.
            if (
                state.kind === "goal" &&
                state.goalLinkedTaskIds.length > 0 &&
                newKind !== "goal"
            ) {
                updateState({
                    confirmingKindSwitch: true,
                    pendingKindSwitch: newKind,
                });
                return;
            }
            doKindSwitch(newKind);
        }

        // ── Task builder (shared by add + edit task/routine paths) ───────────────

        function buildTask(baseTask: Task | null): Task {
            const today = new Date();
            const suggestedMs = state.suggestedDate
                ? startOfDay(new Date(state.suggestedDate + "T00:00")).getTime()
                : null;

            let recurrence = null;
            let currentPeriodStart: number | null = null;
            let suggestedDate: number | null = suggestedMs;
            let windowDeadline: number | null = null;
            let windowLengthDays: number | null = null;

            if (state.isRecurring) {
                let endMode: RecurrenceEndMode = "never";
                let endAfterCount: number | undefined;
                let endAfterDate: number | undefined;
                if (state.hasEndCondition) {
                    endMode = state.endMode;
                    if (state.endMode === "after_count") {
                        endAfterCount = Math.max(1, state.endAfterCount);
                    } else if (
                        state.endMode === "after_date" &&
                        state.endAfterDate
                    ) {
                        endAfterDate = startOfDay(
                            new Date(state.endAfterDate + "T00:00"),
                        ).getTime();
                    }
                }

                const startDate =
                    state.hasStartDate && state.startDate
                        ? startOfDay(
                              new Date(state.startDate + "T00:00"),
                          ).getTime()
                        : undefined;

                const cfg: RecurrenceConfig = {
                    cadence: state.cadenceConfig.cadence,
                    frequencyPerPeriod: 1,
                    scheduleMode: state.cadenceConfig.scheduleMode,
                    endMode,
                    endAfterCount,
                    endAfterDate,
                    startDate,
                    ...buildRecurrenceAnchors(state.cadenceConfig),
                };
                recurrence = cfg;
                const init = initialiseRecurrence(
                    {
                        windowType: state.windowType,
                        suggestedDate: usesAnchor ? null : suggestedMs,
                    },
                    cfg,
                    today,
                );
                currentPeriodStart = init.currentPeriodStart;
                suggestedDate = init.suggestedDate;
                windowDeadline = init.windowDeadline;
                windowLengthDays = init.windowLengthDays;
            }

            // Compute pause fields from pauseMode.
            let pausedUntil: number | null = null;
            let pausedIndefinitely = false;
            if (state.pauseMode === "indefinite") {
                pausedIndefinitely = true;
            } else if (
                state.pauseMode === "until_date" &&
                state.pauseUntilDate
            ) {
                pausedUntil = startOfDay(
                    new Date(state.pauseUntilDate + "T00:00"),
                ).getTime();
            } else if (state.pauseMode === "for_days") {
                pausedUntil =
                    startOfDay(new Date()).getTime() +
                    state.pauseForDays * 86_400_000;
            }

            const taskId = baseTask?.id ?? generateId();
            return {
                id: taskId,
                areaId: state.selectedAreaId,
                createdAt: baseTask?.createdAt ?? Date.now(),
                pausedUntil,
                pausedIndefinitely,
                snoozeCount: baseTask?.snoozeCount ?? 0,
                snoozedUntil: baseTask?.snoozedUntil ?? null,
                totalSnoozes: baseTask?.totalSnoozes ?? 0,
                totalSkips: baseTask?.totalSkips ?? 0,
                totalMisses: baseTask?.totalMisses ?? 0,
                missedAt: baseTask?.missedAt ?? null,
                taskCompletionStreak: baseTask?.taskCompletionStreak ?? 0,
                maxTaskCompletionStreak: baseTask?.maxTaskCompletionStreak ?? 0,
                skipStreak: baseTask?.skipStreak ?? 0,
                remediationCount: baseTask?.remediationCount ?? 0,
                completedAt: baseTask?.completedAt ?? null,
                completionsThisPeriod: baseTask?.completionsThisPeriod ?? 0,
                totalCompletions: baseTask?.totalCompletions ?? 0,
                progressCount: baseTask?.progressCount ?? 0,
                kind: state.kind as ItemKind,
                title: state.titleValue.trim(),
                description: state.description.trim(),
                timeOfDay: state.timeOfDay,
                consequenceTier: state.consequenceTier,
                windowType: state.windowType,
                leadTimeDays:
                    state.leadTimeMode === "none"
                        ? null
                        : state.leadTimeMode === "custom"
                          ? state.leadTimeCustomDays
                          : undefined,
                lastProgressAt: baseTask?.lastProgressAt ?? null,
                progressCadence: (state.windowType === 'milestone' && state.hasProgressCadence)
                    ? { cadence: state.progressCadenceConfig.cadence, frequencyPerPeriod: 1 } as MilestoneProgressCadence
                    : null,
                progressCompletionsThisPeriod: baseTask?.progressCompletionsThisPeriod ?? 0,
                currentProgressPeriodStart: baseTask?.currentProgressPeriodStart ?? null,
                disableSnooze: state.disableSnooze || undefined, // omit when false (saves space)
                suggestedDate,
                windowDeadline,
                windowLengthDays,
                recurrence,
                currentPeriodStart,
                dueDate: suggestedDate,
            };
        }

        function buildGoal(existing: Goal | null): Goal {
            const targetMs = state.goalTargetDate
                ? startOfDay(
                      new Date(state.goalTargetDate + "T00:00"),
                  ).getTime()
                : null;
            return {
                id: existing?.id ?? generateId(),
                areaId: state.selectedAreaId,
                title: state.titleValue.trim(),
                description: state.description.trim(),
                status: existing?.status ?? "active",
                targetDate: targetMs,
                // Preserve links unless the user confirmed dissociation.
                linkedTaskIds:
                    state.willDissociateLinks || existing === null
                        ? []
                        : existing.linkedTaskIds,
                createdAt: existing?.createdAt ?? Date.now(),
            };
        }

        function buildIdea(existing: Idea | null): Idea {
            return {
                id: existing?.id ?? generateId(),
                areaId: state.selectedAreaId,
                title: state.titleValue.trim(),
                description: state.description.trim(),
                goalId: state.ideaLinkedGoalId,
                createdAt: existing?.createdAt ?? Date.now(),
            };
        }

        // ── Submit ───────────────────────────────────────────────────────────────

        function submit(): void {
            if (!canSubmit) return;

            const newKind = state.kind;
            // Determine original type
            const origKind: "goal" | "idea" | "task" | "routine" | null =
                editGoal !== null
                    ? "goal"
                    : editIdea !== null
                      ? "idea"
                      : editTask !== null
                        ? editTask.kind === "routine"
                            ? "routine"
                            : "task"
                        : null;

            function resetForm(): void {
                updateState({
                    kind: "task",
                    titleValue: "",
                    description: "",
                    consequenceTier: 3,
                    timeOfDay: "anytime",
                    isRecurring: false,
                    cadenceConfig: defaultCadenceConfig('weekly'),
                    windowType: "hard",
                    leadTimeMode: "default",
                    leadTimeCustomDays: 7,
                    suggestedDate: msToDateString(Date.now()),
                    currentEditId: null,
                    selectedAreaId: null,
                    wasOpen: false,
                    hasStartDate: false,
                    startDate: "",
                    pauseMode: "none",
                    pauseUntilDate: "",
                    pauseForDays: 7,
                    hasEndCondition: false,
                    endMode: "after_count",
                    endAfterCount: 10,
                    endAfterDate: "",
                    linkedGoalId: null,
                    originalLinkedGoalId: null,
                    ideaLinkedGoalId: null,
                    editGoalId: null,
                    editIdeaId: null,
                    goalLinkedTaskIds: [],
                    confirmingKindSwitch: false,
                    pendingKindSwitch: null,
                    willDissociateLinks: false,
                    confirmingDelete: false,
                });
            }

            // ── Goal output ──
            if (newKind === "goal") {
                const goal = buildGoal(origKind === "goal" ? editGoal : null);
                if (origKind === "goal") {
                    dispatch(new events.goalUpdated(goal));
                } else {
                    dispatch(new events.goalSubmitted(goal));
                    if (origKind === "task" || origKind === "routine")
                        dispatch(new events.taskDeleted(editTask!.id));
                    if (origKind === "idea")
                        dispatch(new events.ideaDeleted(editIdea!.id));
                }
                resetForm();
                return;
            }

            // ── Idea output ──
            if (newKind === "idea") {
                const idea = buildIdea(origKind === "idea" ? editIdea : null);
                if (origKind === "idea") {
                    dispatch(new events.ideaUpdated(idea));
                } else {
                    dispatch(new events.ideaSubmitted(idea));
                    if (origKind === "task" || origKind === "routine")
                        dispatch(new events.taskDeleted(editTask!.id));
                    if (origKind === "goal")
                        dispatch(new events.goalDeleted(editGoal!.id));
                }
                resetForm();
                return;
            }

            // ── Task / Routine output ──
            const isInKindEdit = origKind === "task" || origKind === "routine";
            const task = buildTask(isInKindEdit ? editTask : null);

            if (isInKindEdit) {
                dispatch(new events.taskUpdated(task));
                // If the linked goal changed, notify parent to rewire links.
                if (state.linkedGoalId !== state.originalLinkedGoalId) {
                    dispatch(
                        new events.linkedGoalChanged({
                            taskId: task.id,
                            oldGoalId: state.originalLinkedGoalId,
                            newGoalId: state.linkedGoalId,
                        }),
                    );
                }
            } else {
                // Converting from goal/idea to task/routine (or brand-new add).
                dispatch(new events.taskSubmitted(task));
                if (origKind === "goal")
                    dispatch(new events.goalDeleted(editGoal!.id));
                if (origKind === "idea")
                    dispatch(new events.ideaDeleted(editIdea!.id));
                // Link to goal if selected.
                if (state.linkedGoalId) {
                    dispatch(
                        new events.taskGoalLinked({
                            taskId: task.id,
                            goalId: state.linkedGoalId,
                        }),
                    );
                }
            }

            resetForm();
        }

        return html`
            <div
                class="overlay"
                @click=${(e: Event) => {
                    if (e.target === e.currentTarget) {
                        dispatch(new events.cancelled());
                        updateState({ currentEditId: null });
                    }
                }}
            >
                <div class="sheet">
                    <div class="sheet-title">
                        ${
                            isEditMode
                                ? state.kind === "routine"
                                    ? skin.actions.editRoutineTitle
                                    : state.kind === "task"
                                      ? skin.actions.editTaskTitle
                                      : state.kind === "goal"
                                        ? skin.actions.editGoalTitle
                                        : skin.actions.editIdeaTitle
                                : state.kind === "routine"
                                  ? skin.actions.newRoutineTitle
                                  : state.kind === "task"
                                    ? skin.actions.newTaskTitle
                                    : state.kind === "goal"
                                      ? skin.actions.newGoalTitle
                                      : skin.actions.newIdeaTitle
                        }
                    </div>

                    <!-- Kind toggle — always visible (create and edit mode) -->
                    <div class="kind-toggle">
                        <${ViraButton.assign({
                            text: skin.types.routine,
                            color: ViraColorVariant.Info,
                            buttonEmphasis:
                                state.kind === "routine"
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => onKindClick("routine")}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: skin.types.task,
                            color: ViraColorVariant.Info,
                            buttonEmphasis:
                                state.kind === "task"
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => onKindClick("task")}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: skin.types.goal,
                            color: ViraColorVariant.Info,
                            buttonEmphasis:
                                state.kind === "goal"
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => onKindClick("goal")}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: skin.types.idea,
                            color: ViraColorVariant.Info,
                            buttonEmphasis:
                                state.kind === "idea"
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => onKindClick("idea")}
                        ></${ViraButton}>
                    </div>

                    <!-- Warning: switching away from a goal that has linked commitments -->
                    ${
                        state.confirmingKindSwitch
                            ? html`
                                  <div class="kind-switch-warning">
                                      <p>
                                          ⚠ This objective has
                                          ${state.goalLinkedTaskIds.length}
                                          linked
                                          commitment${state.goalLinkedTaskIds
                                              .length !== 1
                                              ? "s"
                                              : ""}.
                                          Switching type will dissociate them
                                          from this entry.
                                      </p>
                                      <div class="kind-switch-warning-actions">
                                          <button
                                              class="kind-switch-proceed"
                                              @click=${() => {
                                                  updateState({
                                                      willDissociateLinks: true,
                                                  });
                                                  doKindSwitch(
                                                      state.pendingKindSwitch!,
                                                  );
                                              }}
                                          >
                                              PROCEED
                                          </button>
                                          <button
                                              class="kind-switch-cancel"
                                              @click=${() =>
                                                  updateState({
                                                      confirmingKindSwitch: false,
                                                      pendingKindSwitch: null,
                                                  })}
                                          >
                                              CANCEL
                                          </button>
                                      </div>
                                  </div>
                              `
                            : html``
                    }

                    <!-- Title -->
                    <div class="field">
                        <span class="field-label">Title *</span>
                        <${ViraInput.assign({
                            value: state.titleValue,
                            placeholder: "Describe the commitment clearly.",
                        })}
                            ${listen(ViraInput.events.valueChange, (e) =>
                                updateState({ titleValue: e.detail }),
                            )}
                        ></${ViraInput}>
                    </div>

                    <!-- Description -->
                    <div class="field">
                        <span class="field-label">Details / Notes</span>
                        <${ViraTextArea.assign({
                            value: state.description,
                            placeholder:
                                "Additional context. Optional but encouraged.",
                            rows: 3,
                        })}
                            ${listen(ViraTextArea.events.valueChange, (e) =>
                                updateState({ description: e.detail }),
                            )}
                        ></${ViraTextArea}>
                    </div>

                    ${
                        isTaskOrRoutine
                            ? html`
                                  <!-- Consequence tier -->
                                  <div class="field">
                                      <span class="field-label"
                                          >Consequence Tier</span
                                      >
                                      <div class="tier-grid">
                                          ${(
                                              [1, 2, 3, 4] as ConsequenceTier[]
                                          ).map(
                                              (t) => html`
                                <${ViraButton.assign({
                                    text: `T${t}`,
                                    color: tierColor(t),
                                    buttonEmphasis:
                                        state.consequenceTier === t
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ consequenceTier: t })}
                                ></${ViraButton}>
                            `,
                                          )}
                                      </div>
                                      <div class="tier-help">
                                          <strong
                                              >${tierLabel(
                                                  state.consequenceTier,
                                              )}.</strong
                                          >
                                          ${tierDescription(
                                              state.consequenceTier,
                                          )}
                                      </div>
                                  </div>

                                  <!-- Time of day -->
                                  <div class="field">
                                      <span class="field-label"
                                          >Time of Day</span
                                      >
                                      <div class="tod-grid">
                                          ${TIME_OF_DAY_SLOTS.map(
                                              (slot) => html`
                                <${ViraButton.assign({
                                    text: timeOfDayLabel(slot),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis:
                                        state.timeOfDay === slot
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ timeOfDay: slot })}
                                ></${ViraButton}>
                            `,
                                          )}
                                      </div>
                                  </div>

                                  <!-- Recurring toggle — hidden for routines (always recurring) -->
                                  ${state.kind === "routine"
                                      ? html``
                                      : html`
                                            <div class="recurring-row">
                                                <input
                                                    id="recurring-toggle"
                                                    type="checkbox"
                                                    .checked=${state.isRecurring}
                                                    @change=${(e: Event) =>
                                                        updateState({
                                                            isRecurring: (
                                                                e.target as HTMLInputElement
                                                            ).checked,
                                                        })}
                                                />
                                                <label for="recurring-toggle"
                                                    >Recurring commitment</label
                                                >
                                            </div>
                                        `}

                                  <!-- Window type — relevant for ALL task/routine kinds (recurring or not) -->
                                  ${isTaskOrRoutine
                                      ? html`
                        <div class="field">
                            <span class="field-label">Timing Type</span>
                            <div class="seg">
                                <${ViraButton.assign({
                                    text: "Flexible window",
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis:
                                        state.windowType === "flexible"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ windowType: "flexible" })}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: "Hard date",
                                    color: ViraColorVariant.Warning,
                                    buttonEmphasis:
                                        state.windowType === "hard"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ windowType: "hard" })}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: "Milestone",
                                    color: ViraColorVariant.Neutral,
                                    buttonEmphasis:
                                        state.windowType === "milestone"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ windowType: "milestone" })}
                                ></${ViraButton}>
                            </div>
                        </div>
                    `
                                      : html``}

                                  <!-- Progress cadence — only for milestone window type -->
                                  ${state.windowType === "milestone" && isTaskOrRoutine
                                      ? html`
                                            <div class="field">
                                                <span class="field-label">Progress Cadence</span>
                                                <div class="seg" style="grid-template-columns: repeat(2, 1fr);">
                                                    <${ViraButton.assign({
                                                        text: "Once per day",
                                                        color: ViraColorVariant.Info,
                                                        buttonEmphasis: !state.hasProgressCadence
                                                            ? ViraEmphasis.Standard
                                                            : ViraEmphasis.Subtle,
                                                        buttonSize: ViraSize.Small,
                                                    })}
                                                        @click=${() => updateState({ hasProgressCadence: false })}
                                                    ></${ViraButton}>
                                                    <${ViraButton.assign({
                                                        text: "Custom",
                                                        color: ViraColorVariant.Neutral,
                                                        buttonEmphasis: state.hasProgressCadence
                                                            ? ViraEmphasis.Standard
                                                            : ViraEmphasis.Subtle,
                                                        buttonSize: ViraSize.Small,
                                                    })}
                                                        @click=${() => updateState({ hasProgressCadence: true })}
                                                    ></${ViraButton}>
                                                </div>
                                                ${state.hasProgressCadence ? html`
                                                    <${CadencePickerElement.assign({
                                                        config: state.progressCadenceConfig,
                                                    })}
                                                        ${listen(CadencePickerElement.events.cadenceChange, (e) =>
                                                            updateState({ progressCadenceConfig: e.detail }),
                                                        )}
                                                    ></${CadencePickerElement}>
                                                ` : html``}
                                            </div>
                                        `
                                      : html``}

                                  <!-- Date fields — only for one-time (non-recurring) tasks -->
                                  ${!state.isRecurring && isTaskOrRoutine
                                      ? html`
                                            ${state.windowType !== "milestone"
                                                ? html`
                                                      <div class="field">
                                                          <span
                                                              class="field-label"
                                                          >
                                                              ${state.windowType ===
                                                              "hard"
                                                                  ? "Date *"
                                                                  : "Suggested Date (optional)"}
                                                          </span>
                                                          <input
                                                              type="date"
                                                              .value=${state.suggestedDate}
                                                              @input=${(
                                                                  e: Event,
                                                              ) =>
                                                                  updateState({
                                                                      suggestedDate:
                                                                          (
                                                                              e.target as HTMLInputElement
                                                                          )
                                                                              .value,
                                                                  })}
                                                          />
                                                      </div>
                                                  `
                                                : html``}
                                        `
                                      : html``}

                                  <!-- Lead time — applies to all task types -->
                                  ${isTaskOrRoutine
                                      ? html`
                        <div class="field">
                            <span class="field-label">Lead Time</span>
                            <div class="seg" style="grid-template-columns: repeat(3, 1fr);">
                                <${ViraButton.assign({
                                    text: "Default",
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis:
                                        state.leadTimeMode === "default"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ leadTimeMode: "default" })}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: "None",
                                    color: ViraColorVariant.Neutral,
                                    buttonEmphasis:
                                        state.leadTimeMode === "none"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ leadTimeMode: "none" })}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: "Custom",
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis:
                                        state.leadTimeMode === "custom"
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ leadTimeMode: "custom" })}
                                ></${ViraButton}>
                            </div>
                            <div class="tier-help">
                                ${
                                    state.leadTimeMode === "none"
                                        ? "Hidden until due — only appears the day it's needed."
                                        : state.leadTimeMode === "custom"
                                          ? `Shows up ${state.leadTimeCustomDays} day${state.leadTimeCustomDays !== 1 ? "s" : ""} before due.`
                                          : "Uses standard urgency-band timing."
                                }
                            </div>
                        </div>
                        ${
                            state.leadTimeMode === "custom"
                                ? html`
                        <div class="field">
                            <span class="field-label">Days before due</span>
                            <span class="dom-input">
                                <${ViraInput.assign({
                                    value: String(state.leadTimeCustomDays),
                                    type: ViraInputType.Number,
                                    placeholder: "7",
                                })}
                                    ${listen(
                                        ViraInput.events.valueChange,
                                        (e) => {
                                            const n = parseInt(e.detail, 10);
                                            if (
                                                !Number.isNaN(n) &&
                                                n >= 0 &&
                                                n <= 365
                                            ) {
                                                updateState({
                                                    leadTimeCustomDays: n,
                                                });
                                            }
                                        },
                                    )}
                                ></${ViraInput}>
                            </span>
                        </div>
                        `
                                : html``
                        }
                    `
                                      : html``}

                                  <!-- Disable snooze toggle — tasks/routines only -->
                                  ${isTaskOrRoutine
                                      ? html`
                                            <div class="recurring-row">
                                                <input
                                                    id="disable-snooze-toggle"
                                                    type="checkbox"
                                                    .checked=${isNaturallyNotSnoozable ||
                                                    state.disableSnooze}
                                                    ?disabled=${isNaturallyNotSnoozable}
                                                    @change=${(e: Event) => {
                                                        if (
                                                            !isNaturallyNotSnoozable
                                                        ) {
                                                            updateState({
                                                                disableSnooze: (
                                                                    e.target as HTMLInputElement
                                                                ).checked,
                                                            });
                                                        }
                                                    }}
                                                />
                                                <label
                                                    for="disable-snooze-toggle"
                                                    style=${isNaturallyNotSnoozable
                                                        ? "opacity:0.5"
                                                        : ""}
                                                    >Disable
                                                    snooze${isNaturallyNotSnoozable
                                                        ? html`&nbsp;<span
                                                                  class="tier-help"
                                                                  style="display:inline;"
                                                                  >(daily
                                                                  routines
                                                                  cannot be
                                                                  snoozed)</span
                                                              >`
                                                        : html``}</label
                                                >
                                            </div>
                                        `
                                      : html``}
                                  ${state.isRecurring
                                      ? html`
                                          <${CadencePickerElement.assign({
                                              config: state.cadenceConfig,
                                          })}
                                              ${listen(CadencePickerElement.events.cadenceChange, (e) =>
                                                  updateState({ cadenceConfig: e.detail }),
                                              )}
                                          ></${CadencePickerElement}>

                        <!-- Start date -->
                        <div class="end-condition-section">
                            <div class="recurring-row">
                                <input
                                    id="start-date-toggle"
                                    type="checkbox"
                                    .checked=${state.hasStartDate}
                                    @change=${(e: Event) =>
                                        updateState({
                                            hasStartDate: (
                                                e.target as HTMLInputElement
                                            ).checked,
                                        })}
                                />
                                <label for="start-date-toggle">Has a start date (don't show until then)</label>
                            </div>
                            ${
                                state.hasStartDate
                                    ? html`
                                          <div class="field">
                                              <span class="field-label"
                                                  >Start Date</span
                                              >
                                              <input
                                                  type="date"
                                                  .value=${state.startDate}
                                                  @input=${(e: Event) =>
                                                      updateState({
                                                          startDate: (
                                                              e.target as HTMLInputElement
                                                          ).value,
                                                      })}
                                              />
                                          </div>
                                      `
                                    : html``
                            }
                        </div>

                        <!-- Pause — edit mode only -->
                        ${
                            isEditMode
                                ? html`
                                      <div class="end-condition-section">
                                          <div class="field">
                                              <span class="field-label"
                                                  >Pause Commitment</span
                                              >
                                              <div
                                                  class="seg"
                                                  style="grid-template-columns: repeat(4, 1fr);"
                                              >
                                                  ${(
                                                      [
                                                          "none",
                                                          "indefinite",
                                                          "until_date",
                                                          "for_days",
                                                      ] as const
                                                  ).map(
                                                      (m) => html`
                                        <${ViraButton.assign({
                                            text:
                                                m === "none"
                                                    ? "No"
                                                    : m === "indefinite"
                                                      ? "Indefinitely"
                                                      : m === "until_date"
                                                        ? "Until date"
                                                        : "For N days",
                                            color:
                                                m === "none"
                                                    ? ViraColorVariant.Info
                                                    : ViraColorVariant.Warning,
                                            buttonEmphasis:
                                                state.pauseMode === m
                                                    ? ViraEmphasis.Standard
                                                    : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({ pauseMode: m })}
                                        ></${ViraButton}>
                                    `,
                                                  )}
                                              </div>
                                          </div>
                                          ${state.pauseMode === "until_date"
                                              ? html`
                                                    <div class="field">
                                                        <span
                                                            class="field-label"
                                                            >Pause Until</span
                                                        >
                                                        <input
                                                            type="date"
                                                            .value=${state.pauseUntilDate}
                                                            @input=${(
                                                                e: Event,
                                                            ) =>
                                                                updateState({
                                                                    pauseUntilDate:
                                                                        (
                                                                            e.target as HTMLInputElement
                                                                        ).value,
                                                                })}
                                                        />
                                                    </div>
                                                `
                                              : state.pauseMode === "for_days"
                                                ? html`
                                <div class="field">
                                    <span class="field-label">Pause For (days)</span>
                                    <span class="dom-input">
                                        <${ViraInput.assign({
                                            value: String(state.pauseForDays),
                                            type: ViraInputType.Number,
                                            placeholder: "e.g. 14",
                                        })}
                                            ${listen(
                                                ViraInput.events.valueChange,
                                                (e) => {
                                                    const n = parseInt(
                                                        e.detail,
                                                        10,
                                                    );
                                                    if (
                                                        !Number.isNaN(n) &&
                                                        n >= 1
                                                    )
                                                        updateState({
                                                            pauseForDays: n,
                                                        });
                                                },
                                            )}
                                        ></${ViraInput}>
                                    </span>
                                </div>
                            `
                                                : html``}
                                      </div>
                                  `
                                : html``
                        }

                        <!-- End condition — hidden for routines (they never end) -->
                        ${
                            state.kind === "routine"
                                ? html``
                                : html`
                                      <div class="end-condition-section">
                                          <div class="recurring-row">
                                              <input
                                                  id="end-condition-toggle"
                                                  type="checkbox"
                                                  .checked=${state.hasEndCondition}
                                                  @change=${(e: Event) =>
                                                      updateState({
                                                          hasEndCondition: (
                                                              e.target as HTMLInputElement
                                                          ).checked,
                                                      })}
                                              />
                                              <label for="end-condition-toggle"
                                                  >Has an end condition</label
                                              >
                                          </div>

                                          ${state.hasEndCondition
                                              ? html`
                                <div class="field">
                                    <span class="field-label">End After</span>
                                    <div class="seg">
                                        <${ViraButton.assign({
                                            text: "N completions",
                                            color: ViraColorVariant.Neutral,
                                            buttonEmphasis:
                                                state.endMode === "after_count"
                                                    ? ViraEmphasis.Standard
                                                    : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({ endMode: "after_count" })}
                                        ></${ViraButton}>
                                        <${ViraButton.assign({
                                            text: "A date",
                                            color: ViraColorVariant.Neutral,
                                            buttonEmphasis:
                                                state.endMode === "after_date"
                                                    ? ViraEmphasis.Standard
                                                    : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({ endMode: "after_date" })}
                                        ></${ViraButton}>
                                    </div>
                                </div>

                                ${
                                    state.endMode === "after_count"
                                        ? html`
                                    <div class="field">
                                        <span class="field-label">Number of Completions</span>
                                        <${ViraInput.assign({
                                            value: String(state.endAfterCount),
                                            type: ViraInputType.Number,
                                            placeholder: "e.g. 10",
                                        })}
                                            ${listen(
                                                ViraInput.events.valueChange,
                                                (e) => {
                                                    const n = parseInt(
                                                        e.detail,
                                                        10,
                                                    );
                                                    if (
                                                        !Number.isNaN(n) &&
                                                        n >= 1
                                                    ) {
                                                        updateState({
                                                            endAfterCount: n,
                                                        });
                                                    }
                                                },
                                            )}
                                        ></${ViraInput}>
                                    </div>
                                `
                                        : html`
                                              <div class="field">
                                                  <span class="field-label"
                                                      >Last Day
                                                      (inclusive)</span
                                                  >
                                                  <input
                                                      type="date"
                                                      .value=${state.endAfterDate}
                                                      @input=${(e: Event) =>
                                                          updateState({
                                                              endAfterDate: (
                                                                  e.target as HTMLInputElement
                                                              ).value,
                                                          })}
                                                  />
                                              </div>
                                          `
                                }
                            `
                                              : html``}
                                      </div>
                                  `
                        }
                                      `
                                      : html``}
                                      `
                                      : html``}

                    <!-- Goal: optional target date -->
                    ${
                        state.kind === "goal"
                            ? html`
                                  <div class="field">
                                      <span class="field-label"
                                          >Target Date (optional)</span
                                      >
                                      <input
                                          type="date"
                                          .value=${state.goalTargetDate}
                                          @input=${(e: Event) =>
                                              updateState({
                                                  goalTargetDate: (
                                                      e.target as HTMLInputElement
                                                  ).value,
                                              })}
                                      />
                                  </div>
                              `
                            : html``
                    }

                    <!-- Idea: optional linked goal -->
                    ${
                        state.kind === "idea"
                            ? html`
                                  <div class="field">
                                      <label class="field-label"
                                          >Linked Goal (optional)</label
                                      >
                                      <select
                                          class="area-select"
                                          .value=${state.ideaLinkedGoalId ?? ""}
                                          @change=${(e: Event) => {
                                              const val = (
                                                  e.target as HTMLSelectElement
                                              ).value;
                                              updateState({
                                                  ideaLinkedGoalId:
                                                      val === "" ? null : val,
                                              });
                                          }}
                                      >
                                          <option value="">— None —</option>
                                          ${(inputs.goals ?? [])
                                              .filter(
                                                  (g) =>
                                                      g.status === "active" &&
                                                      (state.selectedAreaId ===
                                                          null ||
                                                          g.areaId ===
                                                              state.selectedAreaId),
                                              )
                                              .map(
                                                  (g) => html`
                                                      <option
                                                          value="${g.id}"
                                                          .selected=${state.ideaLinkedGoalId ===
                                                          g.id}
                                                      >
                                                          ${g.title}
                                                      </option>
                                                  `,
                                              )}
                                      </select>
                                  </div>
                              `
                            : html``
                    }

                    <!-- Task / Routine: optional linked objective -->
                    ${
                        isTaskOrRoutine
                            ? html`
                                  ${(() => {
                                      const availableGoals = (
                                          inputs.goals ?? []
                                      ).filter(
                                          (g) =>
                                              g.status === "active" &&
                                              (state.selectedAreaId === null ||
                                                  g.areaId ===
                                                      state.selectedAreaId),
                                      );
                                      return availableGoals.length > 0
                                          ? html`
                                                <div class="field">
                                                    <label class="field-label"
                                                        >Linked Objective
                                                        (optional)</label
                                                    >
                                                    <select
                                                        class="area-select"
                                                        .value=${state.linkedGoalId ??
                                                        ""}
                                                        @change=${(
                                                            e: Event,
                                                        ) => {
                                                            const val = (
                                                                e.target as HTMLSelectElement
                                                            ).value;
                                                            updateState({
                                                                linkedGoalId:
                                                                    val === ""
                                                                        ? null
                                                                        : val,
                                                            });
                                                        }}
                                                    >
                                                        <option value="">
                                                            — None —
                                                        </option>
                                                        ${availableGoals.map(
                                                            (g) => html`
                                                                <option
                                                                    value="${g.id}"
                                                                    .selected=${state.linkedGoalId ===
                                                                    g.id}
                                                                >
                                                                    ${g.title}
                                                                </option>
                                                            `,
                                                        )}
                                                    </select>
                                                </div>
                                            `
                                          : html``;
                                  })()}
                              `
                            : html``
                    }

                    <!-- Area of Responsibility assignment — always last, always visible -->
                    <div class="field">
                        <label class="field-label">Area of Responsibility</label>
                        <select
                            class="area-select"
                            .value=${state.selectedAreaId ?? ""}
                            @change=${(e: Event) => {
                                const val = (e.target as HTMLSelectElement)
                                    .value;
                                // Changing area clears both goal links (goals are area-scoped)
                                updateState({
                                    selectedAreaId: val === "" ? null : val,
                                    linkedGoalId: null,
                                    ideaLinkedGoalId: null,
                                });
                            }}
                        >
                            <option value="">No area</option>
                            ${(inputs.areas ?? []).map(
                                (p) => html`
                                    <option
                                        value="${p.id}"
                                        .selected=${state.selectedAreaId ===
                                        p.id}
                                    >
                                        ${p.name}
                                    </option>
                                `,
                            )}
                        </select>
                    </div>

                    ${
                        isEditMode
                            ? html`
                                  <div class="delete-section">
                                      ${state.confirmingDelete
                                          ? html`
                                                <div class="delete-confirm-row">
                                                    <span
                                                        class="delete-confirm-label"
                                                    >
                                                        ${state.kind === "goal"
                                                            ? skin.actions
                                                                  .deleteGoalConfirm
                                                            : state.kind ===
                                                                "idea"
                                                              ? skin.actions
                                                                    .deleteIdeaConfirm
                                                              : state.kind ===
                                                                  "routine"
                                                                ? skin.actions
                                                                      .deleteRoutineConfirm
                                                                : skin.actions
                                                                      .deleteTaskConfirm}
                                                    </span>
                                                    <button
                                                        class="delete-confirm-yes"
                                                        @click=${() => {
                                                            if (
                                                                state.kind ===
                                                                    "goal" &&
                                                                editGoal
                                                            ) {
                                                                dispatch(
                                                                    new events.goalDeleted(
                                                                        editGoal.id,
                                                                    ),
                                                                );
                                                            } else if (
                                                                state.kind ===
                                                                    "idea" &&
                                                                editIdea
                                                            ) {
                                                                dispatch(
                                                                    new events.ideaDeleted(
                                                                        editIdea.id,
                                                                    ),
                                                                );
                                                            } else if (
                                                                editTask
                                                            ) {
                                                                dispatch(
                                                                    new events.taskDeleted(
                                                                        editTask.id,
                                                                    ),
                                                                );
                                                            }
                                                            updateState({
                                                                currentEditId:
                                                                    null,
                                                                confirmingDelete: false,
                                                            });
                                                        }}
                                                    >
                                                        ${state.kind === "goal"
                                                            ? skin.actions
                                                                  .deleteGoalBtn
                                                            : state.kind ===
                                                                "idea"
                                                              ? skin.actions
                                                                    .deleteIdeaBtn
                                                              : state.kind ===
                                                                  "routine"
                                                                ? skin.actions
                                                                      .deleteRoutineBtn
                                                                : skin.actions
                                                                      .deleteTaskBtn}
                                                    </button>
                                                    <button
                                                        class="delete-confirm-no"
                                                        @click=${() =>
                                                            updateState({
                                                                confirmingDelete: false,
                                                            })}
                                                    >
                                                        CANCEL
                                                    </button>
                                                </div>
                                            `
                                          : html`
                                                <button
                                                    class="task-delete-btn"
                                                    @click=${() =>
                                                        updateState({
                                                            confirmingDelete: true,
                                                        })}
                                                >
                                                    ${state.kind === "goal"
                                                        ? skin.actions
                                                              .deleteGoalLabel
                                                        : state.kind === "idea"
                                                          ? skin.actions
                                                                .deleteIdeaLabel
                                                          : state.kind ===
                                                              "routine"
                                                            ? skin.actions
                                                                  .deleteRoutineLabel
                                                            : skin.actions
                                                                  .deleteTaskLabel}
                                                </button>
                                            `}
                                  </div>
                              `
                            : html``
                    }

                    <div class="actions">
                        <${ViraButton.assign({
                            text: "Cancel",
                            color: ViraColorVariant.Neutral,
                            buttonEmphasis: ViraEmphasis.Subtle,
                        })}
                            @click=${() => {
                                dispatch(new events.cancelled());
                                updateState({
                                    currentEditId: null,
                                    confirmingDelete: false,
                                });
                            }}
                        ></${ViraButton}>
                        <span class="grow">
                            <${ViraButton.assign({
                                text: isEditMode
                                    ? state.kind === "routine"
                                        ? skin.actions.saveRoutine
                                        : state.kind === "goal"
                                          ? skin.actions.saveGoal
                                          : state.kind === "idea"
                                            ? skin.actions.saveIdea
                                            : skin.actions.saveTask
                                    : state.kind === "routine"
                                      ? skin.actions.submitRoutine
                                      : state.kind === "goal"
                                        ? skin.actions.submitGoal
                                        : state.kind === "idea"
                                          ? skin.actions.submitIdea
                                          : skin.actions.submitTask,
                                color: ViraColorVariant.Info,
                                isDisabled: !canSubmit,
                            })}
                                @click=${submit}
                            ></${ViraButton}>
                        </span>
                    </div>
                </div>
            </div>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function tierColor(tier: ConsequenceTier): ViraColorVariant {
    switch (tier) {
        case 1:
            return ViraColorVariant.Danger;
        case 2:
            return ViraColorVariant.Warning;
        case 3:
            return ViraColorVariant.Info;
        case 4:
            return ViraColorVariant.Neutral;
    }
}

