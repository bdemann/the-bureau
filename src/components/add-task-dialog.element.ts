import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {
    ViraButton,
    ViraColorVariant,
    ViraEmphasis,
    ViraInput,
    ViraInputType,
    ViraSelect,
    ViraSize,
    ViraTextArea,
} from 'vira';
import type {
    ConsequenceTier,
    ItemKind,
    Project,
    RecurrenceCadence,
    RecurrenceConfig,
    RecurrenceEndMode,
    ScheduleMode,
    Task,
    TimeOfDay,
    WindowType,
} from '../data/types.js';

function msToDateString(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
import {TIME_OF_DAY_SLOTS, cadenceLabel, isMultiplePerPeriodCadence, tierDescription, tierLabel, timeOfDayLabel} from '../data/types.js';
import {generateId, startOfDay} from '../data/storage.js';
import {initialiseRecurrence} from '../data/recurrence.js';

// ─────────────────────────────────────────────────────────────────────────────
// AddTaskDialogElement
// Bottom-sheet form for filing a new task. Phase 2: collects consequence tier,
// recurrence config (cadence, frequency, schedule mode), window type, and
// suggested / hard date.
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CADENCES: RecurrenceCadence[] = [
    'multiple_per_day',
    'daily',
    'multiple_per_week',
    'weekly',
    'multiple_per_month',
    'monthly',
    'multiple_per_quarter',
    'quarterly',
    'multiple_per_year',
    'yearly',
];

export const AddTaskDialogElement = defineElement<{
    projectId: string | null;
    open: boolean;
    editTask?: Task | null;
    projects?: ReadonlyArray<Project>;
}>()({
    tagName: 'add-task-dialog',

    events: {
        taskSubmitted: defineElementEvent<Task>(),
        taskUpdated:   defineElementEvent<Task>(),
        taskDeleted:   defineElementEvent<string>(),  // task id
        cancelled:     defineElementEvent<void>(),
    },

    state: () => ({
        kind: 'task' as ItemKind,
        titleValue: '',
        description: '',
        consequenceTier: 3 as ConsequenceTier,
        timeOfDay: 'anytime' as TimeOfDay,
        isRecurring: false,
        cadence: 'weekly' as RecurrenceCadence,
        frequencyPerPeriod: 2,
        scheduleMode: 'fixed' as ScheduleMode,
        windowType: 'hard' as WindowType,
        suggestedDate: msToDateString(Date.now()),  // YYYY-MM-DD
        // ── Recurrence anchor (only relevant when isRecurring=true) ──
        /** Selected days of the week for weekly multi-select (0=Sun…6=Sat). */
        daysOfWeek: new Set<number>([1, 2, 3, 4, 5]), // default weekdays
        /** 0–6 (Sun–Sat) for monthly ordinal only. */
        dayOfWeek: 4,              // default Thursday
        /** 1–31 for monthly when monthAnchorMode='dom'. */
        dayOfMonth: 1,
        /** 'dom' = day-of-month (e.g., 15th); 'ordinal' = Nth weekday (e.g., 3rd Thu). */
        monthAnchorMode: 'dom' as 'dom' | 'ordinal',
        /** 1|2|3|4|-1 for "1st/2nd/3rd/4th/last". */
        ordinalWeek: 3 as 1 | 2 | 3 | 4 | -1,
        /** ID of the task currently being edited; null means add mode. */
        currentEditId: null as string | null,
        confirmingDelete: false,
        /** Which operation this task belongs to; null = no operation. */
        selectedProjectId: null as string | null,
        /** Tracks open transitions so add-mode form resets on each open. */
        wasOpen: false,
        // ── End condition ──
        hasEndCondition: false,
        endMode: 'after_count' as 'after_count' | 'after_date',
        endAfterCount: 10,
        endAfterDate: '',  // YYYY-MM-DD
    }),

    styles: css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(27, 42, 74, 0.65);
            z-index: 200;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        :host *, :host *::before, :host *::after { box-sizing: border-box; }

        .sheet {
            background: #F5EFE0;
            width: 100%;
            max-width: 600px;
            border-top: 4px solid #C41E3A;
            padding: 20px 20px 32px;
            animation: sheet-in 0.2s ease-out;
            max-height: 90vh;
            overflow-y: auto;
        }

        @keyframes sheet-in {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }

        .sheet-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: #1B2A4A;
            border-bottom: 1px solid rgba(0,0,0,0.15);
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
            color: #6B6B6B;
            margin-bottom: 4px;
            font-family: 'Courier Prime', monospace;
        }

        /* Vira inputs are inline-flex by default; expand them to full width inside our sheet */
        ${ViraInput}, ${ViraTextArea}, ${ViraSelect} {
            width: 100%;
        }

        /* Native date input — Vira doesn't ship a date picker. */
        input[type="date"] {
            width: 100%;
            background: #FFFDF7;
            border: 1px solid rgba(0,0,0,0.25);
            padding: 8px 10px;
            font-family: 'Courier Prime', 'Courier New', monospace;
            font-size: 0.9rem;
            color: #2C2C2C;
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input[type="date"]:focus { border-color: #1B2A4A; }

        .tier-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
        }

        .tier-grid ${ViraButton} {
            width: 100%;
        }

        .tod-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }

        .tod-grid ${ViraButton} {
            width: 100%;
        }

        .tier-help {
            margin-top: 6px;
            font-size: 0.72rem;
            color: #6B6B6B;
            font-family: 'Courier Prime', monospace;
            min-height: 1.1em;
        }

        .seg {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        .seg ${ViraButton} { width: 100%; }

        .recurring-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
        }
        .recurring-row label {
            font-family: 'Courier Prime', monospace;
            font-size: 0.85rem;
            color: #2C2C2C;
            cursor: pointer;
            user-select: none;
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .grow { flex: 1; }

        /* Day-of-week segmented picker (Sun..Sat) */
        .dow-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .dow-grid ${ViraButton} { width: 100%; }

        /* Ordinal-week segmented picker (1st..4th, Last) */
        .ord-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
        }
        .ord-grid ${ViraButton} { width: 100%; }

        /* Day-of-month numeric input (narrow) */
        .dom-input { max-width: 8ch; }

        .anchor-summary {
            margin-top: 6px;
            font-size: 0.72rem;
            color: #6B6B6B;
            font-family: 'Courier Prime', monospace;
        }

        .end-condition-section {
            border-top: 1px dashed rgba(0,0,0,0.15);
            padding-top: 12px;
            margin-top: 4px;
        }

        .kind-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 16px;
        }
        .kind-toggle ${ViraButton} { width: 100%; }

        .operation-select {
            width: 100%;
            font-family: 'Special Elite', serif;
            font-size: 0.9rem;
            background: #FDFAF5;
            border: 1px solid rgba(0,0,0,0.2);
            padding: 8px 10px;
            color: #2C2C2C;
            appearance: none;
            cursor: pointer;
            box-sizing: border-box;
        }
        .operation-select:focus { outline: none; border-color: #1B2A4A; }

        .delete-section {
            border-top: 1px solid rgba(196,30,58,0.2);
            margin-top: 20px;
            padding-top: 14px;
        }

        .task-delete-btn {
            background: none;
            border: 1px solid #C41E3A;
            color: #C41E3A;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.2em;
            padding: 6px 14px;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }
        .task-delete-btn:hover { background: #C41E3A; color: #F5EFE0; }

        .delete-confirm-row {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .delete-confirm-label {
            font-family: 'Courier Prime', monospace;
            font-size: 0.78rem;
            color: #8B0000;
            flex: 1;
        }

        .delete-confirm-yes {
            background: #C41E3A;
            border: none;
            color: #F5EFE0;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .delete-confirm-yes:hover { background: #8B0000; }

        .delete-confirm-no {
            background: none;
            border: 1px solid #6B6B6B;
            color: #6B6B6B;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 6px 14px;
            cursor: pointer;
        }
        .delete-confirm-no:hover { background: rgba(0,0,0,0.05); }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        // Reset wasOpen when dialog closes so the next open is treated as fresh.
        if (!inputs.open) {
            if (state.wasOpen) updateState({wasOpen: false});
            return html``;
        }

        const editTask = inputs.editTask ?? null;
        const isEditMode = editTask !== null;

        // On first render for a new editTask, populate form state from the task.
        // updateState is in-place, so state is immediately correct for the rest of render.
        if (isEditMode && state.currentEditId !== editTask.id) {
            const t = editTask;
            const cfg = t.recurrence;
            updateState({
                currentEditId: t.id,
                wasOpen: true,
                confirmingDelete: false,
                selectedProjectId: t.projectId,
                kind: t.kind ?? 'task',
                titleValue: t.title,
                description: t.description,
                timeOfDay: t.timeOfDay ?? 'anytime',
                consequenceTier: t.consequenceTier,
                isRecurring: cfg !== null,
                cadence: cfg?.cadence ?? 'weekly',
                frequencyPerPeriod: cfg?.frequencyPerPeriod ?? 2,
                scheduleMode: cfg?.scheduleMode ?? 'fixed',
                windowType: t.windowType,
                daysOfWeek: new Set<number>(
                    cfg?.hardDaysOfWeek
                    ?? (cfg?.hardDayOfWeek !== undefined ? [cfg.hardDayOfWeek] : [1, 2, 3, 4, 5])
                ),
                dayOfWeek: cfg?.hardDayOfWeek ?? 4,
                dayOfMonth: cfg?.hardDayOfMonth ?? 1,
                monthAnchorMode: cfg?.ordinalWeek !== undefined ? 'ordinal' : 'dom',
                ordinalWeek: cfg?.ordinalWeek ?? 3,
                suggestedDate: t.suggestedDate ? msToDateString(t.suggestedDate) : '',
                hasEndCondition: cfg !== null && (cfg.endMode ?? 'never') !== 'never',
                endMode: (cfg?.endMode === 'after_date' ? 'after_date' : 'after_count'),
                endAfterCount: cfg?.endAfterCount ?? 10,
                endAfterDate: cfg?.endAfterDate ? msToDateString(cfg.endAfterDate) : '',
            });
        }

        // When dialog opens fresh in add mode, reset the form and seed the project selection.
        if (!isEditMode && !state.wasOpen) {
            updateState({
                wasOpen: true,
                selectedProjectId: inputs.projectId,
                titleValue: '',
                description: '',
                kind: 'task',
                consequenceTier: 3,
                timeOfDay: 'anytime',
                isRecurring: false,
                cadence: 'weekly',
                frequencyPerPeriod: 2,
                scheduleMode: 'fixed',
                windowType: 'hard',
                suggestedDate: msToDateString(Date.now()),
                daysOfWeek: new Set<number>([1, 2, 3, 4, 5]),
                dayOfWeek: 4,
                dayOfMonth: 1,
                monthAnchorMode: 'dom',
                ordinalWeek: 3,
                hasEndCondition: false,
                endMode: 'after_count',
                endAfterCount: 10,
                endAfterDate: '',
                confirmingDelete: false,
                currentEditId: null,
            });
        }


        const isMulti = state.isRecurring && isMultiplePerPeriodCadence(state.cadence);

        // When recurring weekly/monthly the user picks an anchor (day-of-week or
        // day-of-month / ordinal weekday) instead of a calendar date — the engine
        // computes the first occurrence from there.
        const usesWeeklyAnchor = state.isRecurring && state.cadence === 'weekly';
        const usesMonthlyAnchor = state.isRecurring && state.cadence === 'monthly';
        const usesAnchor = usesWeeklyAnchor || usesMonthlyAnchor;

        const canSubmit = state.titleValue.trim().length > 0
            // Hard-date tasks need a date — unless an anchor implies one.
            && (state.windowType !== 'hard' || usesAnchor || state.suggestedDate.length > 0)
            // Weekly anchor requires at least one day selected.
            && (!usesWeeklyAnchor || state.daysOfWeek.size > 0);

        function submit(): void {
            if (!canSubmit) return;

            const today = new Date();
            const suggestedMs = state.suggestedDate
                ? startOfDay(new Date(state.suggestedDate + 'T00:00')).getTime()
                : null;

            let recurrence = null;
            let currentPeriodStart: number | null = null;
            let suggestedDate: number | null = suggestedMs;
            let windowDeadline: number | null = null;
            let windowLengthDays: number | null = null;

            if (state.isRecurring) {
                let endMode: RecurrenceEndMode = 'never';
                let endAfterCount: number | undefined;
                let endAfterDate: number | undefined;
                if (state.hasEndCondition) {
                    endMode = state.endMode;
                    if (state.endMode === 'after_count') {
                        endAfterCount = Math.max(1, state.endAfterCount);
                    } else if (state.endMode === 'after_date' && state.endAfterDate) {
                        endAfterDate = startOfDay(new Date(state.endAfterDate + 'T00:00')).getTime();
                    }
                }

                const cfg: RecurrenceConfig = {
                    cadence: state.cadence,
                    frequencyPerPeriod: isMultiplePerPeriodCadence(state.cadence)
                        ? Math.max(2, state.frequencyPerPeriod)
                        : 1,
                    scheduleMode: state.scheduleMode,
                    endMode,
                    endAfterCount,
                    endAfterDate,
                };
                if (usesWeeklyAnchor) {
                    cfg.hardDaysOfWeek = [...state.daysOfWeek].sort((a, b) => a - b);
                } else if (usesMonthlyAnchor) {
                    if (state.monthAnchorMode === 'ordinal') {
                        cfg.hardDayOfWeek = state.dayOfWeek;
                        cfg.ordinalWeek = state.ordinalWeek;
                    } else {
                        cfg.hardDayOfMonth = state.dayOfMonth;
                    }
                }
                recurrence = cfg;
                const init = initialiseRecurrence(
                    {windowType: state.windowType, suggestedDate: usesAnchor ? null : suggestedMs},
                    cfg,
                    today,
                );
                currentPeriodStart = init.currentPeriodStart;
                suggestedDate = init.suggestedDate;
                windowDeadline = init.windowDeadline;
                windowLengthDays = init.windowLengthDays;
            }

            const baseTask = isEditMode ? editTask! : null;

            const task: Task = {
                // In edit mode: preserve identity and history fields.
                id: baseTask?.id ?? generateId(),
                projectId: state.selectedProjectId,
                createdAt: baseTask?.createdAt ?? Date.now(),
                snoozeCount: baseTask?.snoozeCount ?? 0,
                snoozedUntil: baseTask?.snoozedUntil ?? null,
                totalSnoozes: baseTask?.totalSnoozes ?? 0,
                totalSkips: baseTask?.totalSkips ?? 0,
                totalMisses: baseTask?.totalMisses ?? 0,
                missedAt: baseTask?.missedAt ?? null,
                taskCompletionStreak: baseTask?.taskCompletionStreak ?? 0,
                maxTaskCompletionStreak: baseTask?.maxTaskCompletionStreak ?? 0,
                skipStreak: baseTask?.skipStreak ?? 0,
                completedAt: baseTask?.completedAt ?? null,
                completionsThisPeriod: baseTask?.completionsThisPeriod ?? 0,
                totalCompletions: baseTask?.totalCompletions ?? 0,
                progressCount: baseTask?.progressCount ?? 0,
                // Editable fields:
                kind: state.kind,
                title: state.titleValue.trim(),
                description: state.description.trim(),
                timeOfDay: state.timeOfDay,
                consequenceTier: state.consequenceTier,
                windowType: state.windowType,
                suggestedDate,
                windowDeadline,
                windowLengthDays,
                recurrence,
                currentPeriodStart,
                // Legacy compatibility — retain deprecated dueDate field
                dueDate: suggestedDate,
            };

            if (isEditMode) {
                dispatch(new events.taskUpdated(task));
            } else {
                dispatch(new events.taskSubmitted(task));
            }

            // Reset
            updateState({
                kind: 'task',
                titleValue: '',
                description: '',
                consequenceTier: 3,
                timeOfDay: 'anytime',
                isRecurring: false,
                cadence: 'weekly',
                frequencyPerPeriod: 2,
                scheduleMode: 'rolling',
                windowType: 'hard',
                suggestedDate: msToDateString(Date.now()),
                daysOfWeek: new Set<number>([1, 2, 3, 4, 5]),
                dayOfWeek: 4,
                dayOfMonth: 1,
                monthAnchorMode: 'dom',
                ordinalWeek: 3,
                currentEditId: null,
                selectedProjectId: null,
                wasOpen: false,
                hasEndCondition: false,
                endMode: 'after_count',
                endAfterCount: 10,
                endAfterDate: '',
            });
        }

        return html`
            <div
                class="overlay"
                @click=${(e: Event) => {
                    if (e.target === e.currentTarget) {
                        dispatch(new events.cancelled());
                        updateState({currentEditId: null});
                    }
                }}
            >
                <div class="sheet">
                    <div class="sheet-title">
                        ${isEditMode
                            ? (state.kind === 'routine' ? 'AMEND ROUTINE' : 'AMEND DIRECTIVE')
                            : (state.kind === 'routine' ? 'FILE NEW ROUTINE' : 'FILE NEW DIRECTIVE')}
                    </div>

                    <!-- Kind toggle (Routine vs Task) -->
                    ${!isEditMode ? html`
                        <div class="kind-toggle">
                            <${ViraButton.assign({
                                text: 'Routine',
                                color: ViraColorVariant.Info,
                                buttonEmphasis: state.kind === 'routine'
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => updateState({kind: 'routine', isRecurring: true})}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: 'Directive',
                                color: ViraColorVariant.Info,
                                buttonEmphasis: state.kind === 'task'
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => updateState({kind: 'task'})}
                            ></${ViraButton}>
                        </div>
                    ` : html``}

                    <!-- Title -->
                    <div class="field">
                        <span class="field-label">Title *</span>
                        <${ViraInput.assign({
                            value: state.titleValue,
                            placeholder: 'Describe the directive clearly.',
                        })}
                            ${listen(ViraInput.events.valueChange, e =>
                                updateState({titleValue: e.detail}))}
                        ></${ViraInput}>
                    </div>

                    <!-- Description -->
                    <div class="field">
                        <span class="field-label">Details / Notes</span>
                        <${ViraTextArea.assign({
                            value: state.description,
                            placeholder: 'Additional context. Optional but encouraged.',
                            rows: 3,
                        })}
                            ${listen(ViraTextArea.events.valueChange, e =>
                                updateState({description: e.detail}))}
                        ></${ViraTextArea}>
                    </div>

                    <!-- Consequence tier -->
                    <div class="field">
                        <span class="field-label">Consequence Tier</span>
                        <div class="tier-grid">
                            ${([1, 2, 3, 4] as ConsequenceTier[]).map(t => html`
                                <${ViraButton.assign({
                                    text: `T${t}`,
                                    color: tierColor(t),
                                    buttonEmphasis: state.consequenceTier === t
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({consequenceTier: t})}
                                ></${ViraButton}>
                            `)}
                        </div>
                        <div class="tier-help">
                            <strong>${tierLabel(state.consequenceTier)}.</strong>
                            ${tierDescription(state.consequenceTier)}
                        </div>
                    </div>

                    <!-- Time of day -->
                    <div class="field">
                        <span class="field-label">Time of Day</span>
                        <div class="tod-grid">
                            ${TIME_OF_DAY_SLOTS.map(slot => html`
                                <${ViraButton.assign({
                                    text: timeOfDayLabel(slot),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.timeOfDay === slot
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({timeOfDay: slot})}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>

                    <!-- Recurring toggle — hidden for routines (always recurring) -->
                    ${state.kind === 'routine' ? html`` : html`
                        <div class="recurring-row">
                            <input
                                id="recurring-toggle"
                                type="checkbox"
                                .checked=${state.isRecurring}
                                @change=${(e: Event) =>
                                    updateState({isRecurring: (e.target as HTMLInputElement).checked})}
                            />
                            <label for="recurring-toggle">Recurring directive</label>
                        </div>
                    `}

                    <!-- Window type + date — only relevant for one-time tasks -->
                    ${state.isRecurring ? html`` : html`
                        <div class="field">
                            <span class="field-label">Timing Type</span>
                            <div class="seg">
                                <${ViraButton.assign({
                                    text: 'Flexible window',
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.windowType === 'flexible'
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({windowType: 'flexible'})}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: 'Hard date',
                                    color: ViraColorVariant.Warning,
                                    buttonEmphasis: state.windowType === 'hard'
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({windowType: 'hard'})}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: 'Milestone',
                                    color: ViraColorVariant.Neutral,
                                    buttonEmphasis: state.windowType === 'milestone'
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({windowType: 'milestone'})}
                                ></${ViraButton}>
                            </div>
                        </div>

                        ${state.windowType !== 'milestone' ? html`
                        <div class="field">
                            <span class="field-label">
                                ${state.windowType === 'hard'
                                    ? 'Date *'
                                    : 'Suggested Date (optional)'}
                            </span>
                            <input
                                type="date"
                                .value=${state.suggestedDate}
                                @input=${(e: Event) =>
                                    updateState({suggestedDate: (e.target as HTMLInputElement).value})}
                            />
                        </div>
                        ` : html``}
                    `}

                    ${state.isRecurring ? html`
                        <!-- Cadence -->
                        <div class="field">
                            <span class="field-label">Cadence</span>
                            <${ViraSelect.assign({
                                value: state.cadence,
                                options: ALL_CADENCES.map(c => ({
                                    value: c,
                                    label: cadenceLabel(c),
                                })),
                            })}
                                ${listen(ViraSelect.events.valueChange, e =>
                                    updateState({cadence: e.detail as RecurrenceCadence}))}
                            ></${ViraSelect}>
                        </div>

                        ${isMulti ? html`
                            <div class="field">
                                <span class="field-label">Times per period</span>
                                <${ViraInput.assign({
                                    value: String(state.frequencyPerPeriod),
                                    type: ViraInputType.Number,
                                    placeholder: 'e.g. 3',
                                })}
                                    ${listen(ViraInput.events.valueChange, e => {
                                        const n = parseInt(e.detail, 10);
                                        if (!Number.isNaN(n) && n >= 2 && n <= 99) {
                                            updateState({frequencyPerPeriod: n});
                                        }
                                    })}
                                ></${ViraInput}>
                            </div>
                        ` : html``}

                        <!-- Schedule mode -->
                        <div class="field">
                            <span class="field-label">Schedule Mode</span>
                            <div class="seg">
                                <${ViraButton.assign({
                                    text: 'Rolling',
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.scheduleMode === 'rolling'
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({scheduleMode: 'rolling'})}
                                ></${ViraButton}>
                                <${ViraButton.assign({
                                    text: 'Fixed',
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.scheduleMode === 'fixed'
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({scheduleMode: 'fixed'})}
                                ></${ViraButton}>
                            </div>
                        </div>

                        <!-- Day-of-week anchor (weekly only, multi-select) -->
                        ${usesWeeklyAnchor ? html`
                            <div class="field">
                                <span class="field-label">Days of Week</span>
                                <div class="dow-grid">
                                    ${DAY_LABELS.map(d => html`
                                        <${ViraButton.assign({
                                            text: d.label,
                                            color: ViraColorVariant.Info,
                                            buttonEmphasis: state.daysOfWeek.has(d.value)
                                                ? ViraEmphasis.Standard
                                                : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => {
                                                const next = new Set(state.daysOfWeek);
                                                if (next.has(d.value)) next.delete(d.value);
                                                else next.add(d.value);
                                                updateState({daysOfWeek: next});
                                            }}
                                        ></${ViraButton}>
                                    `)}
                                </div>
                                <div class="anchor-summary">
                                    ${formatSelectedDays(state.daysOfWeek)}
                                </div>
                            </div>
                        ` : html``}

                        <!-- Monthly anchor (monthly only): day-of-month vs ordinal weekday -->
                        ${usesMonthlyAnchor ? html`
                            <div class="field">
                                <span class="field-label">Anchor</span>
                                <div class="seg">
                                    <${ViraButton.assign({
                                        text: 'Day of month',
                                        color: ViraColorVariant.Info,
                                        buttonEmphasis: state.monthAnchorMode === 'dom'
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${() => updateState({monthAnchorMode: 'dom'})}
                                    ></${ViraButton}>
                                    <${ViraButton.assign({
                                        text: 'Nth weekday',
                                        color: ViraColorVariant.Info,
                                        buttonEmphasis: state.monthAnchorMode === 'ordinal'
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${() => updateState({monthAnchorMode: 'ordinal'})}
                                    ></${ViraButton}>
                                </div>
                            </div>

                            ${state.monthAnchorMode === 'dom' ? html`
                                <div class="field">
                                    <span class="field-label">Day of Month (1–31)</span>
                                    <span class="dom-input">
                                        <${ViraInput.assign({
                                            value: String(state.dayOfMonth),
                                            type: ViraInputType.Number,
                                            placeholder: 'e.g. 15',
                                        })}
                                            ${listen(ViraInput.events.valueChange, e => {
                                                const n = parseInt(e.detail, 10);
                                                if (!Number.isNaN(n) && n >= 1 && n <= 31) {
                                                    updateState({dayOfMonth: n});
                                                }
                                            })}
                                        ></${ViraInput}>
                                    </span>
                                    <div class="anchor-summary">
                                        The ${ordinalSuffix(state.dayOfMonth)} of each month.
                                    </div>
                                </div>
                            ` : html`
                                <div class="field">
                                    <span class="field-label">Which Occurrence</span>
                                    <div class="ord-grid">
                                        ${ORDINAL_LABELS.map(o => html`
                                            <${ViraButton.assign({
                                                text: o.label,
                                                color: ViraColorVariant.Info,
                                                buttonEmphasis: state.ordinalWeek === o.value
                                                    ? ViraEmphasis.Standard
                                                    : ViraEmphasis.Subtle,
                                                buttonSize: ViraSize.Small,
                                            })}
                                                @click=${() => updateState({ordinalWeek: o.value})}
                                            ></${ViraButton}>
                                        `)}
                                    </div>
                                </div>
                                <div class="field">
                                    <span class="field-label">Day of Week</span>
                                    <div class="dow-grid">
                                        ${DAY_LABELS.map(d => html`
                                            <${ViraButton.assign({
                                                text: d.label,
                                                color: ViraColorVariant.Info,
                                                buttonEmphasis: state.dayOfWeek === d.value
                                                    ? ViraEmphasis.Standard
                                                    : ViraEmphasis.Subtle,
                                                buttonSize: ViraSize.Small,
                                            })}
                                                @click=${() => updateState({dayOfWeek: d.value})}
                                            ></${ViraButton}>
                                        `)}
                                    </div>
                                    <div class="anchor-summary">
                                        The ${ordinalLabel(state.ordinalWeek)} ${dayName(state.dayOfWeek)} of each month.
                                    </div>
                                </div>
                            `}
                        ` : html``}

                        <!-- End condition — hidden for routines (they never end) -->
                        ${state.kind === 'routine' ? html`` : html`
                        <div class="end-condition-section">
                            <div class="recurring-row">
                                <input
                                    id="end-condition-toggle"
                                    type="checkbox"
                                    .checked=${state.hasEndCondition}
                                    @change=${(e: Event) =>
                                        updateState({hasEndCondition: (e.target as HTMLInputElement).checked})}
                                />
                                <label for="end-condition-toggle">Task has an end condition</label>
                            </div>

                            ${state.hasEndCondition ? html`
                                <div class="field">
                                    <span class="field-label">End After</span>
                                    <div class="seg">
                                        <${ViraButton.assign({
                                            text: 'N completions',
                                            color: ViraColorVariant.Neutral,
                                            buttonEmphasis: state.endMode === 'after_count'
                                                ? ViraEmphasis.Standard
                                                : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({endMode: 'after_count'})}
                                        ></${ViraButton}>
                                        <${ViraButton.assign({
                                            text: 'A date',
                                            color: ViraColorVariant.Neutral,
                                            buttonEmphasis: state.endMode === 'after_date'
                                                ? ViraEmphasis.Standard
                                                : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({endMode: 'after_date'})}
                                        ></${ViraButton}>
                                    </div>
                                </div>

                                ${state.endMode === 'after_count' ? html`
                                    <div class="field">
                                        <span class="field-label">Number of Completions</span>
                                        <${ViraInput.assign({
                                            value: String(state.endAfterCount),
                                            type: ViraInputType.Number,
                                            placeholder: 'e.g. 10',
                                        })}
                                            ${listen(ViraInput.events.valueChange, e => {
                                                const n = parseInt(e.detail, 10);
                                                if (!Number.isNaN(n) && n >= 1) {
                                                    updateState({endAfterCount: n});
                                                }
                                            })}
                                        ></${ViraInput}>
                                    </div>
                                ` : html`
                                    <div class="field">
                                        <span class="field-label">Last Day (inclusive)</span>
                                        <input
                                            type="date"
                                            .value=${state.endAfterDate}
                                            @input=${(e: Event) =>
                                                updateState({endAfterDate: (e.target as HTMLInputElement).value})}
                                        />
                                    </div>
                                `}
                            ` : html``}
                        </div>
                        `}
                    ` : html``}

                    <!-- Operation assignment — always last, always visible -->
                    <div class="field">
                        <label class="field-label">Operation</label>
                        <select
                            class="operation-select"
                            .value=${state.selectedProjectId ?? ''}
                            @change=${(e: Event) => {
                                const val = (e.target as HTMLSelectElement).value;
                                updateState({selectedProjectId: val === '' ? null : val});
                            }}
                        >
                            <option value="">No operation</option>
                            ${(inputs.projects ?? []).map(p => html`
                                <option
                                    value="${p.id}"
                                    .selected=${state.selectedProjectId === p.id}
                                >${p.name}</option>
                            `)}
                        </select>
                    </div>

                    ${isEditMode ? html`
                        <div class="delete-section">
                            ${state.confirmingDelete
                                ? html`
                                    <div class="delete-confirm-row">
                                        <span class="delete-confirm-label">PERMANENTLY TERMINATE THIS DIRECTIVE?</span>
                                        <button
                                            class="delete-confirm-yes"
                                            @click=${() => {
                                                dispatch(new events.taskDeleted(editTask!.id));
                                                updateState({currentEditId: null, confirmingDelete: false});
                                            }}
                                        >TERMINATE</button>
                                        <button
                                            class="delete-confirm-no"
                                            @click=${() => updateState({confirmingDelete: false})}
                                        >CANCEL</button>
                                    </div>
                                  `
                                : html`
                                    <button
                                        class="task-delete-btn"
                                        @click=${() => updateState({confirmingDelete: true})}
                                    >TERMINATE DIRECTIVE</button>
                                  `}
                        </div>
                    ` : html``}

                    <div class="actions">
                        <${ViraButton.assign({
                            text: 'Cancel',
                            color: ViraColorVariant.Neutral,
                            buttonEmphasis: ViraEmphasis.Subtle,
                        })}
                            @click=${() => {
                                dispatch(new events.cancelled());
                                updateState({currentEditId: null, confirmingDelete: false});
                            }}
                        ></${ViraButton}>
                        <span class="grow">
                            <${ViraButton.assign({
                                text: isEditMode
                                    ? 'SAVE CHANGES'
                                    : state.kind === 'routine' ? 'COMMIT ROUTINE' : 'FILE DIRECTIVE',
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
        case 1: return ViraColorVariant.Danger;
        case 2: return ViraColorVariant.Warning;
        case 3: return ViraColorVariant.Info;
        case 4: return ViraColorVariant.Neutral;
    }
}

const DAY_LABELS: ReadonlyArray<{value: number; label: string}> = [
    {value: 0, label: 'Sun'},
    {value: 1, label: 'Mon'},
    {value: 2, label: 'Tue'},
    {value: 3, label: 'Wed'},
    {value: 4, label: 'Thu'},
    {value: 5, label: 'Fri'},
    {value: 6, label: 'Sat'},
];

const ORDINAL_LABELS: ReadonlyArray<{value: 1 | 2 | 3 | 4 | -1; label: string}> = [
    {value: 1,  label: '1st'},
    {value: 2,  label: '2nd'},
    {value: 3,  label: '3rd'},
    {value: 4,  label: '4th'},
    {value: -1, label: 'Last'},
];

function dayName(dow: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow] ?? '?';
}

function formatSelectedDays(days: Set<number>): string {
    if (days.size === 0) return 'No days selected.';
    if (days.size === 7) return 'Every day.';
    if (days.size === 5 && !days.has(0) && !days.has(6)) return 'Every weekday (Mon–Fri).';
    if (days.size === 6 && !days.has(0)) return 'Every day except Sunday.';
    if (days.size === 6 && !days.has(6)) return 'Every day except Saturday.';
    const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return [...days].sort((a, b) => a - b).map(d => SHORT[d]).join(', ') + '.';
}

function ordinalLabel(ord: 1 | 2 | 3 | 4 | -1): string {
    if (ord === -1) return 'last';
    if (ord === 1)  return '1st';
    if (ord === 2)  return '2nd';
    if (ord === 3)  return '3rd';
    return '4th';
}

function ordinalSuffix(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n}st`;
    if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
    return `${n}th`;
}

