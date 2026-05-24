import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import type {FormKind, Goal, GoalStatus, Idea, Project, Task} from '../data/types.js';
import {isCurrentlyPaused, isTaskVisible} from '../data/storage.js';
import {TaskItemElement} from './task-item.element.js';
import {IdeasViewElement} from './ideas-view.element.js';

function fmtDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

// ─────────────────────────────────────────────────────────────────────────────
// GoalDetailElement
// Detail view for a single objective: linked commitments, task management,
// status control, and link/unlink tools.
// ─────────────────────────────────────────────────────────────────────────────

export const GoalDetailElement = defineElement<{
    goal: Goal;
    tasks: ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
    ideas: ReadonlyArray<Idea>;
}>()({
    tagName: 'goal-detail',

    events: {
        goalUpdated:             defineElementEvent<Goal>(),
        goalDeleted:             defineElementEvent<string>(),
        goalEditRequested:       defineElementEvent<Goal>(),
        taskCompleted:           defineElementEvent<string>(),
        taskSnoozed:             defineElementEvent<string>(),
        taskUnSnoozed:           defineElementEvent<string>(),
        taskSkipped:             defineElementEvent<string>(),
        taskProgressLogged:      defineElementEvent<string>(),
        taskEditRequested:       defineElementEvent<string>(),
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        taskUnlinked:            defineElementEvent<{goalId: string; taskId: string}>(),
        taskLinked:              defineElementEvent<{goalId: string; taskId: string}>(),
        ideaUpdated:             defineElementEvent<Idea>(),
        ideaDeleted:             defineElementEvent<string>(),
        ideaEditRequested:       defineElementEvent<Idea>(),
        ideaPromoteRequested:    defineElementEvent<Idea>(),
    },

    state: () => ({
        confirmingDelete: false,
        linkPickerOpen:   false,
        linkSearchQuery:  '',
        showCompleted:    false,
    }),

    styles: css`
        :host {
            display: block;
            padding: 0 12px 80px;
        }

        .goal-header {
            background: var(--color-card);
            border: 1px solid rgba(0,0,0,0.12);
            border-left: 4px solid var(--color-primary);
            padding: 14px 16px;
            margin-bottom: 16px;
        }

        .goal-header.achieved { border-left-color: var(--color-success); }
        .goal-header.abandoned { border-left-color: var(--color-text-faint); opacity: 0.85; }

        .goal-title {
            font-family: var(--font-accent);
            font-size: 1.15rem;
            color: var(--color-primary);
            margin-bottom: 6px;
            line-height: 1.35;
        }

        .goal-desc {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: #444;
            margin-bottom: 8px;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        .goal-meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            margin-bottom: 10px;
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.06em;
            color: var(--color-text-muted);
        }

        .target-date { color: var(--color-warning); }
        .target-date.overdue { color: var(--color-danger); }

        .status-badge {
            font-family: var(--font-display);
            font-size: 0.72rem;
            letter-spacing: 0.12em;
            padding: 2px 7px;
        }
        .status-badge.achieved  { background: var(--color-success); color: #fff; }
        .status-badge.abandoned { background: var(--color-text-faint); color: #fff; }

        .project-badge {
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            padding: 2px 6px;
            border: 1px solid rgba(0,0,0,0.15);
            color: var(--color-text-muted);
        }

        .goal-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .action-btn {
            font-family: var(--font-display);
            letter-spacing: 0.1em;
            font-size: 0.72rem;
            padding: 4px 10px;
            border: none;
            cursor: pointer;
        }

        .action-achieve    { background: var(--color-success); color: #fff; }
        .action-achieve:hover  { background: var(--color-success-dark); }
        .action-abandon    { background: transparent; border: 1px solid var(--color-text-faint); color: var(--color-text-muted); }
        .action-abandon:hover  { background: rgba(0,0,0,0.05); }
        .action-reactivate { background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); }
        .action-reactivate:hover { background: rgba(var(--color-primary-rgb),0.05); }
        .action-edit       { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: var(--color-primary); }
        .action-edit:hover { background: rgba(0,0,0,0.05); }
        .action-link       { background: transparent; border: 1px solid var(--color-warning); color: var(--color-warning); }
        .action-link:hover { background: rgba(184,134,11,0.07); }

        .btn {
            font-family: var(--font-display);
            letter-spacing: 0.12em;
            font-size: 0.85rem;
            padding: 7px 16px;
            border: none;
            cursor: pointer;
        }

        .btn-primary { background: var(--color-primary); color: var(--color-surface); }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .btn-ghost   { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: var(--color-primary); }
        .btn-ghost:hover { background: rgba(0,0,0,0.05); }
        .btn-danger  { background: var(--color-danger); color: var(--color-surface); }
        .btn-danger:hover { background: var(--color-danger-dark); }

        .section-label {
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: var(--color-text-muted);
            padding: 16px 2px 6px;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            margin-bottom: 2px;
        }

        .task-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        .task-with-unlink {
            display: flex;
            flex-direction: column;
        }

        .task-unlink-row {
            display: flex;
            justify-content: flex-end;
            padding: 3px 0 6px;
        }

        .unlink-task-btn {
            background: none;
            border: none;
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.08em;
            color: var(--color-text-faint);
            cursor: pointer;
            padding: 0;
            text-decoration: underline;
            text-underline-offset: 2px;
        }
        .unlink-task-btn:hover { color: var(--color-danger); }

        .empty-state {
            text-align: center;
            padding: 32px 20px;
            color: var(--color-text-muted);
            font-family: var(--font-accent);
            font-size: 0.9rem;
        }

        .add-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin: 14px 0 0;
            padding: 12px;
            background: var(--color-primary);
            color: var(--color-surface);
            border: none;
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s;
        }
        .add-btn:hover { background: var(--color-primary-hover); }

        .toggle-completed {
            background: none;
            border: none;
            font-family: var(--font-mono);
            font-size: 0.72rem;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 4px 2px;
            text-decoration: underline;
            text-underline-offset: 2px;
            display: block;
            margin-top: 4px;
        }

        .snoozed-section { margin-top: 8px; }

        .completed-task {
            opacity: 0.45;
            position: relative;
        }

        .completed-task::after {
            content: 'CLEARED';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-5deg);
            font-family: var(--font-display);
            font-size: 1.1rem;
            letter-spacing: 0.3em;
            color: rgba(46, 94, 46, 0.3);
            border: 3px solid rgba(46, 94, 46, 0.25);
            padding: 2px 12px;
            pointer-events: none;
            white-space: nowrap;
        }

        /* ── Link picker overlay ── */
        .picker-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 500;
            display: flex;
            align-items: flex-end;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .picker-panel {
            width: 100%;
            max-height: 70vh;
            background: var(--color-card);
            border-top: 3px solid var(--color-warning);
            display: flex;
            flex-direction: column;
            animation: panel-up 0.2s ease-out;
        }

        @keyframes panel-up {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
        }

        .picker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px 8px;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            flex-shrink: 0;
        }

        .picker-title {
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            color: var(--color-primary);
        }

        .picker-close {
            background: none;
            border: none;
            font-size: 1.3rem;
            line-height: 1;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 0 2px;
        }
        .picker-close:hover { color: var(--color-primary); }

        .picker-search {
            padding: 10px 16px;
            flex-shrink: 0;
            border-bottom: 1px solid rgba(0,0,0,0.08);
        }

        .picker-search input {
            width: 100%;
            border: 1px solid rgba(0,0,0,0.18);
            background: #fff;
            padding: 8px 10px;
            font-family: var(--font-mono);
            font-size: 0.88rem;
            color: var(--color-primary);
            box-sizing: border-box;
        }

        .picker-list {
            overflow-y: auto;
            flex: 1;
            padding: 6px 0 16px;
        }

        .picker-item {
            display: flex;
            flex-direction: column;
            padding: 10px 16px;
            cursor: pointer;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            transition: background 0.1s;
        }
        .picker-item:hover { background: rgba(var(--color-primary-rgb),0.05); }

        .picker-item-title {
            font-family: var(--font-accent);
            font-size: 0.9rem;
            color: var(--color-primary);
        }

        .picker-item-meta {
            display: flex;
            gap: 6px;
            margin-top: 3px;
            flex-wrap: wrap;
        }

        .picker-badge {
            font-family: var(--font-mono);
            font-size: 0.6rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 1px 5px;
            border: 1px solid rgba(0,0,0,0.15);
            color: var(--color-text-muted);
        }

        .picker-badge.kind-routine { border-color: rgba(var(--color-primary-rgb),0.25); color: var(--color-primary); }

        .picker-empty {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text-faint);
            text-align: center;
            padding: 24px 16px;
        }

        .delete-zone {
            margin-top: 32px;
            border-top: 1px solid rgba(0,0,0,0.1);
            padding-top: 16px;
        }

        .delete-btn {
            background: none;
            border: 1px solid var(--color-danger);
            color: var(--color-danger);
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.2em;
            padding: 8px 16px;
            cursor: pointer;
        }
        .delete-btn:hover { background: var(--color-danger); color: var(--color-surface); }

        .confirm-delete {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            background: #FFF5F5;
            border: 1px solid var(--color-danger);
        }

        .confirm-delete p {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-danger-dark);
            margin: 0;
        }

        .confirm-actions {
            display: flex;
            gap: 8px;
        }

        .confirm-yes {
            background: var(--color-danger);
            border: none;
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.15em;
            padding: 8px 16px;
            cursor: pointer;
        }
        .confirm-yes:hover { background: var(--color-danger-dark); }

        .confirm-no {
            background: none;
            border: 1px solid var(--color-text-muted);
            color: var(--color-text-muted);
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.15em;
            padding: 8px 16px;
            cursor: pointer;
        }
        .confirm-no:hover { background: rgba(0,0,0,0.05); }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {goal, tasks, projects} = inputs;
        const now = Date.now();

        const linkedTasks = tasks.filter(t => goal.linkedTaskIds.includes(t.id));

        const activeTasks  = linkedTasks.filter(isTaskVisible);
        const pausedTasks  = linkedTasks.filter(
            t => t.completedAt === null && isCurrentlyPaused(t),
        );
        const snoozedTasks = linkedTasks.filter(
            t =>
                t.completedAt === null &&
                !isCurrentlyPaused(t) &&
                t.snoozedUntil !== null &&
                t.snoozedUntil > now,
        );
        const completedTasks = linkedTasks
            .filter(t => t.completedAt !== null)
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

        const linkableTasks = tasks.filter(
            t => !goal.linkedTaskIds.includes(t.id) && t.completedAt === null,
        );

        const projectName = projects.find(p => p.id === goal.projectId)?.name ?? null;
        const isActive = goal.status === 'active';
        const dateOverdue = goal.targetDate !== null && goal.targetDate < now && isActive;

        function setStatus(status: GoalStatus): void {
            dispatch(new events.goalUpdated({...goal, status}));
        }

        function renderTaskWithUnlink(task: Task, showManageActions: boolean) {
            return html`
                <div class="task-with-unlink">
                    <${TaskItemElement.assign({task})}
                        ${showManageActions ? html`
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
                        ` : html``}
                        ${listen(TaskItemElement.events.editRequested, e =>
                            dispatch(new events.taskEditRequested(e.detail)))}
                    ></${TaskItemElement}>
                    <div class="task-unlink-row">
                        <button
                            class="unlink-task-btn"
                            @click=${() => dispatch(new events.taskUnlinked({goalId: goal.id, taskId: task.id}))}
                        >⊗ unlink from objective</button>
                    </div>
                </div>
            `;
        }

        return html`
            <!-- Goal header -->
            <div class=${'goal-header ' + goal.status}>
                <div class="goal-title">${goal.title}</div>
                ${goal.description
                    ? html`<div class="goal-desc">${goal.description}</div>`
                    : html``}
                <div class="goal-meta">
                    ${goal.targetDate
                        ? html`<span class=${'target-date' + (dateOverdue ? ' overdue' : '')}>
                                ⊙ Target: ${fmtDate(goal.targetDate)}${dateOverdue ? ' · OVERDUE' : ''}
                              </span>`
                        : html``}
                    ${!isActive
                        ? html`<span class=${'status-badge ' + goal.status}>
                                ${goal.status === 'achieved' ? '✓ Achieved' : '✕ Abandoned'}
                              </span>`
                        : html``}
                    ${projectName
                        ? html`<span class="project-badge">⊙ ${projectName}</span>`
                        : html``}
                </div>
                <div class="goal-actions">
                    ${isActive
                        ? html`
                            <button
                                class="action-btn action-achieve"
                                @click=${() => setStatus('achieved')}
                            >MARK ACHIEVED</button>
                          `
                        : html`
                            <button
                                class="action-btn action-reactivate"
                                @click=${() => setStatus('active')}
                            >REACTIVATE</button>
                          `}
                    <button
                        class="action-btn action-edit"
                        @click=${() => dispatch(new events.goalEditRequested(goal))}
                    >EDIT</button>
                    ${linkableTasks.length > 0
                        ? html`<button
                                class="action-btn action-link"
                                @click=${() => updateState({linkPickerOpen: true, linkSearchQuery: ''})}
                            >LINK COMMITMENT</button>`
                        : html``}
                </div>
            </div>

            <!-- Add commitment button -->
            <button
                class="add-btn"
                @click=${() => dispatch(new events.makeCommitmentRequested('task'))}
            >+ MAKE NEW COMMITMENT</button>

            <!-- Empty state -->
            ${activeTasks.length === 0 && pausedTasks.length === 0 && snoozedTasks.length === 0
                ? html`
                    <div class="empty-state">
                        No active commitments linked to this objective.
                    </div>
                  `
                : html``}

            <!-- Active tasks -->
            ${activeTasks.length > 0
                ? html`
                    <div class="section-label">ACTIVE COMMITMENTS</div>
                    <div class="task-list">
                        ${activeTasks.map(task => renderTaskWithUnlink(task, true))}
                    </div>
                  `
                : html``}

            <!-- Paused tasks -->
            ${pausedTasks.length > 0
                ? html`
                    <div class="snoozed-section">
                        <div class="section-label">PAUSED (${pausedTasks.length})</div>
                        <div class="task-list">
                            ${pausedTasks.map(task => renderTaskWithUnlink(task, false))}
                        </div>
                    </div>
                  `
                : html``}

            <!-- Snoozed tasks -->
            ${snoozedTasks.length > 0
                ? html`
                    <div class="snoozed-section">
                        <div class="section-label">SNOOZED (${snoozedTasks.length})</div>
                        <div class="task-list">
                            ${snoozedTasks.map(task => html`
                                <div class="task-with-unlink">
                                    <${TaskItemElement.assign({task})}
                                        ${listen(TaskItemElement.events.completed, e =>
                                            dispatch(new events.taskCompleted(e.detail)))}
                                        ${listen(TaskItemElement.events.snoozed, e =>
                                            dispatch(new events.taskSnoozed(e.detail)))}
                                        ${listen(TaskItemElement.events.unSnoozed, e =>
                                            dispatch(new events.taskUnSnoozed(e.detail)))}
                                        ${listen(TaskItemElement.events.editRequested, e =>
                                            dispatch(new events.taskEditRequested(e.detail)))}
                                    ></${TaskItemElement}>
                                    <div class="task-unlink-row">
                                        <button
                                            class="unlink-task-btn"
                                            @click=${() => dispatch(new events.taskUnlinked({goalId: goal.id, taskId: task.id}))}
                                        >⊗ unlink from objective</button>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                  `
                : html``}

            <!-- Completed tasks (collapsible) -->
            ${completedTasks.length > 0
                ? html`
                    <button
                        class="toggle-completed"
                        @click=${() => updateState({showCompleted: !state.showCompleted})}
                    >
                        ${state.showCompleted ? 'Hide' : 'Show'}
                        ${completedTasks.length} cleared commitment${completedTasks.length !== 1 ? 's' : ''}
                    </button>

                    ${state.showCompleted
                        ? html`
                            <div class="section-label">CLEARED</div>
                            <div class="task-list">
                                ${completedTasks.map(task => html`
                                    <div class="completed-task">
                                        ${renderTaskWithUnlink(task, false)}
                                    </div>
                                `)}
                            </div>
                          `
                        : html``}
                  `
                : html``}

            <!-- Link commitment picker overlay -->
            ${state.linkPickerOpen
                ? html`
                    <div
                        class="picker-overlay"
                        @click=${(e: Event) => {
                            if (e.target === e.currentTarget)
                                updateState({linkPickerOpen: false});
                        }}
                    >
                        <div class="picker-panel">
                            <div class="picker-header">
                                <span class="picker-title">LINK COMMITMENT</span>
                                <button
                                    class="picker-close"
                                    @click=${() => updateState({linkPickerOpen: false})}
                                >×</button>
                            </div>
                            <div class="picker-search">
                                <input
                                    type="text"
                                    placeholder="Search commitments…"
                                    .value=${state.linkSearchQuery}
                                    @input=${(e: Event) =>
                                        updateState({linkSearchQuery: (e.target as HTMLInputElement).value})}
                                    autofocus
                                />
                            </div>
                            <div class="picker-list">
                                ${(() => {
                                    const q = state.linkSearchQuery.toLowerCase();
                                    const filtered = linkableTasks.filter(t =>
                                        t.title.toLowerCase().includes(q) ||
                                        (projects.find(p => p.id === t.projectId)?.name ?? '').toLowerCase().includes(q),
                                    );
                                    if (filtered.length === 0) {
                                        return html`<div class="picker-empty">No matching commitments found.</div>`;
                                    }
                                    return filtered.map(t => {
                                        const pName = projects.find(p => p.id === t.projectId)?.name ?? null;
                                        return html`
                                            <div
                                                class="picker-item"
                                                @click=${() => {
                                                    dispatch(new events.taskLinked({goalId: goal.id, taskId: t.id}));
                                                    updateState({linkPickerOpen: false, linkSearchQuery: ''});
                                                }}
                                            >
                                                <span class="picker-item-title">${t.title}</span>
                                                <div class="picker-item-meta">
                                                    <span class=${'picker-badge kind-' + t.kind}>${t.kind}</span>
                                                    ${pName ? html`<span class="picker-badge">${pName}</span>` : html``}
                                                </div>
                                            </div>
                                        `;
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                  `
                : html``}

            <!-- Intelligence linked to this objective -->
            <div class="section-label" style="margin-bottom:0">INTELLIGENCE</div>
            <${IdeasViewElement.assign({
                ideas: inputs.ideas,
                goals: [],  // no nested goal picker when already inside a goal
                projects: inputs.projects,
                filterGoalId: goal.id,
                filterProjectId: goal.projectId,
            })} data-embedded=${''}
                ${listen(IdeasViewElement.events.makeCommitmentRequested, e =>
                    dispatch(new events.makeCommitmentRequested(e.detail)))}
                ${listen(IdeasViewElement.events.ideaUpdated, e =>
                    dispatch(new events.ideaUpdated(e.detail)))}
                ${listen(IdeasViewElement.events.ideaDeleted, e =>
                    dispatch(new events.ideaDeleted(e.detail)))}
                ${listen(IdeasViewElement.events.ideaEditRequested, e =>
                    dispatch(new events.ideaEditRequested(e.detail)))}
                ${listen(IdeasViewElement.events.promoteRequested, e =>
                    dispatch(new events.ideaPromoteRequested(e.detail)))}
            ></${IdeasViewElement}>

            <!-- Delete zone -->
            <div class="delete-zone">
                ${state.confirmingDelete
                    ? html`
                        <div class="confirm-delete">
                            <p>PERMANENTLY DELETE THIS OBJECTIVE?</p>
                            <div class="confirm-actions">
                                <button
                                    class="confirm-yes"
                                    @click=${() => dispatch(new events.goalDeleted(goal.id))}
                                >DELETE</button>
                                <button
                                    class="confirm-no"
                                    @click=${() => updateState({confirmingDelete: false})}
                                >CANCEL</button>
                            </div>
                        </div>
                      `
                    : html`
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            ${isActive
                                ? html`<button
                                        class="delete-btn"
                                        style="border-color:var(--color-text-faint);color:var(--color-text-muted);"
                                        @click=${() => setStatus('abandoned')}
                                    >ABANDON OBJECTIVE</button>`
                                : html``}
                            <button
                                class="delete-btn"
                                @click=${() => updateState({confirmingDelete: true})}
                            >DELETE OBJECTIVE</button>
                        </div>
                      `}
            </div>
        `;
    },
});
