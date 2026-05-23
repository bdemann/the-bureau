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
        projectSelected:   defineElementEvent<string>(),  // project id
        projectAdded:      defineElementEvent<Project>(),
        operationCreated:  defineElementEvent<{project: Project; routines: ReadonlyArray<Task>}>(),
        projectsReordered: defineElementEvent<ReadonlyArray<string>>(),  // ordered project ids
    },

    state: () => ({
        wizardOpen: false,
        draggedId: null as string | null,
        dragOverId: null as string | null,
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

        .card-drag-wrapper { position: relative; }
        .card-drag-wrapper.is-dragging { opacity: 0.35; }
        .card-drag-wrapper.is-drag-over::before {
            content: '';
            display: block;
            height: 2px;
            background: #1B2A4A;
            margin-bottom: 2px;
        }
        .drop-zone-end { height: 20px; }
        .drop-zone-end.is-drag-over { border-top: 2px solid #1B2A4A; }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {projects} = inputs;
        const {tasks} = inputs;

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
                            ${pendingCount} commitment${pendingCount !== 1 ? 's' : ''} pending
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
                        <div class="stamp-text">NO AREAS OF RESPONSIBILITY</div>
                        <p>
                            Your docket is empty, citizen.<br />
                            A true patriot doesn't wait for orders — they file their own.
                        </p>
                    </div>
                  `
                : html`
                    <div class="section-heading">AREAS OF RESPONSIBILITY</div>
                    <div class="project-grid">
                        ${projects.map(
                            project => html`
                                <div
                                    class="card-drag-wrapper ${state.draggedId === project.id ? 'is-dragging' : ''} ${state.dragOverId === project.id ? 'is-drag-over' : ''}"
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) => {
                                        e.dataTransfer?.setData('text/plain', project.id);
                                        updateState({draggedId: project.id});
                                    }}
                                    @dragover=${(e: DragEvent) => {
                                        e.preventDefault();
                                        if (state.draggedId && state.draggedId !== project.id) {
                                            updateState({dragOverId: project.id});
                                        }
                                    }}
                                    @dragleave=${() => {
                                        if (state.dragOverId === project.id) updateState({dragOverId: null});
                                    }}
                                    @drop=${(e: DragEvent) => {
                                        e.preventDefault();
                                        const fromId = e.dataTransfer?.getData('text/plain') ?? state.draggedId;
                                        if (fromId && fromId !== project.id) {
                                            dispatch(new events.projectsReordered(
                                                reorderBefore(projects, fromId, project.id).map(p => p.id)
                                            ));
                                        }
                                        updateState({draggedId: null, dragOverId: null});
                                    }}
                                    @dragend=${() => updateState({draggedId: null, dragOverId: null})}
                                >
                                    <${ProjectCardElement.assign({
                                        project,
                                        tasks: tasks.filter(t => t.projectId === project.id),
                                    })}
                                        ${listen(ProjectCardElement.events.selected, e =>
                                            dispatch(new events.projectSelected(e.detail)))}
                                    ></${ProjectCardElement}>
                                </div>
                            `,
                        )}
                        <div
                            class="drop-zone-end ${state.dragOverId === '__end__' ? 'is-drag-over' : ''}"
                            @dragover=${(e: DragEvent) => {
                                e.preventDefault();
                                if (state.draggedId) updateState({dragOverId: '__end__'});
                            }}
                            @dragleave=${() => {
                                if (state.dragOverId === '__end__') updateState({dragOverId: null});
                            }}
                            @drop=${(e: DragEvent) => {
                                e.preventDefault();
                                const fromId = e.dataTransfer?.getData('text/plain') ?? state.draggedId;
                                if (fromId) {
                                    dispatch(new events.projectsReordered(
                                        moveToEnd(projects, fromId).map(p => p.id)
                                    ));
                                }
                                updateState({draggedId: null, dragOverId: null});
                            }}
                        ></div>
                    </div>
                  `}

            <button
                class="add-btn"
                @click=${() => updateState({wizardOpen: true})}
            >
                + NEW AREA OF RESPONSIBILITY
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function reorderBefore<T extends {id: string}>(list: ReadonlyArray<T>, fromId: string, toId: string): T[] {
    const item = list.find(p => p.id === fromId);
    if (!item) return [...list];
    const rest = list.filter(p => p.id !== fromId);
    const idx = rest.findIndex(p => p.id === toId);
    if (idx === -1) return [...list];
    rest.splice(idx, 0, item);
    return rest;
}

function moveToEnd<T extends {id: string}>(list: ReadonlyArray<T>, fromId: string): T[] {
    const item = list.find(p => p.id === fromId);
    if (!item) return [...list];
    return [...list.filter(p => p.id !== fromId), item];
}
