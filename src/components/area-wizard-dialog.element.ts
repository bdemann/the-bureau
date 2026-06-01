import { css, defineElement, defineElementEvent, html, listen } from "element-vir";
import { getActiveSkin } from "../skins/active-skin.js";
import { ViraButton, ViraColorVariant, ViraEmphasis, ViraSize } from "vira";
import type {
    ConsequenceTier,
    ItemKind,
    Area,
    AreaColor,
    RecurrenceConfig,
    Task,
    TimeOfDay,
} from "../data/types.js";
import {
    TIME_OF_DAY_SLOTS,
    tierDescription,
    tierLabel,
    timeOfDayLabel,
} from "../data/types.js";
import { generateId, startOfDay } from "../data/storage.js";
import { initialiseRecurrence as initializeRecurrence } from "../data/recurrence.js";
import {
    CadencePickerElement,
    buildRecurrenceAnchors,
    cadenceConfigFromRecurrence,
    defaultCadenceConfig,
} from "./cadence-picker.element.js";
import type { CadenceConfig } from "./cadence-picker.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// AreaWizardDialogElement
// 3-step guided flow for creating a new area with routines:
//   Step 1 — Name the area
//   Step 2 — Brainstorm routines ("what would make me honest?")
//   Step 3 — Configure each routine (cadence, tier, time of day)
// ─────────────────────────────────────────────────────────────────────────────


const COLOR_OPTIONS: { key: AreaColor; label: string; swatch: string }[] = [
    { key: "red", label: "Crimson", swatch: "var(--color-danger)" },
    { key: "navy", label: "Navy", swatch: "var(--color-primary)" },
    { key: "gold", label: "Gold", swatch: "var(--color-warning)" },
    { key: "olive", label: "Olive", swatch: "#4A5E2A" },
    { key: "slate", label: "Slate", swatch: "#4A5568" },
];


export const AreaWizardDialogElement = defineElement<{
    open: boolean;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "area-wizard-dialog",

    events: {
        areaCreated: defineElementEvent<{
            area: Area;
            routines: ReadonlyArray<Task>;
        }>(),
        cancelled: defineElementEvent<void>(),
    },

    state: () => ({
        step: 1 as 1 | 2 | 3,
        // Stable area ID for the whole wizard session
        areaId: generateId(),
        // Dismiss confirmation
        confirmingCancel: false,
        // Step 1 — area details
        areaName: "",
        areaDescription: "",
        areaColor: "navy" as AreaColor,
        // Step 2 — brainstorm
        brainstormText: "",
        // Step 3 — routine configuration (one at a time)
        routineNames: [] as string[],
        currentRoutineIndex: 0,
        currentTitle: "",
        currentTier: 3 as ConsequenceTier,
        cadenceConfig: defaultCadenceConfig('daily'),
        currentTimeOfDay: "anytime" as TimeOfDay,
        completedRoutines: [] as Task[],
    }),

    styles: css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(var(--color-primary-rgb), 0.65);
            z-index: 200;
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
            border-top: 4px solid var(--color-warning);
            padding: 20px 20px 32px;
            animation: sheet-in 0.2s ease-out;
            max-height: 90vh;
            overflow-y: auto;
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

        .step-indicator {
            font-family: var(--font-mono);
            font-size: 0.6rem;
            letter-spacing: 0.15em;
            color: var(--color-warning);
            margin-bottom: 4px;
        }

        .sheet-title {
            font-family: var(--font-display);
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: var(--color-primary);
            border-bottom: 1px solid rgba(0, 0, 0, 0.15);
            padding-bottom: 8px;
            margin-bottom: 14px;
        }

        .prompt {
            font-family: var(--font-accent);
            font-size: 0.85rem;
            color: var(--color-text);
            line-height: 1.5;
            margin-bottom: 16px;
        }

        .prompt em {
            color: var(--color-warning);
            font-style: normal;
            font-family: var(--font-display);
            letter-spacing: 0.05em;
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

        input[type="text"],
        textarea {
            width: 100%;
            background: var(--color-input-bg);
            border: 1px solid rgba(0, 0, 0, 0.25);
            border-bottom: 2px solid rgba(0, 0, 0, 0.3);
            padding: 8px 10px;
            font-family: var(--font-mono);
            font-size: 0.9rem;
            color: var(--color-text);
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input:focus,
        textarea:focus {
            border-color: var(--color-primary);
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .color-grid {
            display: flex;
            gap: 10px;
        }

        .color-option {
            display: none;
        }

        .color-swatch {
            display: block;
            width: 36px;
            height: 36px;
            border-radius: 2px;
            cursor: pointer;
            border: 3px solid transparent;
            transition:
                border-color 0.15s,
                transform 0.1s;
        }

        .color-swatch.selected {
            border-color: var(--color-text);
            transform: scale(1.1);
        }

        /* Parsed routine list preview */
        .routine-preview {
            margin-top: 10px;
            padding: 8px 12px;
            background: rgba(var(--color-primary-rgb), 0.04);
            border-left: 3px solid var(--color-warning);
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text);
            line-height: 1.8;
        }

        .routine-preview-item::before {
            content: "▸ ";
            color: var(--color-warning);
        }

        .routine-counter {
            font-family: var(--font-mono);
            font-size: 0.72rem;
            color: var(--color-text-muted);
            margin-bottom: 12px;
        }

        /* Tier grid */
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
            color: var(--color-text-muted);
            font-family: var(--font-mono);
            min-height: 1.1em;
        }

        /* Time-of-day picker */
        .tod-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }
        .tod-grid ${ViraButton} {
            width: 100%;
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            align-items: center;
        }

        .actions-grow {
            flex: 1;
        }

    `,

    render({ inputs, state, updateState, dispatch, events }) {
        if (!inputs.open) return html``;
        const skin = getActiveSkin();

        if (state.confirmingCancel) {
            return html`
                <div class="overlay">
                    <div class="sheet" style="padding-bottom:24px">
                        <div class="sheet-title">${skin.wizard.discardTitle}</div>
                        <p style="font-family:var(--font-mono);font-size:0.85rem;color:var(--color-text);margin:0 0 20px">
                            ${skin.wizard.discardMessage}
                        </p>
                        <div class="actions">
                            <${ViraButton.assign({
                                text: skin.wizard.discardKeepBtn,
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => updateState({ confirmingCancel: false })}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text: skin.wizard.discardConfirmBtn,
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
                areaId: generateId(),
                confirmingCancel: false,
                areaName: "",
                areaDescription: "",
                areaColor: "navy",
                brainstormText: "",
                routineNames: [],
                currentRoutineIndex: 0,
                currentTitle: "",
                currentTier: 3,
                cadenceConfig: defaultCadenceConfig('daily'),
                currentTimeOfDay: "anytime",
                completedRoutines: [],
            });
        }

        function cancel(): void {
            dispatch(new events.cancelled());
            reset();
        }

        function requestCancel(): void {
            const hasWork =
                state.areaName.trim().length > 0 ||
                state.brainstormText.trim().length > 0 ||
                state.completedRoutines.length > 0;
            if (hasWork) {
                updateState({ confirmingCancel: true });
            } else {
                cancel();
            }
        }

        function buildArea(): Area {
            return {
                id: state.areaId,
                name: state.areaName.trim(),
                description: state.areaDescription.trim(),
                colorKey: state.areaColor,
                createdAt: Date.now(),
            };
        }

        function buildCurrentRoutine(): Task {
            const today = new Date();
            const cfg: RecurrenceConfig = {
                cadence: state.cadenceConfig.cadence,
                frequencyPerPeriod: 1,
                scheduleMode: state.cadenceConfig.scheduleMode,
                endMode: "never",
                ...buildRecurrenceAnchors(state.cadenceConfig),
            };
            const init = initializeRecurrence(
                { windowType: "flexible", suggestedDate: null },
                cfg,
                today,
            );
            return {
                id: generateId(),
                areaId: state.areaId,
                title:
                    state.currentTitle.trim() ||
                    (state.routineNames[state.currentRoutineIndex] ?? ""),
                description: "",
                kind: "routine" as ItemKind,
                timeOfDay: state.currentTimeOfDay,
                consequenceTier: state.currentTier,
                windowType: "flexible",
                suggestedDate: init.suggestedDate,
                windowDeadline: init.windowDeadline,
                windowLengthDays: init.windowLengthDays,
                recurrence: cfg,
                currentPeriodStart: init.currentPeriodStart,
                completionsThisPeriod: 0,
                totalCompletions: 0,
                progressCount: 0,
                pausedUntil: null,
                pausedIndefinitely: false,
                snoozeCount: 0,
                snoozedUntil: null,
                totalSnoozes: 0,
                totalSkips: 0,
                totalMisses: 0,
                missedAt: null,
                taskCompletionStreak: 0,
                maxTaskCompletionStreak: 0,
                skipStreak: 0,
                remediationCount: 0,
                completedAt: null,
                createdAt: Date.now(),
                dueDate: init.suggestedDate,
            };
        }

        function createArea(routines: ReadonlyArray<Task>): void {
            const area = buildArea();
            dispatch(new events.areaCreated({ area, routines }));
            reset();
        }

        function parseBrainstorm(text: string): string[] {
            return text
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
        }

        function goToStep2(): void {
            updateState({ step: 2 });
        }

        function goToStep3(): void {
            const names = parseBrainstorm(state.brainstormText);
            if (names.length === 0) {
                createArea([]);
                return;
            }
            updateState({
                step: 3,
                routineNames: names,
                currentRoutineIndex: 0,
                currentTitle: names[0] ?? "",
                currentTier: 3,
                cadenceConfig: defaultCadenceConfig('daily'),
                currentTimeOfDay: "anytime",
                completedRoutines: [],
            });
        }

        function nextRoutine(): void {
            const built = buildCurrentRoutine();
            const accumulated = [...state.completedRoutines, built];
            const nextIndex = state.currentRoutineIndex + 1;
            if (nextIndex >= state.routineNames.length) {
                createArea(accumulated);
                return;
            }
            updateState({
                completedRoutines: accumulated,
                currentRoutineIndex: nextIndex,
                currentTitle: state.routineNames[nextIndex] ?? "",
                currentTier: 3,
                cadenceConfig: defaultCadenceConfig('daily'),
                currentTimeOfDay: "anytime",
            });
        }

        function skipRemaining(): void {
            createArea(state.completedRoutines);
        }



        const canProceedStep1 = state.areaName.trim().length > 0;
        const routineCount = parseBrainstorm(state.brainstormText).length;
        const isLastRoutine =
            state.currentRoutineIndex >= state.routineNames.length - 1;
        const canConfigureRoutine =
            state.currentTitle.trim().length > 0 &&
            (state.cadenceConfig.cadence !== "weekly" ||
                state.cadenceConfig.daysOfWeek.size > 0);

        // ── Step 1 ────────────────────────────────────────────────────────────

        if (state.step === 1) {
            return html`
                <div class="overlay" @click=${(e: Event) => {
                    if (e.target === e.currentTarget) requestCancel();
                }}>
                    <div class="sheet">
                        <div class="step-indicator">${skin.wizard.step1Indicator}</div>
                        <div class="sheet-title">${skin.wizard.step1Title}</div>

                        <div class="prompt">${skin.wizard.step1Prompt}</div>

                        <div class="field">
                            <label class="field-label">${skin.wizard.step1NameLabel}</label>
                            <input
                                type="text"
                                .value=${state.areaName}
                                placeholder="${skin.wizard.step1NamePlaceholder}"
                                @input=${(e: Event) =>
                                    updateState({
                                        areaName: (e.target as HTMLInputElement)
                                            .value,
                                    })}
                                @keydown=${(e: KeyboardEvent) => {
                                    if (e.key === "Enter" && canProceedStep1)
                                        goToStep2();
                                }}
                            />
                        </div>

                        <div class="field">
                            <label class="field-label">${skin.wizard.step1BriefingLabel}</label>
                            <textarea
                                .value=${state.areaDescription}
                                placeholder="${skin.wizard.step1BriefingPlaceholder}"
                                @input=${(e: Event) =>
                                    updateState({
                                        areaDescription: (
                                            e.target as HTMLTextAreaElement
                                        ).value,
                                    })}
                            ></textarea>
                        </div>

                        <div class="field">
                            <label class="field-label">${skin.wizard.step1ColorLabel}</label>
                            <div class="color-grid">
                                ${COLOR_OPTIONS.map(
                                    (opt) => html`
                                        <div>
                                            <input
                                                type="radio"
                                                class="color-option"
                                                name="wiz-color"
                                                id="wc-${opt.key}"
                                                .checked=${state.areaColor ===
                                                opt.key}
                                                @change=${() =>
                                                    updateState({
                                                        areaColor: opt.key,
                                                    })}
                                            />
                                            <label
                                                for="wc-${opt.key}"
                                                class="color-swatch ${state.areaColor ===
                                                opt.key
                                                    ? "selected"
                                                    : ""}"
                                                style="background:${opt.swatch}"
                                                title="${opt.label}"
                                            ></label>
                                        </div>
                                    `,
                                )}
                            </div>
                        </div>

                        <div class="actions">
                            <${ViraButton.assign({
                                text: skin.wizard.cancelBtn,
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${requestCancel}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: skin.wizard.step1QuickCreateBtn,
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                isDisabled: !canProceedStep1,
                            })}
                                @click=${() => canProceedStep1 && createArea([])}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text: skin.wizard.step1ContinueBtn,
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
                        <div class="step-indicator">STEP 2 OF 3 · ${state.areaName.toUpperCase()}</div>
                        <div class="sheet-title">${skin.wizard.step2Title}</div>

                        <div class="prompt">${skin.wizard.step2Prompt(state.areaName)}</div>

                        <div class="field">
                            <label class="field-label">${skin.wizard.step2CommitmentsLabel}</label>
                            <textarea
                                .value=${state.brainstormText}
                                placeholder="${skin.wizard.step2CommitmentsPlaceholder}"
                                @input=${(e: Event) =>
                                    updateState({
                                        brainstormText: (
                                            e.target as HTMLTextAreaElement
                                        ).value,
                                    })}
                            ></textarea>
                        </div>

                        ${
                            parsedNames.length > 0
                                ? html`
                                      <div class="routine-preview">
                                          ${parsedNames.map(
                                              (name) => html`
                                                  <div
                                                      class="routine-preview-item"
                                                  >
                                                      ${name}
                                                  </div>
                                              `,
                                          )}
                                      </div>
                                  `
                                : html``
                        }

                        <div class="actions">
                            <${ViraButton.assign({
                                text: skin.wizard.step2BackBtn,
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => updateState({ step: 1 })}
                            ></${ViraButton}>
                            <${ViraButton.assign({
                                text: skin.wizard.step2CreateWithoutBtn,
                                color: ViraColorVariant.Neutral,
                                buttonEmphasis: ViraEmphasis.Subtle,
                            })}
                                @click=${() => createArea([])}
                            ></${ViraButton}>
                            <span class="actions-grow">
                                <${ViraButton.assign({
                                    text:
                                        routineCount > 0
                                            ? skin.wizard.step2ConfigureBtn(routineCount)
                                            : skin.wizard.step2CreateAreaBtn,
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
        const currentNum = state.currentRoutineIndex + 1;

        return html`
            <div class="overlay" @click=${(e: Event) => {
                if (e.target === e.currentTarget) cancel();
            }}>
                <div class="sheet">
                    <div class="step-indicator">
                        STEP 3 OF 3 · COMMITMENT ${currentNum} OF ${totalRoutines}
                    </div>
                    <div class="sheet-title">${skin.wizard.step3Title}</div>

                    <div class="routine-counter">
                        ${state.areaName.toUpperCase()} · ${currentNum}/${totalRoutines}
                    </div>

                    <!-- Routine title -->
                    <div class="field">
                        <label class="field-label">${skin.wizard.step3NameLabel}</label>
                        <input
                            type="text"
                            .value=${state.currentTitle}
                            placeholder="${skin.wizard.step3NamePlaceholder}"
                            @input=${(e: Event) =>
                                updateState({
                                    currentTitle: (e.target as HTMLInputElement)
                                        .value,
                                })}
                        />
                    </div>

                    <!-- Consequence tier -->
                    <div class="field">
                        <label class="field-label">Consequence Tier</label>
                        <div class="tier-grid">
                            ${([1, 2, 3, 4] as ConsequenceTier[]).map(
                                (t) => html`
                                <${ViraButton.assign({
                                    text: `T${t}`,
                                    color: wizardTierColor(t),
                                    buttonEmphasis:
                                        state.currentTier === t
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ currentTier: t })}
                                ></${ViraButton}>
                            `,
                            )}
                        </div>
                        <div class="tier-help">
                            <strong>${tierLabel(state.currentTier)}.</strong>
                            ${tierDescription(state.currentTier)}
                        </div>
                    </div>

                    <!-- Cadence -->
                    <${CadencePickerElement.assign({
                        config: state.cadenceConfig,
                    })}
                        ${listen(CadencePickerElement.events.cadenceChange, (e) =>
                            updateState({ cadenceConfig: e.detail }),
                        )}
                    ></${CadencePickerElement}>

                    <!-- Time of day -->
                    <div class="field">
                        <label class="field-label">Time of Day</label>
                        <div class="tod-grid">
                            ${TIME_OF_DAY_SLOTS.map(
                                (slot) => html`
                                <${ViraButton.assign({
                                    text: timeOfDayLabel(slot),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis:
                                        state.currentTimeOfDay === slot
                                            ? ViraEmphasis.Standard
                                            : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => updateState({ currentTimeOfDay: slot })}
                                ></${ViraButton}>
                            `,
                            )}
                        </div>
                    </div>

                    <div class="actions">
                        <${ViraButton.assign({
                            text:
                                state.completedRoutines.length > 0
                                    ? skin.wizard.step3CreateSoFarBtn
                                    : skin.wizard.step3CreateWithoutBtn,
                            color: ViraColorVariant.Neutral,
                            buttonEmphasis: ViraEmphasis.Subtle,
                        })}
                            @click=${skipRemaining}
                        ></${ViraButton}>
                        <span class="actions-grow">
                            <${ViraButton.assign({
                                text: isLastRoutine
                                    ? skin.wizard.step3FinishBtn
                                    : skin.wizard.step3NextBtn,
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

