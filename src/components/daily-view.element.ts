import {assign, css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {ViraButton, ViraColorVariant, ViraEmphasis, ViraSize} from 'vira';
import type {DailyBand, Project, Task} from '../data/types.js';
import {bandLabel, bandSubtitle, getDailyBand} from '../data/urgency.js';
import {TaskItemElement} from './task-item.element.js';

// ─────────────────────────────────────────────────────────────────────────────
// DailyViewElement
// Cross-project landing view: every visible task, sorted into urgency bands.
// State is owned by the parent (bureau-app); this element only renders.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 5;

export const DailyViewElement = defineElement<{
    tasks: ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
}>()({
    tagName: 'daily-view',

    events: {
        taskCompleted: defineElementEvent<string>(),
        taskSnoozed:   defineElementEvent<string>(),
        taskUnSnoozed: defineElementEvent<string>(),
    },

    stateInitStatic: {
        expandRadar:   false,
        expandBacklog: false,
    },

    styles: css`
        :host {
            display: block;
            padding: 12px 16px 80px;
        }

        .band {
            margin-bottom: 24px;
        }

        .band-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(0,0,0,0.15);
        }
        .band-header.mandatory  { border-bottom-color: #C41E3A; }
        .band-header.suggested  { border-bottom-color: #E8821A; }
        .band-header.radar      { border-bottom-color: #B8860B; }
        .band-header.backlog    { border-bottom-color: rgba(0,0,0,0.2); }

        .band-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            letter-spacing: 0.18em;
            color: #1B2A4A;
        }
        .band-header.mandatory .band-title { color: #C41E3A; }
        .band-header.suggested .band-title { color: #7A3000; }

        .band-subtitle {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
            color: #6B6B6B;
            letter-spacing: 0.05em;
        }

        .band-count {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
            color: #6B6B6B;
        }

        .band-empty {
            font-family: 'Special Elite', serif;
            font-size: 0.85rem;
            color: #6B6B6B;
            padding: 14px 8px;
            background: rgba(255,253,247,0.6);
            border: 1px dashed rgba(0,0,0,0.15);
            text-align: center;
        }

        .task-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .collapse-toggle {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const today = new Date();
        const projectsById = new Map(inputs.projects.map(p => [p.id, p]));

        // Bucket tasks by band, ignoring hidden ones.
        const bands: Record<DailyBand, Task[]> = {
            mandatory: [],
            suggested: [],
            radar:     [],
            backlog:   [],
            hidden:    [],
        };
        for (const task of inputs.tasks) {
            const band = getDailyBand(task, today);
            bands[band].push(task);
        }

        // Sort each band by tier, then by due date (sooner first).
        for (const k of ['mandatory', 'suggested', 'radar', 'backlog'] as DailyBand[]) {
            bands[k].sort((a, b) => {
                if (a.consequenceTier !== b.consequenceTier) {
                    return a.consequenceTier - b.consequenceTier;
                }
                const aDue = a.suggestedDate ?? a.windowDeadline ?? Number.POSITIVE_INFINITY;
                const bDue = b.suggestedDate ?? b.windowDeadline ?? Number.POSITIVE_INFINITY;
                return aDue - bDue;
            });
        }

        const renderTaskList = (tasks: Task[]) => html`
            <div class="task-list">
                ${tasks.map(t => html`
                    <${TaskItemElement}
                        ${assign(TaskItemElement, {
                            task: t,
                            projectName: projectsById.get(t.projectId)?.name,
                        })}
                        ${listen(TaskItemElement.events.completed, e =>
                            dispatch(new events.taskCompleted(e.detail)))}
                        ${listen(TaskItemElement.events.snoozed, e =>
                            dispatch(new events.taskSnoozed(e.detail)))}
                        ${listen(TaskItemElement.events.unSnoozed, e =>
                            dispatch(new events.taskUnSnoozed(e.detail)))}
                    ></${TaskItemElement}>
                `)}
            </div>
        `;

        const renderBand = (
            band: DailyBand,
            opts?: {
                emptyMessage?: string;
                collapsible?: boolean;
                /** When true, this band is collapsed regardless of task count. Otherwise it only collapses past COLLAPSE_THRESHOLD. */
                alwaysCollapse?: boolean;
                expanded?: boolean;
                onToggle?: () => void;
            },
        ) => {
            const tasks = bands[band];
            const overThreshold = tasks.length > COLLAPSE_THRESHOLD;
            const showCollapsed =
                opts?.collapsible
                && (opts.alwaysCollapse || overThreshold)
                && !opts.expanded;

            return html`
                <section class="band">
                    <div class="band-header ${band}">
                        <div>
                            <div class="band-title">${bandLabel(band)}</div>
                            <div class="band-subtitle">${bandSubtitle(band)}</div>
                        </div>
                        <div class="band-count">${tasks.length}</div>
                    </div>

                    ${tasks.length === 0
                        ? opts?.emptyMessage
                            ? html`<div class="band-empty">${opts.emptyMessage}</div>`
                            : html``
                        : showCollapsed
                            ? html`
                                <div class="collapse-toggle">
                                    <${ViraButton}
                                        ${assign(ViraButton, {
                                            text: `Show ${tasks.length}`,
                                            color: ViraColorVariant.Neutral,
                                            buttonEmphasis: ViraEmphasis.Subtle,
                                            buttonSize: ViraSize.Small,
                                        })}
                                        @click=${opts?.onToggle ?? (() => {})}
                                    ></${ViraButton}>
                                </div>
                              `
                            : html`
                                ${renderTaskList(tasks)}
                                ${opts?.collapsible && opts.expanded
                                    ? html`
                                        <div class="collapse-toggle">
                                            <${ViraButton}
                                                ${assign(ViraButton, {
                                                    text: 'Hide',
                                                    color: ViraColorVariant.Neutral,
                                                    buttonEmphasis: ViraEmphasis.Subtle,
                                                    buttonSize: ViraSize.Small,
                                                })}
                                                @click=${opts?.onToggle ?? (() => {})}
                                            ></${ViraButton}>
                                        </div>
                                      `
                                    : html``}
                              `}
                </section>
            `;
        };

        return html`
            ${renderBand('mandatory', {
                emptyMessage: 'No mandatory tasks today. Agent Reyes approves.',
            })}
            ${renderBand('suggested')}
            ${renderBand('radar', {
                collapsible: true,
                expanded: state.expandRadar,
                onToggle: () => updateState({expandRadar: !state.expandRadar}),
            })}
            ${renderBand('backlog', {
                collapsible: true,
                alwaysCollapse: true,
                expanded: state.expandBacklog,
                onToggle: () => updateState({expandBacklog: !state.expandBacklog}),
            })}
        `;
    },
});
