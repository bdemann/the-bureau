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
    RecurrenceCadence,
    RecurrenceConfig,
    ScheduleMode,
    Task,
    WindowType,
} from '../data/types.js';
import {cadenceLabel, isMultiplePerPeriodCadence, tierDescription, tierLabel} from '../data/types.js';
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
    projectId: string;
    open: boolean;
}>()({
    tagName: 'add-task-dialog',

    events: {
        taskSubmitted: defineElementEvent<Task>(),
        cancelled:     defineElementEvent<void>(),
    },

    state: () => ({
        titleValue: '',
        description: '',
        consequenceTier: 3 as ConsequenceTier,
        isRecurring: false,
        cadence: 'weekly' as RecurrenceCadence,
        frequencyPerPeriod: 2,
        scheduleMode: 'rolling' as ScheduleMode,
        windowType: 'flexible' as WindowType,
        suggestedDate: '',         // YYYY-MM-DD
        // ── Recurrence anchor (only relevant when isRecurring=true) ──
        /** 0–6 (Sun–Sat) for weekly, and for monthly when monthAnchorMode='ordinal'. */
        dayOfWeek: 4,              // default Thursday
        /** 1–31 for monthly when monthAnchorMode='dom'. */
        dayOfMonth: 1,
        /** 'dom' = day-of-month (e.g., 15th); 'ordinal' = Nth weekday (e.g., 3rd Thu). */
        monthAnchorMode: 'dom' as 'dom' | 'ordinal',
        /** 1|2|3|4|-1 for "1st/2nd/3rd/4th/last". */
        ordinalWeek: 3 as 1 | 2 | 3 | 4 | -1,
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
    `,

    render({inputs, state, updateState, dispatch, events}) {
        if (!inputs.open) return html``;

        const isMulti = state.isRecurring && isMultiplePerPeriodCadence(state.cadence);

        // When recurring weekly/monthly the user picks an anchor (day-of-week or
        // day-of-month / ordinal weekday) instead of a calendar date — the engine
        // computes the first occurrence from there.
        const usesWeeklyAnchor = state.isRecurring && state.cadence === 'weekly';
        const usesMonthlyAnchor = state.isRecurring && state.cadence === 'monthly';
        const usesAnchor = usesWeeklyAnchor || usesMonthlyAnchor;

        const canSubmit = state.titleValue.trim().length > 0
            // Hard-date tasks need a date — unless an anchor implies one.
            && (state.windowType !== 'hard' || usesAnchor || state.suggestedDate.length > 0);

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
                const cfg: RecurrenceConfig = {
                    cadence: state.cadence,
                    frequencyPerPeriod: isMultiplePerPeriodCadence(state.cadence)
                        ? Math.max(2, state.frequencyPerPeriod)
                        : 1,
                    scheduleMode: state.scheduleMode,
                };
                if (usesWeeklyAnchor) {
                    cfg.hardDayOfWeek = state.dayOfWeek;
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

            const task: Task = {
                id: generateId(),
                projectId: inputs.projectId,
                title: state.titleValue.trim(),
                description: state.description.trim(),
                consequenceTier: state.consequenceTier,
                windowType: state.windowType,
                suggestedDate,
                windowDeadline,
                windowLengthDays,
                recurrence,
                currentPeriodStart,
                completionsThisPeriod: 0,
                snoozeCount: 0,
                snoozedUntil: null,
                completedAt: null,
                createdAt: Date.now(),
                // Legacy compatibility — derive from new fields
                priority: tierToPriority(state.consequenceTier),
                dueDate: suggestedDate,
            };

            dispatch(new events.taskSubmitted(task));
            // Reset
            updateState({
                titleValue: '',
                description: '',
                consequenceTier: 3,
                isRecurring: false,
                cadence: 'weekly',
                frequencyPerPeriod: 2,
                scheduleMode: 'rolling',
                windowType: 'flexible',
                suggestedDate: '',
                dayOfWeek: 4,
                dayOfMonth: 1,
                monthAnchorMode: 'dom',
                ordinalWeek: 3,
            });
        }

        return html`
            <div
                class="overlay"
                @click=${(e: Event) => {
                    if (e.target === e.currentTarget) dispatch(new events.cancelled());
                }}
            >
                <div class="sheet">
                    <div class="sheet-title">FILE NEW TASK</div>

                    <!-- Title -->
                    <div class="field">
                        <span class="field-label">Task Title *</span>
                        <${ViraInput.assign({
                            value: state.titleValue,
                            placeholder: 'Describe the task clearly.',
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

                    <!-- Window type -->
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
                        </div>
                    </div>

                    <!-- Suggested / hard date — hidden when an anchor picker takes over -->
                    ${usesAnchor ? html`` : html`
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
                    `}

                    <!-- Recurring toggle -->
                    <div class="recurring-row">
                        <input
                            id="recurring-toggle"
                            type="checkbox"
                            .checked=${state.isRecurring}
                            @change=${(e: Event) =>
                                updateState({isRecurring: (e.target as HTMLInputElement).checked})}
                        />
                        <label for="recurring-toggle">Recurring task</label>
                    </div>

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

                        <!-- Day-of-week anchor (weekly only) -->
                        ${usesWeeklyAnchor ? html`
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
                                    Every ${dayName(state.dayOfWeek)}, starting the next one.
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
                    ` : html``}

                    <div class="actions">
                        <${ViraButton.assign({
                            text: 'Cancel',
                            color: ViraColorVariant.Neutral,
                            buttonEmphasis: ViraEmphasis.Subtle,
                        })}
                            @click=${() => dispatch(new events.cancelled())}
                        ></${ViraButton}>
                        <span class="grow">
                            <${ViraButton.assign({
                                text: 'FILE TASK',
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

/** Map consequence tier → legacy priority for backward compatibility. */
function tierToPriority(tier: ConsequenceTier): 'low' | 'medium' | 'high' | 'critical' {
    switch (tier) {
        case 1: return 'critical';
        case 2: return 'high';
        case 3: return 'medium';
        case 4: return 'low';
    }
}
