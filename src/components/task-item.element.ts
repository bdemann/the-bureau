import {css, defineElement, defineElementEvent, html} from 'element-vir';
import {ViraButton, ViraColorVariant, ViraEmphasis, ViraSize} from 'vira';
import type {ConsequenceTier, Task} from '../data/types.js';
import {cadencePeriodWord, getSnoozeSeverity, tierShortLabel} from '../data/types.js';
import {isCurrentlySnoozed, isTaskOverdue} from '../data/storage.js';
import {isMultiplePerPeriod} from '../data/recurrence.js';
import {SnoozeIndicatorElement} from './snooze-indicator.element.js';

// ─────────────────────────────────────────────────────────────────────────────
// TaskItemElement
// Phase 2: index-card style row that surfaces consequence tier, suggested or
// hard date, multi-per-period progress (e.g. 1/3 this week), and snooze info.
// Visual degradation continues to escalate with snoozeCount.
// Buttons migrated to Vira; the card "paper" itself stays themed.
// ─────────────────────────────────────────────────────────────────────────────

export const TaskItemElement = defineElement<{
    task: Task;
    /** Optional: shown above the title when the daily view renders cross-project. */
    projectName?: string;
}>()({
    tagName: 'task-item',

    events: {
        completed:      defineElementEvent<string>(),  // task id
        snoozed:        defineElementEvent<string>(),  // task id
        unSnoozed:      defineElementEvent<string>(),  // task id
        skipped:        defineElementEvent<string>(),  // task id — recurring only
        progressLogged: defineElementEvent<string>(),  // task id — milestone only
        editRequested:  defineElementEvent<string>(),  // task id
    },

    styles: css`
        :host {
            display: block;
        }

        .task-card {
            background: #F5EFE0;
            border-left: 4px solid #2C2C2C;
            border-bottom: 1px solid rgba(0,0,0,0.12);
            padding: 12px 14px;
            position: relative;
            transition: border-color 0.2s;
            overflow: hidden;
            cursor: pointer;
        }

        /* Tier border colours (replaces priority colours). */
        .task-card.tier-1 { border-left-color: #C41E3A; } /* hard consequence — red */
        .task-card.tier-2 { border-left-color: #E8821A; } /* soft consequence — orange */
        .task-card.tier-3 { border-left-color: #B8860B; } /* quality — gold */
        .task-card.tier-4 { border-left-color: #6B9E6E; } /* aspirational — green */

        /* Snooze degradation — the card looks increasingly worn */
        .task-card.snooze-warning  { background: #FFF8EC; }
        .task-card.snooze-caution  { background: #FFF3E0; }
        .task-card.snooze-danger   { background: #FFF0EE; }
        .task-card.snooze-critical { background: #FFF5F5; }

        .task-card.overdue          { background: #FFF2F2; }
        .task-card.currently-snoozed { opacity: 0.6; }

        /* "UNDER REVIEW" diagonal stamp for critical snooze. */
        .task-card.snooze-critical::after {
            content: 'UNDER REVIEW';
            position: absolute;
            top: 50%;
            right: -10px;
            transform: translateY(-50%) rotate(90deg);
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.6rem;
            letter-spacing: 0.25em;
            color: rgba(139, 0, 0, 0.18);
            pointer-events: none;
            white-space: nowrap;
        }

        .project-tag {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.6rem;
            letter-spacing: 0.18em;
            color: #6B6B6B;
            margin-bottom: 4px;
        }

        .task-top {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .complete-checkbox {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border: 2px solid #6B6B6B;
            background: none;
            cursor: pointer;
            border-radius: 2px;
            margin-top: 1px;
            transition: border-color 0.15s, background 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Special Elite', serif;
            font-size: 0.85rem;
            color: transparent;
            line-height: 1;
            padding: 0;
        }
        @media (hover: hover) {
            .complete-checkbox:hover {
                border-color: #1B2A4A;
                background: rgba(27, 42, 74, 0.05);
                color: #1B2A4A;
            }
        }

        .task-title {
            flex: 1;
            font-family: 'Special Elite', serif;
            font-size: 0.9rem;
            line-height: 1.4;
            color: #2C2C2C;
        }

        .task-card.snooze-critical .task-title { color: #5A0000; }

        .tier-pip {
            flex-shrink: 0;
            font-size: 0.62rem;
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.1em;
            padding: 2px 6px;
            border-radius: 1px;
            margin-top: 2px;
        }
        .tier-pip.t-1 { background: #FFCCCC; color: #8B0000; }
        .tier-pip.t-2 { background: #FDDAC4; color: #7A3000; }
        .tier-pip.t-3 { background: #FAEBC8; color: #6B4A00; }
        .tier-pip.t-4 { background: #D8EDD8; color: #2E5E2E; }

        .task-meta {
            margin-top: 6px;
            padding-left: 30px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }

        .task-description {
            padding-left: 30px;
            margin-top: 4px;
            font-size: 0.78rem;
            color: #6B6B6B;
            line-height: 1.45;
        }

        .meta-chip {
            font-size: 0.68rem;
            color: #6B6B6B;
            font-family: 'Courier Prime', monospace;
        }
        .meta-chip.overdue {
            color: #C41E3A;
            font-weight: 700;
        }

        .progress-chip {
            font-size: 0.7rem;
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.1em;
            padding: 1px 6px;
            background: #1B2A4A;
            color: #F5EFE0;
            border-radius: 1px;
        }

        .task-actions {
            margin-top: 10px;
            padding-left: 30px;
            display: flex;
            gap: 8px;
        }

        .snoozed-until {
            font-size: 0.68rem;
            color: #6B6B6B;
            font-style: italic;
        }

        .progress-log-chip {
            font-size: 0.68rem;
            font-family: 'Courier Prime', monospace;
            color: #4A6741;
        }

        .milestone-complete-btn {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.72rem;
            letter-spacing: 0.12em;
            background: none;
            border: 1px solid #1B2A4A;
            color: #1B2A4A;
            padding: 3px 10px;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }

        @media (hover: hover) {
            .milestone-complete-btn:hover {
                background: #1B2A4A;
                color: #F5EFE0;
            }
        }

        .milestone-confirm {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Special Elite', serif;
            font-size: 0.75rem;
            color: #4A4A4A;
        }
    `,

    state: () => ({
        confirmingComplete: false,
    }),

    render({inputs, state, updateState, dispatch, events}) {
        const {task} = inputs;
        const severity = getSnoozeSeverity(task.snoozeCount);
        const overdue = isTaskOverdue(task);
        const currentlySnoozed = isCurrentlySnoozed(task);
        const isMulti = isMultiplePerPeriod(task);
        const tier = task.consequenceTier as ConsequenceTier;

        const classes = [
            'task-card',
            `tier-${tier}`,
            severity !== 'none' ? `snooze-${severity}` : '',
            overdue ? 'overdue' : '',
            currentlySnoozed ? 'currently-snoozed' : '',
        ].filter(Boolean).join(' ');

        const dueLabel = formatDueLabel(task, overdue);
        const snoozedUntilStr = currentlySnoozed && task.snoozedUntil
            ? new Date(task.snoozedUntil).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
            : null;

        const cadenceWord = task.recurrence ? cadencePeriodWord(task.recurrence.cadence) : null;
        const progressLabel = isMulti
            ? `${task.completionsThisPeriod} / ${task.recurrence!.frequencyPerPeriod} this ${cadenceWord}`
            : null;

        const isMilestone = task.windowType === 'milestone';

        // Hard-date tasks may not be snoozed past the date.
        const canSnooze = !(task.windowType === 'hard'
            && task.suggestedDate !== null
            && task.suggestedDate <= Date.now());

        return html`
            <div class="${classes}" @click=${() => dispatch(new events.editRequested(task.id))}>
                ${inputs.projectName
                    ? html`<div class="project-tag">${inputs.projectName}</div>`
                    : html``}

                <div class="task-top">
                    <button
                        class="complete-checkbox"
                        title=${isMilestone ? 'Log progress' : 'Mark complete'}
                        @click=${(e: Event) => {
                            e.stopPropagation();
                            isMilestone
                                ? dispatch(new events.progressLogged(task.id))
                                : dispatch(new events.completed(task.id));
                        }}
                    >✓</button>

                    <span class="task-title">${task.title}</span>

                    <span class="tier-pip t-${tier}">${tierShortLabel(tier)}</span>
                </div>

                ${task.description
                    ? html`<p class="task-description">${task.description}</p>`
                    : html``}

                <div class="task-meta">
                    ${dueLabel
                        ? html`
                            <span class="meta-chip ${overdue ? 'overdue' : ''}">
                                ${dueLabel}
                            </span>
                        `
                        : html``}

                    ${progressLabel
                        ? html`<span class="progress-chip">${progressLabel}</span>`
                        : html``}

                    ${isMilestone && task.progressCount > 0
                        ? html`<span class="progress-log-chip">${task.progressCount} session${task.progressCount === 1 ? '' : 's'} logged</span>`
                        : html``}

                    ${task.snoozeCount > 0
                        ? html`
                            <${SnoozeIndicatorElement.assign({snoozeCount: task.snoozeCount})}
                            ></${SnoozeIndicatorElement}>
                        `
                        : html``}

                    ${snoozedUntilStr
                        ? html`<span class="snoozed-until">Snoozed until ${snoozedUntilStr}</span>`
                        : html``}
                </div>

                ${task.completedAt === null ? html`
                <div class="task-actions">
                    ${currentlySnoozed
                        ? html`
                            <${ViraButton.assign({
                                text: 'Wake up',
                                color: ViraColorVariant.Info,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${(e: Event) => { e.stopPropagation(); dispatch(new events.unSnoozed(task.id)); }}
                            ></${ViraButton}>
                        `
                        : html`
                            <${ViraButton.assign({
                                text: canSnooze ? 'Snooze (+24h)' : 'Cannot snooze',
                                color: ViraColorVariant.Warning,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                                isDisabled: !canSnooze,
                            })}
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    if (canSnooze) dispatch(new events.snoozed(task.id));
                                }}
                            ></${ViraButton}>
                            ${task.recurrence ? html`
                                <${ViraButton.assign({
                                    text: 'Skip',
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${(e: Event) => { e.stopPropagation(); dispatch(new events.skipped(task.id)); }}
                                ></${ViraButton}>
                            ` : html``}
                            ${isMilestone ? html`
                                ${state.confirmingComplete
                                    ? html`
                                        <span class="milestone-confirm">
                                            Truly done?
                                            <${ViraButton.assign({
                                                text: 'Yes, complete',
                                                color: ViraColorVariant.Info,
                                                buttonEmphasis: ViraEmphasis.Standard,
                                                buttonSize: ViraSize.Small,
                                            })}
                                                @click=${(e: Event) => {
                                                    e.stopPropagation();
                                                    updateState({confirmingComplete: false});
                                                    dispatch(new events.completed(task.id));
                                                }}
                                            ></${ViraButton}>
                                            <${ViraButton.assign({
                                                text: 'Not yet',
                                                color: ViraColorVariant.Neutral,
                                                buttonEmphasis: ViraEmphasis.Subtle,
                                                buttonSize: ViraSize.Small,
                                            })}
                                                @click=${(e: Event) => { e.stopPropagation(); updateState({confirmingComplete: false}); }}
                                            ></${ViraButton}>
                                        </span>
                                    `
                                    : html`
                                        <button
                                            class="milestone-complete-btn"
                                            @click=${(e: Event) => { e.stopPropagation(); updateState({confirmingComplete: true}); }}
                                        >Mark Complete</button>
                                    `}
                            ` : html``}
                        `}
                </div>
                ` : html``}
            </div>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDueLabel(task: Task, overdue: boolean): string | null {
    const pattern = formatRecurrencePattern(task);
    const due = task.suggestedDate ?? task.dueDate;
    if (due === null) return pattern;

    const fmt = new Date(due).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    if (task.windowType === 'hard') {
        const base = overdue ? `⚠ MISSED — ${fmt}` : `Due ${fmt}`;
        return pattern ? `${pattern} · next ${fmt}` : base;
    }
    if (pattern) {
        return `${pattern} · next ${fmt}`;
    }
    if (task.windowDeadline !== null) {
        const deadlineDate = new Date(task.windowDeadline);
        const sameDay = deadlineDate.toDateString() === new Date(due).toDateString();
        if (!sameDay) {
            const deadline = deadlineDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
            return `Suggested ${fmt} · window ends ${deadline}`;
        }
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

    if (cfg.cadence === 'weekly' && cfg.hardDayOfWeek !== undefined) {
        return `Every ${dayName(cfg.hardDayOfWeek)}`;
    }
    if (cfg.cadence === 'monthly') {
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
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow] ?? '?';
}

function ordinalLabel(ord: number): string {
    if (ord === -1) return 'Last';
    if (ord === 1)  return '1st';
    if (ord === 2)  return '2nd';
    if (ord === 3)  return '3rd';
    if (ord === 4)  return '4th';
    return `${ord}th`;
}
