import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
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

const REPORT_NOTICE_RESHOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const DailyViewElement = defineElement<{
    tasks: ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
    reportNoticeDismissedAt: number | null;
}>()({
    tagName: 'daily-view',

    events: {
        taskCompleted:         defineElementEvent<string>(),
        taskSnoozed:           defineElementEvent<string>(),
        taskUnSnoozed:         defineElementEvent<string>(),
        taskSkipped:           defineElementEvent<string>(),
        taskProgressLogged:    defineElementEvent<string>(),
        reportNoticeDismissed: defineElementEvent<void>(),
    },

    state: () => ({
        expandRadar:   false,
        expandBacklog: false,
        reportCopied:  false,
    }),

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

        .report-notice {
            margin-top: 40px;
            border: 1px solid rgba(0,0,0,0.2);
            border-top: 3px solid #1B2A4A;
            padding: 14px 16px;
            background: rgba(255,253,247,0.7);
            position: relative;
            overflow: hidden;
        }

        .report-notice::before {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                -55deg,
                transparent,
                transparent 18px,
                rgba(27,42,74,0.02) 18px,
                rgba(27,42,74,0.02) 20px
            );
            pointer-events: none;
        }

        .report-notice-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }

        .report-notice-dismiss {
            background: none;
            border: none;
            cursor: pointer;
            color: #6B6B6B;
            font-size: 1rem;
            line-height: 1;
            padding: 0;
            flex-shrink: 0;
            transition: color 0.15s;
        }

        .report-notice-dismiss:hover {
            color: #1B2A4A;
        }

        .report-notice-eyebrow {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.6rem;
            letter-spacing: 0.3em;
            color: #6B6B6B;
            margin-bottom: 4px;
        }

        .report-notice-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.1rem;
            letter-spacing: 0.15em;
            color: #1B2A4A;
            margin-bottom: 6px;
        }

        .report-notice-body {
            font-family: 'Special Elite', serif;
            font-size: 0.78rem;
            color: #4A4A4A;
            line-height: 1.5;
            margin-bottom: 12px;
        }

        .report-notice-btn {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            background: #1B2A4A;
            color: #F5EFE0;
            border: none;
            padding: 8px 18px;
            cursor: pointer;
            transition: background 0.15s;
        }

        .report-notice-btn:hover {
            background: #2C3E6B;
        }

        .report-copied {
            font-family: 'Courier Prime', monospace;
            font-size: 0.68rem;
            color: #6B6B6B;
            margin-left: 10px;
            font-style: italic;
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
                    <${TaskItemElement.assign({
                        task: t,
                        projectName: projectsById.get(t.projectId)?.name,
                    })}
                        ${listen(TaskItemElement.events.completed, e =>
                            dispatch(new events.taskCompleted(e.detail)))}
                        ${listen(TaskItemElement.events.snoozed, e =>
                            dispatch(new events.taskSnoozed(e.detail)))}
                        ${listen(TaskItemElement.events.unSnoozed, e =>
                            dispatch(new events.taskUnSnoozed(e.detail)))}
                        ${listen(TaskItemElement.events.skipped, e =>
                            dispatch(new events.taskSkipped(e.detail)))}
                        ${listen(TaskItemElement.events.progressLogged, e =>
                            dispatch(new events.taskProgressLogged(e.detail)))}
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
                                    <${ViraButton.assign({
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
                                            <${ViraButton.assign({
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

        const CLEAR_URL = 'https://clear.bureauofcivicresponsibility.org';

        const showReportNotice = inputs.reportNoticeDismissedAt === null
            || (Date.now() - inputs.reportNoticeDismissedAt) >= REPORT_NOTICE_RESHOW_MS;

        async function onReport() {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'CLEAR — Civic Engagement Tracking System',
                        text: 'A neighbor has been flagged for potential civic disengagement. Install CLEAR to verify your own compliance record and demonstrate your patriotism to the Bureau.',
                        url: CLEAR_URL,
                    });
                } catch {
                    // User cancelled share — no action needed.
                }
            } else {
                await navigator.clipboard.writeText(CLEAR_URL);
                updateState({reportCopied: true});
                setTimeout(() => updateState({reportCopied: false}), 3000);
            }
        }

        return html`
            ${renderBand('mandatory', {
                emptyMessage: 'No mandatory tasks today. Agent Whitaker approves.',
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

            ${showReportNotice ? html`
            <div class="report-notice">
                <div class="report-notice-top">
                    <div class="report-notice-eyebrow">Bureau of Civic Responsibility — Community Bulletin</div>
                    <button
                        class="report-notice-dismiss"
                        title="Dismiss"
                        @click=${() => dispatch(new events.reportNoticeDismissed())}
                    >×</button>
                </div>
                <div class="report-notice-title">Report a Neighbor</div>
                <div class="report-notice-body">
                    Civic disengagement doesn't just affect the individual — it weakens
                    the Republic. If you suspect a neighbor of failing their obligations,
                    refer them to CLEAR. It's not just your right. It's your duty.
                </div>
                <button class="report-notice-btn" @click=${onReport}>
                    File a Report
                </button>
                ${state.reportCopied
                    ? html`<span class="report-copied">Link copied to clipboard.</span>`
                    : html``}
            </div>
            ` : html``}
        `;
    },
});
