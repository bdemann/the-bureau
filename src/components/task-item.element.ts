import { css, defineElement, defineElementEvent, html } from "element-vir";
import { getActiveSkin } from "../skins/active-skin.js";
import { ViraButton, ViraColorVariant, ViraEmphasis, ViraSize } from "vira";
import type { ConsequenceTier, Task } from "../data/types.js";
import {
    cadencePeriodWord,
    getSnoozeSeverity,
    tierShortLabel,
} from "../data/types.js";
import { isCurrentlySnoozed, isTaskOverdue } from "../data/storage.js";
import { isMultiplePerPeriod } from "../data/recurrence.js";
import { isNextOccurrenceTomorrow } from "../data/urgency.js";
import { SnoozeIndicatorElement } from "./snooze-indicator.element.js";
import { SkipIndicatorElement } from "./skip-indicator.element.js";
import { RemediationIndicatorElement } from "./remediation-indicator.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// TaskItemElement
// Phase 2: index-card style row that surfaces consequence tier, suggested or
// hard date, multi-per-period progress (e.g. 1/3 this week), and snooze info.
// Visual degradation continues to escalate with snoozeCount.
// Buttons migrated to Vira; the card "paper" itself stays themed.
// ─────────────────────────────────────────────────────────────────────────────

export const TaskItemElement = defineElement<{
    task: Task;
    /** Optional: shown above the title when the daily view renders cross-area. */
    areaName?: string;
    /** Show a drag-handle affordance (⠿) when parent is managing reorder. */
    showDragHandle?: boolean;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "task-item",

    events: {
        completed: defineElementEvent<string>(), // task id
        snoozed: defineElementEvent<string>(), // task id
        unSnoozed: defineElementEvent<string>(), // task id
        skipped: defineElementEvent<string>(), // task id — recurring only
        progressLogged: defineElementEvent<string>(), // task id — milestone only
        editRequested: defineElementEvent<string>(), // task id
    },

    styles: css`
        :host {
            display: block;
        }

        .task-card {
            background: var(--color-card);
            border-left: 4px solid var(--color-text);
            border-bottom: 1px solid rgba(0, 0, 0, 0.12);
            padding: 12px 14px;
            position: relative;
            transition: border-color 0.2s;
            overflow: hidden;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .task-body {
            flex: 1;
            min-width: 0;
        }

        /* Tier border colours (replaces priority colours). */
        .task-card.tier-1 {
            border-left-color: var(--color-danger);
        } /* hard consequence — red */
        .task-card.tier-2 {
            border-left-color: var(--color-snooze);
        } /* soft consequence — orange */
        .task-card.tier-3 {
            border-left-color: var(--color-warning);
        } /* quality — gold */
        .task-card.tier-4 {
            border-left-color: #6b9e6e;
        } /* aspirational — green */

        /* Snooze degradation — the card looks increasingly worn */
        .task-card.snooze-warning {
            background: #fff8ec;
        }
        .task-card.snooze-caution {
            background: #fff3e0;
        }
        .task-card.snooze-danger {
            background: #fff0ee;
        }
        .task-card.snooze-critical {
            background: #fff5f5;
        }

        .task-card.overdue {
            background: #fff2f2;
        }
        .task-card.currently-snoozed {
            opacity: 0.6;
        }

        /* Diagonal stamp for critical snooze — text set via --snooze-stamp CSS var. */
        .task-card.snooze-critical::after {
            content: var(--snooze-stamp, "UNDER REVIEW");
            position: absolute;
            top: 50%;
            right: -10px;
            transform: translateY(-50%) rotate(90deg);
            font-family: var(--font-display);
            font-size: 0.6rem;
            letter-spacing: 0.25em;
            color: rgba(139, 0, 0, 0.18);
            pointer-events: none;
            white-space: nowrap;
        }

        .area-tag {
            font-family: var(--font-display);
            font-size: 0.6rem;
            letter-spacing: 0.18em;
            color: var(--color-text-muted);
            margin-bottom: 4px;
        }

        .task-top {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .complete-checkbox {
            flex-shrink: 0;
            width: 44px;
            height: 44px;
            border: 2px solid var(--color-text-muted);
            background: none;
            cursor: pointer;
            border-radius: 4px;
            margin-top: 0;
            transition:
                border-color 0.15s,
                background 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-accent);
            font-size: 1.1rem;
            color: transparent;
            line-height: 1;
            padding: 0;
        }
        @media (hover: hover) {
            .complete-checkbox:hover {
                border-color: var(--color-primary);
                background: rgba(var(--color-primary-rgb), 0.05);
                color: var(--color-primary);
            }
        }

        .task-title {
            flex: 1;
            font-family: var(--font-accent);
            font-size: 0.9rem;
            line-height: 1.4;
            color: var(--color-text);
        }

        .task-card.snooze-critical .task-title {
            color: #5a0000;
        }

        .drag-handle {
            flex-shrink: 0;
            font-size: 0.75rem;
            color: #b0a898;
            cursor: grab;
            padding: 0 2px;
            margin-top: 2px;
            user-select: none;
            line-height: 1;
        }

        .tier-pip {
            flex-shrink: 0;
            font-size: 0.62rem;
            font-family: var(--font-display);
            letter-spacing: 0.1em;
            padding: 2px 6px;
            border-radius: 1px;
            margin-top: 2px;
        }
        .tier-pip.t-1 {
            background: #ffcccc;
            color: var(--color-danger-dark);
        }
        .tier-pip.t-2 {
            background: #fddac4;
            color: #7a3000;
        }
        .tier-pip.t-3 {
            background: #faebc8;
            color: #6b4a00;
        }
        .tier-pip.t-4 {
            background: #d8edd8;
            color: #2e5e2e;
        }

        .task-meta {
            margin-top: 6px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }

        .task-description {
            margin-top: 4px;
            font-size: 0.78rem;
            color: var(--color-text-muted);
            line-height: 1.45;
        }

        .meta-chip {
            font-size: 0.68rem;
            color: var(--color-text-muted);
            font-family: var(--font-mono);
        }
        .meta-chip.overdue {
            color: var(--color-danger);
            font-weight: 700;
        }

        .progress-chip {
            font-size: 0.7rem;
            font-family: var(--font-display);
            letter-spacing: 0.1em;
            padding: 1px 6px;
            background: var(--color-primary);
            color: var(--color-surface);
            border-radius: 1px;
        }

        .task-actions {
            margin-top: 10px;
            display: flex;
            gap: 8px;
            align-items: center;
            min-height: 44px;
        }

        .snoozed-until {
            font-size: 0.68rem;
            color: var(--color-text-muted);
            font-style: italic;
        }

        .progress-log-chip {
            font-size: 0.68rem;
            font-family: var(--font-mono);
            color: #4a6741;
        }

        .kind-chip {
            font-size: 0.6rem;
            font-family: var(--font-display);
            letter-spacing: 0.15em;
            padding: 1px 5px;
            border-radius: 1px;
            background: rgba(var(--color-primary-rgb), 0.08);
            color: var(--color-primary);
            border: 1px solid rgba(var(--color-primary-rgb), 0.2);
        }

        .milestone-confirm {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: var(--font-accent);
            font-size: 0.75rem;
            color: #4a4a4a;
        }
    `,

    state: () => ({
        confirmingComplete: false,
    }),

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();
        const { task } = inputs;
        const severity = getSnoozeSeverity(task.snoozeCount);
        const overdue = isTaskOverdue(task);
        const currentlySnoozed = isCurrentlySnoozed(task);
        const isMulti = isMultiplePerPeriod(task);
        const tier = task.consequenceTier as ConsequenceTier;

        const classes = [
            "task-card",
            `tier-${tier}`,
            severity !== "none" ? `snooze-${severity}` : "",
            overdue ? "overdue" : "",
            currentlySnoozed ? "currently-snoozed" : "",
        ]
            .filter(Boolean)
            .join(" ");

        const dueLabel = formatDueLabel(task, overdue, skin.commitmentRow.dueDatePrefix, skin.commitmentRow.missedDatePrefix);
        const snoozedUntilStr =
            currentlySnoozed && task.snoozedUntil
                ? new Date(task.snoozedUntil).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                  })
                : null;

        const cadenceWord = task.recurrence
            ? cadencePeriodWord(task.recurrence.cadence)
            : null;
        const progressLabel = isMulti
            ? `${task.completionsThisPeriod} / ${task.recurrence!.frequencyPerPeriod} this ${cadenceWord}`
            : null;

        const isMilestone = task.windowType === "milestone";

        // Daily routines can't be snoozed — skip is the right action for them.
        const isDailyRoutine =
            task.kind === "routine" &&
            (task.recurrence?.cadence === "daily" ||
                task.recurrence?.cadence === "multiple_per_day");

        // Hard-date tasks may not be snoozed past the date.
        // Next-occurrence-tomorrow tasks: snoozed until = next occurrence anyway, pointless.
        // Manually disabled snooze.
        const canSnooze =
            !isDailyRoutine &&
            !task.disableSnooze &&
            !(
                task.windowType === "hard" &&
                task.suggestedDate !== null &&
                task.suggestedDate <= Date.now()
            ) &&
            !isNextOccurrenceTomorrow(task);

        return html`
            <div
                class="${classes}"
                style="--snooze-stamp: '${skin.streaks.criticalSnoozeLabel}'"
                @click=${() => dispatch(new events.editRequested(task.id))}
            >
                <button
                    class="complete-checkbox"
                    title=${isMilestone
                        ? skin.commitmentRow.logProgressTitle
                        : skin.commitmentRow.completeTitle}
                    @click=${(e: Event) => {
                        e.stopPropagation();
                        isMilestone
                            ? updateState({ confirmingComplete: true })
                            : dispatch(new events.completed(task.id));
                    }}
                >
                    ✓
                </button>

                <div class="task-body">
                    ${inputs.areaName
                        ? html`<div class="area-tag">${inputs.areaName}</div>`
                        : html``}

                    <div class="task-top">
                        <span class="task-title">${task.title}</span>

                        <span class="tier-pip t-${tier}"
                            >${tierShortLabel(tier)}</span
                        >
                        ${inputs.showDragHandle
                            ? html`<span class="drag-handle">⠿</span>`
                            : html``}
                    </div>

                    ${task.description
                        ? html`<p class="task-description">
                              ${task.description}
                          </p>`
                        : html``}

                    <div class="task-meta">
                        ${dueLabel
                            ? html`
                                  <span
                                      class="meta-chip ${overdue
                                          ? "overdue"
                                          : ""}"
                                  >
                                      ${dueLabel}
                                  </span>
                              `
                            : html``}
                        ${progressLabel
                            ? html`<span class="progress-chip"
                                  >${progressLabel}</span
                              >`
                            : html``}
                        ${isMilestone && task.progressCount > 0
                            ? html`<span class="progress-log-chip"
                                  >${skin.commitmentRow.sessionsLoggedLabel(task.progressCount)}</span
                              >`
                            : html``}
                        ${task.kind === "routine"
                            ? html`<span class="kind-chip">${skin.commitmentRow.routineKindBadge}</span>`
                            : html``}
                        ${task.snoozeCount > 0
                            ? html`
                            <${SnoozeIndicatorElement.assign({ snoozeCount: task.snoozeCount, activeSkinId: inputs.activeSkinId })}
                            ></${SnoozeIndicatorElement}>
                        `
                            : html``}
                        ${task.skipStreak > 0
                            ? html`
                            <${SkipIndicatorElement.assign({ skipStreak: task.skipStreak, activeSkinId: inputs.activeSkinId })}
                            ></${SkipIndicatorElement}>
                        `
                            : html``}
                        ${task.remediationCount > 0
                            ? html`
                            <${RemediationIndicatorElement.assign({ remediationCount: task.remediationCount, activeSkinId: inputs.activeSkinId })}
                            ></${RemediationIndicatorElement}>
                        `
                            : html``}
                        ${snoozedUntilStr
                            ? html`<span class="snoozed-until"
                                  >${skin.commitmentRow.snoozedUntilLabel(snoozedUntilStr)}</span
                              >`
                            : html``}
                    </div>

                    ${task.completedAt === null
                        ? html`
                              <div class="task-actions">
                                  ${currentlySnoozed
                                      ? html`
                            <${ViraButton.assign({
                                text: skin.commitmentRow.wakeUpBtn,
                                color: ViraColorVariant.Info,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    dispatch(new events.unSnoozed(task.id));
                                }}
                            ></${ViraButton}>
                        `
                                      : html`
                                            ${isDailyRoutine
                                                ? html``
                                                : html`
                                <${ViraButton.assign({
                                    text: canSnooze
                                        ? skin.commitmentRow.snoozeBtn
                                        : skin.commitmentRow.cannotSnoozeBtn,
                                    color: ViraColorVariant.Warning,
                                    buttonEmphasis: ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                    isDisabled: !canSnooze,
                                })}
                                    @click=${(e: Event) => {
                                        e.stopPropagation();
                                        if (canSnooze)
                                            dispatch(
                                                new events.snoozed(task.id),
                                            );
                                    }}
                                ></${ViraButton}>
                            `}
                                            ${task.recurrence
                                                ? html`
                                <${ViraButton.assign({
                                    text: skin.commitmentRow.skipBtn,
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${(e: Event) => {
                                        e.stopPropagation();
                                        dispatch(new events.skipped(task.id));
                                    }}
                                ></${ViraButton}>
                            `
                                                : html``}
                                            ${isMilestone &&
                                            state.confirmingComplete
                                                ? html`
                                <span class="milestone-confirm">
                                    <${ViraButton.assign({
                                        text: skin.commitmentRow.logSessionBtn,
                                        color: ViraColorVariant.Neutral,
                                        buttonEmphasis: ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${(e: Event) => {
                                            e.stopPropagation();
                                            updateState({
                                                confirmingComplete: false,
                                            });
                                            dispatch(
                                                new events.progressLogged(
                                                    task.id,
                                                ),
                                            );
                                        }}
                                    ></${ViraButton}>
                                    <${ViraButton.assign({
                                        text: skin.commitmentRow.allDoneBtn,
                                        color: ViraColorVariant.Info,
                                        buttonEmphasis: ViraEmphasis.Standard,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${(e: Event) => {
                                            e.stopPropagation();
                                            updateState({
                                                confirmingComplete: false,
                                            });
                                            dispatch(
                                                new events.completed(task.id),
                                            );
                                        }}
                                    ></${ViraButton}>
                                    <${ViraButton.assign({
                                        text: "Cancel",
                                        color: ViraColorVariant.Neutral,
                                        buttonEmphasis: ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${(e: Event) => {
                                            e.stopPropagation();
                                            updateState({
                                                confirmingComplete: false,
                                            });
                                        }}
                                    ></${ViraButton}>
                                </span>
                            `
                                                : html``}
                                        `}
                              </div>
                          `
                        : html``}
                </div>
            </div>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDueLabel(task: Task, overdue: boolean, duePfx: string, missedPfx: string): string | null {
    const pattern = formatRecurrencePattern(task);
    const due = task.suggestedDate ?? task.dueDate;
    if (due === null) return pattern;

    const fmt = new Date(due).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    if (task.windowType === "hard") {
        const base = overdue ? `${missedPfx}${fmt}` : `${duePfx}${fmt}`;
        return pattern ? `${pattern} · next ${fmt}` : base;
    }
    if (pattern) {
        return `${pattern} · next ${fmt}`;
    }
    if (task.windowDeadline !== null) {
        const deadlineDate = new Date(task.windowDeadline);
        const sameDay =
            deadlineDate.toDateString() === new Date(due).toDateString();
        if (!sameDay) {
            const deadline = deadlineDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
            return `Suggested ${fmt} · window ends ${deadline}`;
        }
    }
    // suggestedDate has arrived — switch from "Suggested" to "Due"
    if (due <= Date.now()) {
        return new Date(due).toDateString() === new Date().toDateString()
            ? "Due today"
            : `Overdue · ${fmt}`;
    }
    return `Suggested ${fmt}`;
}

/**
 * "Every Thursday", "3rd Thursday of each month", "Day 15 of each month", or
 * null if the task has no anchor (or isn't recurring).
 */
function formatRecurrencePattern(task: Task): string | null {
    const cfg = task.recurrence;
    if (!cfg) return null;

    if (cfg.cadence === "weekly" && cfg.hardDayOfWeek !== undefined) {
        return `Every ${dayName(cfg.hardDayOfWeek)}`;
    }
    if (cfg.cadence === "monthly") {
        if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
            return `${ordinalLabel(cfg.ordinalWeek)} ${dayName(cfg.hardDayOfWeek)} of each month`;
        }
        if (cfg.hardDayOfMonth !== undefined) {
            return `Day ${cfg.hardDayOfMonth} of each month`;
        }
    }
    return null;
}

function dayName(dow: number): string {
    return (
        [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ][dow] ?? "?"
    );
}

function ordinalLabel(ord: number): string {
    if (ord === -1) return "Last";
    if (ord === 1) return "1st";
    if (ord === 2) return "2nd";
    if (ord === 3) return "3rd";
    if (ord === 4) return "4th";
    return `${ord}th`;
}
