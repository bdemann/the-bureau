import {css, defineElement, defineElementEvent, html} from 'element-vir';
import {ViraButton, ViraColorVariant, ViraEmphasis, ViraSize} from 'vira';
import type {
    ConsequenceTier,
    ItemKind,
    Project,
    ProjectColor,
    RecurrenceConfig,
    Task,
    TimeOfDay,
} from '../data/types.js';
import {
    TIME_OF_DAY_SLOTS,
    tierDescription,
    tierLabel,
    timeOfDayLabel,
} from '../data/types.js';
import {generateId, startOfDay} from '../data/storage.js';
import {initialiseRecurrence} from '../data/recurrence.js';

// ─────────────────────────────────────────────────────────────────────────────
// OperationWizardDialogElement
// 3-step guided flow for creating a new operation with routines:
//   Step 1 — Name the operation
//   Step 2 — Brainstorm routines ("what would make me honest?")
//   Step 3 — Configure each routine (cadence, tier, time of day)
// ─────────────────────────────────────────────────────────────────────────────

type WizardCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const COLOR_OPTIONS: {key: ProjectColor; label: string; swatch: string}[] = [
    {key: 'red',   label: 'Crimson', swatch: '#C41E3A'},
    {key: 'navy',  label: 'Navy',    swatch: '#1B2A4A'},
    {key: 'gold',  label: 'Gold',    swatch: '#B8860B'},
    {key: 'olive', label: 'Olive',   swatch: '#4A5E2A'},
    {key: 'slate', label: 'Slate',   swatch: '#4A5568'},
];

const CADENCES: {value: WizardCadence; label: string}[] = [
    {value: 'daily',     label: 'Daily'},
    {value: 'weekly',    label: 'Weekly'},
    {value: 'monthly',   label: 'Monthly'},
    {value: 'quarterly', label: 'Quarterly'},
    {value: 'yearly',    label: 'Yearly'},
];

const DAY_LABELS = [
    {value: 0, label: 'Sun'},
    {value: 1, label: 'Mon'},
    {value: 2, label: 'Tue'},
    {value: 3, label: 'Wed'},
    {value: 4, label: 'Thu'},
    {value: 5, label: 'Fri'},
    {value: 6, label: 'Sat'},
];

export const OperationWizardDialogElement = defineElement<{open: boolean}>()({
    tagName: 'operation-wizard-dialog',

    events: {
        operationCreated: defineElementEvent<{project: Project; routines: ReadonlyArray<Task>}>(),
        cancelled:        defineElementEvent<void>(),
    },

    state: () => ({
        step: 1 as 1 | 2 | 3,
        // Stable project ID for the whole wizard session
        projectId: generateId(),
        // Dismiss confirmation
        confirmingCancel: false,
        // Step 1 — operation details
        operationName: '',
        operationDescription: '',
        operationColor: 'navy' as ProjectColor,
        // Step 2 — brainstorm
        brainstormText: '',
        // Step 3 — routine configuration (one at a time)
        routineNames: [] as string[],
        currentRoutineIndex: 0,
        currentTitle: '',
        currentTier: 3 as ConsequenceTier,
        currentCadence: 'daily' as WizardCadence,
        currentDaysOfWeek: [new Date().getDay()] as number[],
        currentDayOfMonth: 1,
        monthAnchorMode: 'dom' as 'dom' | 'ordinal',
        monthOrdinalWeek: 1 as 1 | 2 | 3 | 4 | -1,
        monthOrdinalDay: new Date().getDay(),
        currentTimeOfDay: 'anytime' as TimeOfDay,
        completedRoutines: [] as Task[],
    }),

    styles: css`
        :host { display: block; }

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
            border-top: 4px solid #B8860B;
            padding: 20px 20px 32px;
            animation: sheet-in 0.2s ease-out;
            max-height: 90vh;
            overflow-y: auto;
        }

        @keyframes sheet-in {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }

        .step-indicator {
            font-family: 'Courier Prime', monospace;
            font-size: 0.6rem;
            letter-spacing: 0.15em;
            color: #B8860B;
            margin-bottom: 4px;
        }

        .sheet-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: #1B2A4A;
            border-bottom: 1px solid rgba(0,0,0,0.15);
            padding-bottom: 8px;
            margin-bottom: 14px;
        }

        .prompt {
            font-family: 'Special Elite', serif;
            font-size: 0.85rem;
            color: #2C2C2C;
            line-height: 1.5;
            margin-bottom: 16px;
        }

        .prompt em {
            color: #B8860B;
            font-style: normal;
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.05em;
        }

        .field { margin-bottom: 14px; }

        .field-label {
            display: block;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #6B6B6B;
            margin-bottom: 4px;
            font-family: 'Courier Prime', monospace;
        }

        input[type="text"], textarea {
            width: 100%;
            background: #FFFDF7;
            border: 1px solid rgba(0,0,0,0.25);
            border-bottom: 2px solid rgba(0,0,0,0.3);
            padding: 8px 10px;
            font-family: 'Courier Prime', 'Courier New', monospace;
            font-size: 0.9rem;
            color: #2C2C2C;
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input:focus, textarea:focus { border-color: #1B2A4A; }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .color-grid {
            display: flex;
            gap: 10px;
        }

        .color-option { display: none; }

        .color-swatch {
            display: block;
            width: 36px;
            height: 36px;
            border-radius: 2px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: border-color 0.15s, transform 0.1s;
        }

        .color-swatch.selected {
            border-color: #2C2C2C;
            transform: scale(1.1);
        }

        /* Parsed routine list preview */
        .routine-preview {
            margin-top: 10px;
            padding: 8px 12px;
            background: rgba(27, 42, 74, 0.04);
            border-left: 3px solid #B8860B;
            font-family: 'Courier Prime', monospace;
            font-size: 0.8rem;
            color: #2C2C2C;
            line-height: 1.8;
        }

        .routine-preview-item::before {
            content: '▸ ';
            color: #B8860B;
        }

        .routine-counter {
            font-family: 'Courier Prime', monospace;
            font-size: 0.72rem;
            color: #6B6B6B;
            margin-bottom: 12px;
        }

        /* Tier grid */
        .tier-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
        }
        .tier-grid ${ViraButton} { width: 100%; }

        .tier-help {
            margin-top: 6px;
            font-size: 0.72rem;
            color: #6B6B6B;
            font-family: 'Courier Prime', monospace;
            min-height: 1.1em;
        }

        /* Cadence grid */
        .cadence-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }
        .cadence-grid ${ViraButton} { width: 100%; }

        /* Day-of-week picker */
        .dow-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .dow-grid ${ViraButton} { width: 100%; }

        /* Time-of-day picker */
        .tod-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }
        .tod-grid ${ViraButton} { width: 100%; }

        .dom-input {
            background: #FFFDF7;
            border: 1px solid rgba(0,0,0,0.25);
            border-bottom: 2px solid rgba(0,0,0,0.3);
            padding: 8px 10px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.9rem;
            color: #2C2C2C;
            border-radius: 1px;
            outline: none;
            width: 6ch;
            transition: border-color 0.15s;
        }
        .dom-input:focus { border-color: #1B2A4A; }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            align-items: center;
        }

        .actions-grow { flex: 1; }


        .anchor-summary {
            margin-top: 6px;
            font-size: 0.72rem;
            color: #6B6B6B;
            font-family: 'Courier Prime', monospace;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        if (!inputs.open) return html``;

        if (state.confirmingCancel) {
            return html`
                <div class="overlay">
                    <div class="sheet" style="padding-bottom:24px">
                        <div class="sheet-title">DISCARD CHANGES?</div>
                        <p style="font-family:'Courier Prime',monospace;font-size:0.85rem;color:#2C2C2C;margin:0 0 20px">
                            Your progress on this operation will be lost.
                        </p>
                        <div class="actions">
                            <${ViraButton.assign({
                                text: 'Keep editing',
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => updateState({confirmingCancel: false})}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text: 'Discard',
                                    color: ViraColorVariant.Danger,
                                })}
                                    @click=${cancel}
                                ></${ViraButton}>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        function reset(): void {
            updateState({
                step: 1,
                projectId: generateId(),
                confirmingCancel: false,
                operationName: '',
                operationDescription: '',
                operationColor: 'navy',
                brainstormText: '',
                routineNames: [],
                currentRoutineIndex: 0,
                currentTitle: '',
                currentTier: 3,
                currentCadence: 'daily',
                currentDaysOfWeek: [new Date().getDay()],
                currentDayOfMonth: 1,
                monthAnchorMode: 'dom',
                monthOrdinalWeek: 1,
                monthOrdinalDay: new Date().getDay(),
                currentTimeOfDay: 'anytime',
                completedRoutines: [],
            });
        }

        function cancel(): void {
            dispatch(new events.cancelled());
            reset();
        }

        function requestCancel(): void {
            const hasWork = state.operationName.trim().length > 0
                || state.brainstormText.trim().length > 0
                || state.completedRoutines.length > 0;
            if (hasWork) {
                updateState({confirmingCancel: true});
            } else {
                cancel();
            }
        }

        function buildProject(): Project {
            return {
                id: state.projectId,
                name: state.operationName.trim(),
                description: state.operationDescription.trim(),
                colorKey: state.operationColor,
                createdAt: Date.now(),
            };
        }

        function buildCurrentRoutine(): Task {
            const today = new Date();
            const cadence = state.currentCadence;
            const scheduleMode = (cadence === 'weekly' || cadence === 'monthly') ? 'fixed' : 'rolling';
            const cfg: RecurrenceConfig = {
                cadence,
                frequencyPerPeriod: 1,
                scheduleMode,
                endMode: 'never',
                ...(cadence === 'weekly'
                    ? {hardDaysOfWeek: [...state.currentDaysOfWeek].sort((a, b) => a - b)}
                    : {}),
                ...(cadence === 'monthly' && state.monthAnchorMode === 'ordinal'
                    ? {hardDayOfWeek: state.monthOrdinalDay, ordinalWeek: state.monthOrdinalWeek}
                    : {}),
                ...(cadence === 'monthly' && state.monthAnchorMode === 'dom'
                    ? {hardDayOfMonth: state.currentDayOfMonth}
                    : {}),
            };
            const init = initialiseRecurrence(
                {windowType: 'flexible', suggestedDate: null},
                cfg,
                today,
            );
            return {
                id: generateId(),
                projectId: state.projectId,
                title: state.currentTitle.trim() || (state.routineNames[state.currentRoutineIndex] ?? ''),
                description: '',
                kind: 'routine' as ItemKind,
                timeOfDay: state.currentTimeOfDay,
                consequenceTier: state.currentTier,
                windowType: 'flexible',
                suggestedDate: init.suggestedDate,
                windowDeadline: init.windowDeadline,
                windowLengthDays: init.windowLengthDays,
                recurrence: cfg,
                currentPeriodStart: init.currentPeriodStart,
                completionsThisPeriod: 0,
                totalCompletions: 0,
                progressCount: 0,
                snoozeCount: 0,
                snoozedUntil: null,
                completedAt: null,
                createdAt: Date.now(),
                dueDate: init.suggestedDate,
            };
        }

        function createOperation(routines: ReadonlyArray<Task>): void {
            const project = buildProject();
            dispatch(new events.operationCreated({project, routines}));
            reset();
        }

        function parseBrainstorm(text: string): string[] {
            return text
                .split(/[\n,]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }

        function goToStep2(): void {
            updateState({step: 2});
        }

        function goToStep3(): void {
            const names = parseBrainstorm(state.brainstormText);
            if (names.length === 0) {
                createOperation([]);
                return;
            }
            updateState({
                step: 3,
                routineNames: names,
                currentRoutineIndex: 0,
                currentTitle: names[0] ?? '',
                currentTier: 3,
                currentCadence: 'daily',
                currentDaysOfWeek: [new Date().getDay()],
                currentDayOfMonth: 1,
                monthAnchorMode: 'dom',
                monthOrdinalWeek: 1,
                monthOrdinalDay: new Date().getDay(),
                currentTimeOfDay: 'anytime',
                completedRoutines: [],
            });
        }

        function nextRoutine(): void {
            const built = buildCurrentRoutine();
            const accumulated = [...state.completedRoutines, built];
            const nextIndex = state.currentRoutineIndex + 1;
            if (nextIndex >= state.routineNames.length) {
                createOperation(accumulated);
                return;
            }
            updateState({
                completedRoutines: accumulated,
                currentRoutineIndex: nextIndex,
                currentTitle: state.routineNames[nextIndex] ?? '',
                currentTier: 3,
                currentCadence: 'daily',
                currentDaysOfWeek: [new Date().getDay()],
                currentDayOfMonth: 1,
                monthAnchorMode: 'dom',
                monthOrdinalWeek: 1,
                monthOrdinalDay: new Date().getDay(),
                currentTimeOfDay: 'anytime',
            });
        }

        function skipRemaining(): void {
            createOperation(state.completedRoutines);
        }

        function toggleDay(day: number): void {
            const current = state.currentDaysOfWeek;
            const next = current.includes(day)
                ? current.filter(d => d !== day)
                : [...current, day];
            updateState({currentDaysOfWeek: next});
        }

        const canProceedStep1 = state.operationName.trim().length > 0;
        const routineCount = parseBrainstorm(state.brainstormText).length;
        const isLastRoutine = state.currentRoutineIndex >= state.routineNames.length - 1;
        const canConfigureRoutine = state.currentTitle.trim().length > 0
            && (state.currentCadence !== 'weekly' || state.currentDaysOfWeek.length > 0);

        // ── Step 1 ────────────────────────────────────────────────────────────

        if (state.step === 1) {
            return html`
                <div class="overlay" @click=${(e: Event) => {
                    if (e.target === e.currentTarget) requestCancel();
                }}>
                    <div class="sheet">
                        <div class="step-indicator">STEP 1 OF 3</div>
                        <div class="sheet-title">OPEN NEW OPERATION</div>

                        <div class="prompt">
                            What aspect of your life will this operation track?
                        </div>

                        <div class="field">
                            <label class="field-label">Operation Name *</label>
                            <input
                                type="text"
                                .value=${state.operationName}
                                placeholder="e.g. Amateur Baker, Homeowner, Fitness"
                                @input=${(e: Event) =>
                                    updateState({operationName: (e.target as HTMLInputElement).value})}
                                @keydown=${(e: KeyboardEvent) => {
                                    if (e.key === 'Enter' && canProceedStep1) goToStep2();
                                }}
                            />
                        </div>

                        <div class="field">
                            <label class="field-label">Briefing (optional)</label>
                            <textarea
                                .value=${state.operationDescription}
                                placeholder="What does it mean to you to be on top of this area?"
                                @input=${(e: Event) =>
                                    updateState({operationDescription: (e.target as HTMLTextAreaElement).value})}
                            ></textarea>
                        </div>

                        <div class="field">
                            <label class="field-label">Designation Color</label>
                            <div class="color-grid">
                                ${COLOR_OPTIONS.map(opt => html`
                                    <div>
                                        <input
                                            type="radio"
                                            class="color-option"
                                            name="wiz-color"
                                            id="wc-${opt.key}"
                                            .checked=${state.operationColor === opt.key}
                                            @change=${() => updateState({operationColor: opt.key})}
                                        />
                                        <label
                                            for="wc-${opt.key}"
                                            class="color-swatch ${state.operationColor === opt.key ? 'selected' : ''}"
                                            style="background:${opt.swatch}"
                                            title="${opt.label}"
                                        ></label>
                                    </div>
                                `)}
                            </div>
                        </div>

                        <div class="actions">
                            <${ViraButton.assign({
                                text: 'Cancel',
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${requestCancel}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: 'Quick create (no routines)',
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                isDisabled: !canProceedStep1,
                            })}
                                @click=${() => canProceedStep1 && createOperation([])}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text: 'Continue →',
                                    color: ViraColorVariant.Info,
                                    isDisabled: !canProceedStep1,
                                })}
                                    @click=${goToStep2}
                                ></${ViraButton}>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ── Step 2 ────────────────────────────────────────────────────────────

        if (state.step === 2) {
            const parsedNames = parseBrainstorm(state.brainstormText);
            return html`
                <div class="overlay" @click=${(e: Event) => {
                    if (e.target === e.currentTarget) requestCancel();
                }}>
                    <div class="sheet">
                        <div class="step-indicator">STEP 2 OF 3 · ${state.operationName.toUpperCase()}</div>
                        <div class="sheet-title">IDENTIFY YOUR ROUTINES</div>

                        <div class="prompt">
                            If you told a friend you were into
                            <em>${state.operationName}</em>,
                            what would you need to be doing regularly to feel honest saying that?
                            List one item per line.
                        </div>

                        <div class="field">
                            <label class="field-label">Your Routines (one per line)</label>
                            <textarea
                                .value=${state.brainstormText}
                                placeholder="e.g.&#10;Bake bread weekly&#10;Try a new technique monthly&#10;Share something I made quarterly"
                                @input=${(e: Event) =>
                                    updateState({brainstormText: (e.target as HTMLTextAreaElement).value})}
                            ></textarea>
                        </div>

                        ${parsedNames.length > 0 ? html`
                            <div class="routine-preview">
                                ${parsedNames.map(name => html`
                                    <div class="routine-preview-item">${name}</div>
                                `)}
                            </div>
                        ` : html``}

                        <div class="actions">
                            <${ViraButton.assign({
                                text: '← Back',
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => updateState({step: 1})}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: 'Create without routines',
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => createOperation([])}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text: routineCount > 0
                                        ? `Configure ${routineCount} routine${routineCount !== 1 ? 's' : ''} →`
                                        : 'Create operation →',
                                    color: ViraColorVariant.Info,
                                })}
                                    @click=${goToStep3}
                                ></${ViraButton}>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ── Step 3 ────────────────────────────────────────────────────────────

        const totalRoutines = state.routineNames.length;
        const currentNum   = state.currentRoutineIndex + 1;

        return html`
            <div class="overlay" @click=${(e: Event) => {
                if (e.target === e.currentTarget) cancel();
            }}>
                <div class="sheet">
                    <div class="step-indicator">
                        STEP 3 OF 3 · ROUTINE ${currentNum} OF ${totalRoutines}
                    </div>
                    <div class="sheet-title">CONFIGURE ROUTINE</div>

                    <div class="routine-counter">
                        ${state.operationName.toUpperCase()} · ${currentNum}/${totalRoutines}
                    </div>

                    <!-- Routine title -->
                    <div class="field">
                        <label class="field-label">Routine Name *</label>
                        <input
                            type="text"
                            .value=${state.currentTitle}
                            placeholder="Describe this routine."
                            @input=${(e: Event) =>
                                updateState({currentTitle: (e.target as HTMLInputElement).value})}
                        />
                    </div>

                    <!-- Consequence tier -->
                    <div class="field">
                        <label class="field-label">Consequence Tier</label>
                        <div class="tier-grid">
                            ${([1, 2, 3, 4] as ConsequenceTier[]).map(t => html`
                                <${ViraButton.assign({
                                    text: `T${t}`,
                                    color: wizardTierColor(t),
                                    buttonEmphasis: state.currentTier === t
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({currentTier: t})}
                                ></${ViraButton}>
                            `)}
                        </div>
                        <div class="tier-help">
                            <strong>${tierLabel(state.currentTier)}.</strong>
                            ${tierDescription(state.currentTier)}
                        </div>
                    </div>

                    <!-- Cadence -->
                    <div class="field">
                        <label class="field-label">Cadence</label>
                        <div class="cadence-grid">
                            ${CADENCES.map(c => html`
                                <${ViraButton.assign({
                                    text: c.label,
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.currentCadence === c.value
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({currentCadence: c.value})}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>

                    <!-- Weekly: day-of-week picker -->
                    ${state.currentCadence === 'weekly' ? html`
                        <div class="field">
                            <label class="field-label">Days of Week</label>
                            <div class="dow-grid">
                                ${DAY_LABELS.map(d => html`
                                    <${ViraButton.assign({
                                        text: d.label,
                                        color: ViraColorVariant.Info,
                                        buttonEmphasis: state.currentDaysOfWeek.includes(d.value)
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${() => toggleDay(d.value)}
                                    ></${ViraButton}>
                                `)}
                            </div>
                            <div class="anchor-summary">
                                ${formatSelectedDays(state.currentDaysOfWeek)}
                            </div>
                        </div>
                    ` : html``}

                    <!-- Monthly: dom vs ordinal toggle -->
                    ${state.currentCadence === 'monthly' ? html`
                        <div class="field">
                            <label class="field-label">Monthly Anchor</label>
                            <div class="cadence-grid">
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
                                <label class="field-label">Day of Month (1–31)</label>
                                <input
                                    class="dom-input"
                                    type="number"
                                    min="1"
                                    max="31"
                                    .value=${String(state.currentDayOfMonth)}
                                    @input=${(e: Event) => {
                                        const n = parseInt((e.target as HTMLInputElement).value, 10);
                                        if (!Number.isNaN(n) && n >= 1 && n <= 31) {
                                            updateState({currentDayOfMonth: n});
                                        }
                                    }}
                                />
                                <div class="anchor-summary">
                                    The ${ordinalSuffix(state.currentDayOfMonth)} of each month.
                                </div>
                            </div>
                        ` : html`
                            <div class="field">
                                <label class="field-label">Which Occurrence</label>
                                <div class="cadence-grid">
                                    ${([1, 2, 3, 4, -1] as Array<1|2|3|4|-1>).map(w => html`
                                        <${ViraButton.assign({
                                            text: w === -1 ? 'Last' : `${ordinalSuffix(w)}`,
                                            color: ViraColorVariant.Info,
                                            buttonEmphasis: state.monthOrdinalWeek === w
                                                ? ViraEmphasis.Standard
                                                : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({monthOrdinalWeek: w})}
                                        ></${ViraButton}>
                                    `)}
                                </div>
                            </div>
                            <div class="field">
                                <label class="field-label">Day of Week</label>
                                <div class="dow-grid">
                                    ${DAY_LABELS.map(d => html`
                                        <${ViraButton.assign({
                                            text: d.label,
                                            color: ViraColorVariant.Info,
                                            buttonEmphasis: state.monthOrdinalDay === d.value
                                                ? ViraEmphasis.Standard
                                                : ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                            @click=${() => updateState({monthOrdinalDay: d.value})}
                                        ></${ViraButton}>
                                    `)}
                                </div>
                                <div class="anchor-summary">
                                    The ${state.monthOrdinalWeek === -1 ? 'last' : ordinalSuffix(state.monthOrdinalWeek)}
                                    ${DAY_LABELS.find(d => d.value === state.monthOrdinalDay)?.label ?? ''}
                                    of each month.
                                </div>
                            </div>
                        `}
                    ` : html``}

                    <!-- Time of day -->
                    <div class="field">
                        <label class="field-label">Time of Day</label>
                        <div class="tod-grid">
                            ${TIME_OF_DAY_SLOTS.map(slot => html`
                                <${ViraButton.assign({
                                    text: timeOfDayLabel(slot),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: state.currentTimeOfDay === slot
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({currentTimeOfDay: slot})}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>

                    <div class="actions">
                        <${ViraButton.assign({
                            text: state.completedRoutines.length > 0
                                ? 'Create with routines so far'
                                : 'Create without routines',
                            color: ViraColorVariant.Neutral,
                            buttonEmphasis: ViraEmphasis.Subtle,
                        })}
                            @click=${skipRemaining}
                        ></${ViraButton}>
                        <span class="actions-grow">
                            <${ViraButton.assign({
                                text: isLastRoutine ? 'Create Operation ✓' : `Next Routine →`,
                                color: ViraColorVariant.Info,
                                isDisabled: !canConfigureRoutine,
                            })}
                                @click=${nextRoutine}
                            ></${ViraButton}>
                        </span>
                    </div>
                </div>
            </div>
        `;
    },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function wizardTierColor(tier: ConsequenceTier): ViraColorVariant {
    switch (tier) {
        case 1: return ViraColorVariant.Danger;
        case 2: return ViraColorVariant.Warning;
        case 3: return ViraColorVariant.Info;
        case 4: return ViraColorVariant.Neutral;
    }
}

function formatSelectedDays(days: number[]): string {
    const sorted = [...days].sort((a, b) => a - b);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (sorted.length === 0) return 'No days selected.';
    if (sorted.length === 7) return 'Every day.';
    if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6))
        return 'Every weekday (Mon–Fri).';
    if (sorted.length === 6 && !sorted.includes(6)) return 'Every day except Saturday.';
    if (sorted.length === 6 && !sorted.includes(0)) return 'Every day except Sunday.';
    return sorted.map(d => names[d]).join(', ') + '.';
}

function ordinalSuffix(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n}st`;
    if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
    return `${n}th`;
}
