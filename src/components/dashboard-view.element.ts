import {defineElement, defineElementEvent, css, html, listen} from 'element-vir';
import type {Project, Task} from '../data/types.js';
import {ProjectCardElement} from './project-card.element.js';
import {OperationWizardDialogElement} from './operation-wizard-dialog.element.js';
import {isTaskOverdue, isTaskVisible} from '../data/storage.js';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardViewElement
// The main command center. Shows all active operations (projects).
// Includes a summary of overdue / flagged items at the top.
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardViewElement = defineElement<{
    projects: ReadonlyArray<Project>;
    tasks: ReadonlyArray<Task>;
}>()({
    tagName: 'dashboard-view',

    events: {
        projectSelected:  defineElementEvent<string>(),  // project id
        projectAdded:     defineElementEvent<Project>(),
        operationCreated: defineElementEvent<{project: Project; routines: ReadonlyArray<Task>}>(),
    },

    state: () => ({
        wizardOpen: false,
    }),

    styles: css`
        :host {
            display: block;
            padding: 0 12px;
        }

        .intel-banner {
            margin: 14px 0 0;
            background: #1B2A4A;
            color: #F5EFE0;
            padding: 10px 14px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.75rem;
            line-height: 1.5;
            border-left: 4px solid #B8860B;
        }

        .intel-banner .intel-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: #B8860B;
            margin-bottom: 3px;
        }

        .intel-stat {
            display: inline;
        }

        .intel-stat.alert {
            color: #FF8888;
            font-weight: 700;
        }

        .intel-stat.good {
            color: #88CC88;
        }

        .section-heading {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.75rem;
            letter-spacing: 0.25em;
            color: #6B6B6B;
            margin: 20px 0 10px 2px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-heading::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(0,0,0,0.12);
        }

        .project-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px 40px;
            font-family: 'Special Elite', serif;
        }

        .empty-state .stamp-text {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 2rem;
            letter-spacing: 0.3em;
            color: rgba(196, 30, 58, 0.15);
            border: 4px solid rgba(196, 30, 58, 0.1);
            display: inline-block;
            padding: 8px 24px;
            margin-bottom: 16px;
            transform: rotate(-2deg);
        }

        .empty-state p {
            font-size: 0.9rem;
            color: #6B6B6B;
            line-height: 1.6;
            margin-bottom: 8px;
        }

        .add-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin-top: 14px;
            padding: 14px;
            background: none;
            color: #1B2A4A;
            border: 2px dashed rgba(27, 42, 74, 0.3);
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
        }
        .add-btn:hover {
            background: rgba(27, 42, 74, 0.05);
            border-color: rgba(27, 42, 74, 0.6);
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {projects, tasks} = inputs;

        // Calculate summary stats for the intel banner
        const allVisible = tasks.filter(isTaskVisible);
        const overdueCount = allVisible.filter(isTaskOverdue).length;
        const pendingCount = allVisible.length;
        const completedToday = tasks.filter(t => {
            if (!t.completedAt) return false;
            const d = new Date(t.completedAt);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        }).length;

        return html`
            <!-- Intel summary banner -->
            ${projects.length > 0
                ? html`
                    <div class="intel-banner">
                        <div class="intel-title">DAILY STATUS BRIEFING</div>
                        <span class="intel-stat ${pendingCount > 0 ? '' : 'good'}">
                            ${pendingCount} directive${pendingCount !== 1 ? 's' : ''} pending
                        </span>
                        ${overdueCount > 0
                            ? html` · <span class="intel-stat alert">${overdueCount} overdue</span>`
                            : html``}
                        ${completedToday > 0
                            ? html` · <span class="intel-stat good">${completedToday} cleared today</span>`
                            : html``}
                    </div>
                  `
                : html``}

            <!-- Project grid -->
            ${projects.length === 0
                ? html`
                    <div class="empty-state">
                        <div class="stamp-text">NO ACTIVE OPERATIONS</div>
                        <p>
                            Your docket is empty, citizen.<br />
                            A true patriot doesn't wait for orders — they file their own.
                        </p>
                    </div>
                  `
                : html`
                    <div class="section-heading">ACTIVE OPERATIONS</div>
                    <div class="project-grid">
                        ${projects.map(
                            project => html`
                                <${ProjectCardElement.assign({
                                    project,
                                    tasks: tasks.filter(t => t.projectId === project.id),
                                })}
                                    ${listen(ProjectCardElement.events.selected, e =>
                                        dispatch(new events.projectSelected(e.detail)))}
                                ></${ProjectCardElement}>
                            `,
                        )}
                    </div>
                  `}

            <button
                class="add-btn"
                @click=${() => updateState({wizardOpen: true})}
            >
                + OPEN NEW OPERATION
            </button>

            <!-- Operation wizard dialog -->
            <${OperationWizardDialogElement.assign({open: state.wizardOpen})}
                ${listen(OperationWizardDialogElement.events.operationCreated, e => {
                    dispatch(new events.operationCreated(e.detail));
                    updateState({wizardOpen: false});
                })}
                ${listen(OperationWizardDialogElement.events.cancelled, () =>
                    updateState({wizardOpen: false}))}
            ></${OperationWizardDialogElement}>
        `;
    },
});
