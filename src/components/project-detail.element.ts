import {defineElement, defineElementEvent, css, html, assign, listen} from 'element-vir';
import type {Project, Task} from '../data/types.js';
import {isTaskVisible, isTaskOverdue} from '../data/storage.js';
import {TaskItemElement} from './task-item.element.js';
import {AddTaskDialogElement} from './add-task-dialog.element.js';

// ─────────────────────────────────────────────────────────────────────────────
// ProjectDetailElement
// Shows all tasks within a project, grouped: active → snoozed → completed.
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectDetailElement = defineElement<{
    project: Project;
    tasks: Task[];    // only this project's tasks
}>()({
    tagName: 'project-detail',

    events: {
        taskCompleted: defineElementEvent<string>(),
        taskSnoozed:   defineElementEvent<string>(),
        taskUnSnoozed: defineElementEvent<string>(),
        taskAdded:     defineElementEvent<Task>(),
        back:          defineElementEvent<void>(),
    },

    stateInitStatic: {
        addingTask: false,
        showCompleted: false,
    },

    styles: css`
        :host {
            display: block;
            padding: 0 12px;
        }

        .section-label {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: #6B6B6B;
            padding: 16px 2px 6px;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            margin-bottom: 2px;
        }

        .task-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6B6B6B;
            font-family: 'Special Elite', serif;
        }

        .empty-state p {
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 8px;
        }

        .empty-quote {
            font-size: 0.75rem;
            font-style: italic;
            opacity: 0.7;
        }

        .add-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin: 14px 0 0;
            padding: 12px;
            background: #1B2A4A;
            color: #F5EFE0;
            border: none;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s;
        }
        .add-btn:hover { background: #2A3F6F; }

        .toggle-completed {
            background: none;
            border: none;
            font-family: 'Courier Prime', monospace;
            font-size: 0.72rem;
            color: #6B6B6B;
            cursor: pointer;
            padding: 4px 2px;
            text-decoration: underline;
            text-underline-offset: 2px;
            display: block;
            margin-top: 4px;
        }

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
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.1rem;
            letter-spacing: 0.3em;
            color: rgba(46, 94, 46, 0.3);
            border: 3px solid rgba(46, 94, 46, 0.25);
            padding: 2px 12px;
            pointer-events: none;
            white-space: nowrap;
        }

        .snoozed-section {
            margin-top: 8px;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {project, tasks} = inputs;

        const activeTasks = tasks.filter(isTaskVisible).sort((a, b) => {
            // Sort: overdue first, then by priority weight, then by created date
            const priorityWeight = {critical: 4, high: 3, medium: 2, low: 1};
            const aOverdue = isTaskOverdue(a) ? 1000 : 0;
            const bOverdue = isTaskOverdue(b) ? 1000 : 0;
            const aWeight = aOverdue + (priorityWeight[a.priority] ?? 1);
            const bWeight = bOverdue + (priorityWeight[b.priority] ?? 1);
            return bWeight - aWeight;
        });

        const snoozedTasks = tasks.filter(
            t =>
                t.completedAt === null &&
                t.snoozedUntil !== null &&
                t.snoozedUntil > Date.now(),
        );

        const completedTasks = tasks
            .filter(t => t.completedAt !== null)
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

        return html`
            <!-- Active tasks section -->
            ${activeTasks.length === 0 && snoozedTasks.length === 0
                ? html`
                    <div class="empty-state">
                        <p>No active tasks in this operation.</p>
                        <p class="empty-quote">
                            "A cleared docket is not an idle one — it is a prepared one."<br />
                            — Agent C. Reyes
                        </p>
                    </div>
                  `
                : html``}

            ${activeTasks.length > 0
                ? html`
                    <div class="section-label">ACTIVE TASKS</div>
                    <div class="task-list">
                        ${activeTasks.map(
                            task => html`
                                <${TaskItemElement}
                                    ${assign(TaskItemElement, {task})}
                                    ${listen(TaskItemElement.events.completed, e =>
                                        dispatch(new events.taskCompleted(e.detail)))}
                                    ${listen(TaskItemElement.events.snoozed, e =>
                                        dispatch(new events.taskSnoozed(e.detail)))}
                                    ${listen(TaskItemElement.events.unSnoozed, e =>
                                        dispatch(new events.taskUnSnoozed(e.detail)))}
                                ></${TaskItemElement}>
                            `,
                        )}
                    </div>
                  `
                : html``}

            <!-- Snoozed tasks -->
            ${snoozedTasks.length > 0
                ? html`
                    <div class="snoozed-section">
                        <div class="section-label">SNOOZED (${snoozedTasks.length})</div>
                        <div class="task-list">
                            ${snoozedTasks.map(
                                task => html`
                                    <${TaskItemElement}
                                        ${assign(TaskItemElement, {task})}
                                        ${listen(TaskItemElement.events.completed, e =>
                                            dispatch(new events.taskCompleted(e.detail)))}
                                        ${listen(TaskItemElement.events.snoozed, e =>
                                            dispatch(new events.taskSnoozed(e.detail)))}
                                        ${listen(TaskItemElement.events.unSnoozed, e =>
                                            dispatch(new events.taskUnSnoozed(e.detail)))}
                                    ></${TaskItemElement}>
                                `,
                            )}
                        </div>
                    </div>
                  `
                : html``}

            <!-- Add task button -->
            <button
                class="add-btn"
                @click=${() => updateState({addingTask: true})}
            >
                + FILE NEW TASK
            </button>

            <!-- Completed tasks (collapsed by default) -->
            ${completedTasks.length > 0
                ? html`
                    <button
                        class="toggle-completed"
                        @click=${() => updateState({showCompleted: !state.showCompleted})}
                    >
                        ${state.showCompleted ? 'Hide' : 'Show'}
                        ${completedTasks.length} cleared task${completedTasks.length !== 1 ? 's' : ''}
                    </button>

                    ${state.showCompleted
                        ? html`
                            <div class="section-label">CLEARED</div>
                            <div class="task-list">
                                ${completedTasks.map(
                                    task => html`
                                        <div class="completed-task">
                                            <${TaskItemElement}
                                                ${assign(TaskItemElement, {task})}
                                                ${listen(TaskItemElement.events.completed, e =>
                                                    dispatch(new events.taskCompleted(e.detail)))}
                                                ${listen(TaskItemElement.events.snoozed, e =>
                                                    dispatch(new events.taskSnoozed(e.detail)))}
                                                ${listen(TaskItemElement.events.unSnoozed, e =>
                                                    dispatch(new events.taskUnSnoozed(e.detail)))}
                                            ></${TaskItemElement}>
                                        </div>
                                    `,
                                )}
                            </div>
                          `
                        : html``}
                  `
                : html``}

            <!-- Add task dialog -->
            <${AddTaskDialogElement}
                ${assign(AddTaskDialogElement, {
                    projectId: project.id,
                    open: state.addingTask,
                })}
                ${listen(AddTaskDialogElement.events.taskSubmitted, e => {
                    dispatch(new events.taskAdded(e.detail));
                    updateState({addingTask: false});
                })}
                ${listen(AddTaskDialogElement.events.cancelled, () =>
                    updateState({addingTask: false}))}
            ></${AddTaskDialogElement}>
        `;
    },
});
