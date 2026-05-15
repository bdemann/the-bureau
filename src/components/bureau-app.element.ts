import {css, defineElement, html, listen} from 'element-vir';
import type {AppState, AppView, ConsequenceTier, DialogueEntry, Project, Task} from '../data/types.js';
import {
    generateId,
    getTodayString,
    isTaskOverdue,
    loadState,
    saveState,
} from '../data/storage.js';
import {advanceRecurrence, isMultiplePerPeriod, isRecurrenceEnded, rolloverIfNeeded} from '../data/recurrence.js';
import {getDialogueFor} from '../data/dialogues.js';
import {AddTaskDialogElement} from './add-task-dialog.element.js';
import {BureauHeaderElement} from './bureau-header.element.js';
import {CharacterDialogueElement} from './character-dialogue.element.js';
import {DailyViewElement} from './daily-view.element.js';
import {DashboardViewElement} from './dashboard-view.element.js';
import {ProjectDetailElement} from './project-detail.element.js';

// ─────────────────────────────────────────────────────────────────────────────
// BureauAppElement — Root element. Owns all state.
// All state changes flow through here. Children communicate via events up.
// Phase 2: top-level routing is Daily / Operations / Project.
// ─────────────────────────────────────────────────────────────────────────────

function bootstrap(): AppState {
    const loaded = loadState();

    // Roll any recurring tasks forward whose period elapsed while we were away.
    const today = new Date();
    const tasks = loaded.tasks.map(t => rolloverIfNeeded(t, today));

    // Detect a new day → push the day-start dialogue.
    const todayStr = getTodayString();
    let dialogueQueue = loaded.dialogueQueue;
    let lastActiveDate = loaded.lastActiveDate;
    if (loaded.lastActiveDate !== todayStr) {
        const dayLine = getDialogueFor('day_start', false);
        const dayEntry: DialogueEntry = {
            id: generateId(),
            character: dayLine.character,
            message: dayLine.message,
            timestamp: Date.now(),
            dismissed: false,
        };
        dialogueQueue = [dayEntry, ...loaded.dialogueQueue.slice(0, 9)];
        lastActiveDate = todayStr;
    }

    const next: AppState = {...loaded, tasks, dialogueQueue, lastActiveDate};
    saveState(next);
    return next;
}

export const BureauAppElement = defineElement()({
    tagName: 'bureau-app',

    styles: css`
        :host {
            display: block;
            min-height: 100vh;
            background-color: #F5EFE0;
            background-image:
                radial-gradient(ellipse at 0% 100%, rgba(184,134,11,0.03) 0%, transparent 60%),
                radial-gradient(ellipse at 100% 0%, rgba(196,30,58,0.03) 0%, transparent 60%);
        }

        .app-shell {
            max-width: 640px;
            margin: 0 auto;
            padding-bottom: 60px;
        }

        .empty-msg {
            padding: 40px;
            text-align: center;
            font-family: 'Special Elite', serif;
            color: #6B6B6B;
        }
    `,

    state: () => ({
        app: bootstrap(),
        editingTask: null as Task | null,
    }),

    render({state, updateState}) {
        // `state.app` is a live reactive ref: updateState mutates it in place,
        // so reading state.app inside any handler always returns the latest
        // committed value. Don't snapshot it into a local — that would freeze
        // the value at render time and silently swallow updates between two
        // commits in the same handler.
        const {view, selectedProjectId, dialogueQueue, patriotScore, completionStreak} =
            state.app;

        const currentDialogue = dialogueQueue.find(d => !d.dismissed) ?? null;
        const selectedProject = selectedProjectId
            ? state.app.projects.find(p => p.id === selectedProjectId) ?? null
            : null;

        // ── State helpers ──────────────────────────────────────────────────────

        function commit(updates: Partial<AppState>): void {
            const next = {...state.app, ...updates} as AppState;
            saveState(next);
            updateState({app: next});
        }

        function pushDialogue(character: 'director' | 'agent', message: string): void {
            const queue = state.app.dialogueQueue;
            const last = queue[0];
            if (last && last.message === message) return;
            const entry: DialogueEntry = {
                id: generateId(),
                character,
                message,
                timestamp: Date.now(),
                dismissed: false,
            };
            commit({dialogueQueue: [entry, ...queue.slice(0, 9)]});
        }

        function triggerDialogue(
            trigger: Parameters<typeof getDialogueFor>[0],
            preferDirector = false,
        ): void {
            const line = getDialogueFor(trigger, preferDirector);
            pushDialogue(line.character, line.message);
        }

        // ── Event handlers ─────────────────────────────────────────────────────

        function onTaskCompleted(taskId: string): void {
            const target = state.app.tasks.find(t => t.id === taskId);
            if (!target) return;

            const now = new Date();
            const tasks = state.app.tasks.map(t => {
                if (t.id !== taskId) return t;

                const newTotalCompletions = t.totalCompletions + 1;
                const withCount = {...t, totalCompletions: newTotalCompletions};

                // If end condition is met, permanently retire the task.
                if (isRecurrenceEnded(withCount, now)) {
                    return {
                        ...withCount,
                        completedAt: now.getTime(),
                        recurrence: null,
                        snoozeCount: 0,
                        snoozedUntil: null,
                    };
                }

                // Multiple-per-period: bump count, reset snooze. The period
                // doesn't roll over on the Nth completion — that happens at
                // the next period boundary via rolloverIfNeeded() on startup.
                // The urgency engine treats count >= target as "complete for
                // this period," so the task hides correctly until rollover.
                if (isMultiplePerPeriod(t)) {
                    return {
                        ...withCount,
                        completionsThisPeriod: t.completionsThisPeriod + 1,
                        snoozeCount: 0,
                        snoozedUntil: null,
                    };
                }

                // Standard recurring: advance to next period.
                if (t.recurrence) {
                    return advanceRecurrence(withCount, now);
                }

                // One-time: mark complete.
                return {
                    ...withCount,
                    completedAt: now.getTime(),
                    snoozeCount: 0,
                    snoozedUntil: null,
                };
            });

            const tier = (target.consequenceTier ?? 3) as ConsequenceTier;
            const reward = tierCompletionReward(tier);
            const prevScore = state.app.patriotScore;
            const newScore = Math.min(200, prevScore + reward);
            const newStreak = state.app.completionStreak + 1;

            commit({tasks, patriotScore: newScore, completionStreak: newStreak});

            const preferDirector = Math.random() < 0.25;
            triggerDialogue('task_completed', preferDirector);

            if (newStreak > 0 && newStreak % 5 === 0) {
                setTimeout(() => triggerDialogue('streak'), 400);
            }
            if (newScore >= 150 && prevScore < 150) {
                setTimeout(() => triggerDialogue('score_high'), 800);
            }
        }

        function onTaskSnoozed(taskId: string): void {
            const task = state.app.tasks.find(t => t.id === taskId);
            if (!task) return;

            // Hard-date tasks: cannot snooze past the date.
            if (task.windowType === 'hard'
                && task.suggestedDate !== null
                && task.suggestedDate <= Date.now()) {
                return;
            }

            const newSnoozeCount = task.snoozeCount + 1;
            let snoozedUntil = Date.now() + 24 * 60 * 60 * 1000;
            if (task.windowType === 'hard' && task.suggestedDate !== null) {
                snoozedUntil = Math.min(snoozedUntil, task.suggestedDate);
            }

            const tier = task.consequenceTier as ConsequenceTier;
            const penalty = Math.min(snoozePenalty(tier) * newSnoozeCount, 30);
            const prevScore = state.app.patriotScore;
            const newScore = Math.max(0, prevScore - penalty);

            const tasks = state.app.tasks.map(t =>
                t.id === taskId
                    ? {...t, snoozeCount: newSnoozeCount, snoozedUntil}
                    : t,
            );
            commit({tasks, patriotScore: newScore});

            // Tier-aware dialogue escalation: tier 1 escalates faster.
            const escalation = computeSnoozeDialogue(tier, newSnoozeCount);
            if (escalation) {
                triggerDialogue(escalation.trigger, escalation.preferDirector);
            }

            if (newScore < 40 && prevScore >= 40) {
                setTimeout(() => triggerDialogue('score_low', true), 600);
            }
        }

        function onTaskUnSnoozed(taskId: string): void {
            const tasks = state.app.tasks.map(t =>
                t.id === taskId ? {...t, snoozedUntil: null} : t,
            );
            commit({tasks});
        }

        function onTaskProgressLogged(taskId: string): void {
            const target = state.app.tasks.find(t => t.id === taskId);
            if (!target) return;
            const tasks = state.app.tasks.map(t =>
                t.id === taskId
                    ? {...t, progressCount: t.progressCount + 1, snoozedUntil: null}
                    : t,
            );
            const reward = Math.max(1, Math.round(tierCompletionReward(target.consequenceTier as ConsequenceTier) / 4));
            const newScore = Math.min(200, state.app.patriotScore + reward);
            commit({tasks, patriotScore: newScore});
        }

        function onTaskSkipped(taskId: string): void {
            const now = new Date();
            const tasks = state.app.tasks.map(t => {
                if (t.id !== taskId || !t.recurrence) return t;
                return advanceRecurrence(t, now);
            });
            commit({tasks});
        }

        function onTaskAdded(task: Task): void {
            commit({tasks: [...state.app.tasks, task]});
            if (Math.random() < 0.6) {
                triggerDialogue('task_added', false);
            }
        }

        function onProjectAdded(project: Project): void {
            commit({projects: [...state.app.projects, project]});
        }

        function onProjectDeleted(projectId: string): void {
            const projects = state.app.projects.filter(p => p.id !== projectId);
            const tasks    = state.app.tasks.filter(t => t.projectId !== projectId);
            commit({projects, tasks, view: 'operations', selectedProjectId: null});
        }

        function onOperationCreated(project: Project, routines: ReadonlyArray<Task>): void {
            commit({
                projects: [...state.app.projects, project],
                tasks:    [...state.app.tasks, ...routines],
            });
            triggerDialogue('task_added', false);
        }

        function onTaskEditRequested(taskId: string): void {
            const task = state.app.tasks.find(t => t.id === taskId) ?? null;
            updateState({editingTask: task});
        }

        function onTaskUpdated(task: Task): void {
            const tasks = state.app.tasks.map(t => t.id === task.id ? task : t);
            commit({tasks});
            updateState({editingTask: null});
        }

        function onProjectSelected(projectId: string): void {
            const projectTasks = state.app.tasks.filter(t => t.projectId === projectId);
            const overdue = projectTasks.filter(t => isTaskOverdue(t));
            commit({view: 'project', selectedProjectId: projectId});
            if (overdue.length > 0) {
                const preferDirector = overdue.length >= 3;
                setTimeout(() => triggerDialogue('task_overdue', preferDirector), 300);
            }
        }

        function setView(next: AppView): void {
            commit({view: next, selectedProjectId: null});
        }

        function onBack(): void {
            commit({view: 'operations', selectedProjectId: null});
        }

        function onDismissDialogue(): void {
            const target = state.app.dialogueQueue.find(d => !d.dismissed);
            if (!target) return;
            const dialogueQueue = state.app.dialogueQueue.map(d =>
                d.id === target.id ? {...d, dismissed: true} : d,
            );
            commit({dialogueQueue});
        }

        // ── Render ─────────────────────────────────────────────────────────────

        return html`
            <div class="app-shell">
                <${BureauHeaderElement.assign({
                    patriotScore,
                    streak: completionStreak,
                    onBack: view === 'project' ? onBack : null,
                    projectName: selectedProject?.name ?? null,
                })}
                    ${listen(BureauHeaderElement.events.homeRequested,
                        () => setView('daily'))}
                    ${listen(BureauHeaderElement.events.operationsRequested,
                        () => setView('operations'))}
                ></${BureauHeaderElement}>

                ${currentDialogue
                    ? html`
                        <${CharacterDialogueElement.assign({dialogue: currentDialogue})}
                            ${listen(CharacterDialogueElement.events.dismissed, onDismissDialogue)}
                        ></${CharacterDialogueElement}>
                      `
                    : html``}

                ${view === 'daily'
                    ? html`
                        <${DailyViewElement.assign({
                            tasks: state.app.tasks,
                            projects: state.app.projects,
                        })}
                            ${listen(DailyViewElement.events.taskCompleted, e =>
                                onTaskCompleted(e.detail))}
                            ${listen(DailyViewElement.events.taskSnoozed, e =>
                                onTaskSnoozed(e.detail))}
                            ${listen(DailyViewElement.events.taskUnSnoozed, e =>
                                onTaskUnSnoozed(e.detail))}
                            ${listen(DailyViewElement.events.taskSkipped, e =>
                                onTaskSkipped(e.detail))}
                            ${listen(DailyViewElement.events.taskProgressLogged, e =>
                                onTaskProgressLogged(e.detail))}
                            ${listen(DailyViewElement.events.taskEditRequested, e =>
                                onTaskEditRequested(e.detail))}
                        ></${DailyViewElement}>
                      `
                    : view === 'operations'
                    ? html`
                        <${DashboardViewElement.assign({
                            projects: state.app.projects,
                            tasks: state.app.tasks,
                        })}
                            ${listen(DashboardViewElement.events.projectSelected, e =>
                                onProjectSelected(e.detail))}
                            ${listen(DashboardViewElement.events.projectAdded, e =>
                                onProjectAdded(e.detail))}
                            ${listen(DashboardViewElement.events.operationCreated, e =>
                                onOperationCreated(e.detail.project, e.detail.routines))}
                        ></${DashboardViewElement}>
                      `
                    : selectedProject
                    ? html`
                        <${ProjectDetailElement.assign({
                            project: selectedProject,
                            tasks: state.app.tasks.filter(
                                t => t.projectId === selectedProject.id,
                            ),
                        })}
                            ${listen(ProjectDetailElement.events.taskCompleted, e =>
                                onTaskCompleted(e.detail))}
                            ${listen(ProjectDetailElement.events.taskSnoozed, e =>
                                onTaskSnoozed(e.detail))}
                            ${listen(ProjectDetailElement.events.taskUnSnoozed, e =>
                                onTaskUnSnoozed(e.detail))}
                            ${listen(ProjectDetailElement.events.taskSkipped, e =>
                                onTaskSkipped(e.detail))}
                            ${listen(ProjectDetailElement.events.taskProgressLogged, e =>
                                onTaskProgressLogged(e.detail))}
                            ${listen(ProjectDetailElement.events.taskAdded, e =>
                                onTaskAdded(e.detail))}
                            ${listen(ProjectDetailElement.events.back, onBack)}
                            ${listen(ProjectDetailElement.events.taskEditRequested, e =>
                                onTaskEditRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.projectDeleted, e =>
                                onProjectDeleted(e.detail))}
                        ></${ProjectDetailElement}>
                      `
                    : html`
                        <p class="empty-msg">
                            Operation not found. Return to dashboard.
                        </p>
                      `}
                <!-- Root-level edit dialog — accessible from any view -->
                <${AddTaskDialogElement.assign({
                    projectId: state.editingTask?.projectId ?? '',
                    open: state.editingTask !== null,
                    editTask: state.editingTask,
                })}
                    ${listen(AddTaskDialogElement.events.taskUpdated, e =>
                        onTaskUpdated(e.detail))}
                    ${listen(AddTaskDialogElement.events.cancelled, () =>
                        updateState({editingTask: null}))}
                ></${AddTaskDialogElement}>
            </div>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Score reward for completing a task at a given consequence tier. */
function tierCompletionReward(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 25; // hard consequence — biggest payoff
        case 2: return 18;
        case 3: return 12;
        case 4: return 8;  // aspirational — modest reward, not nothing
    }
}

/** Score penalty per snooze, scaled by tier. */
function snoozePenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 8;
        case 2: return 5;
        case 3: return 3;
        case 4: return 1;
    }
}

/** Map (tier, snoozeCount) to the dialogue trigger to emit, if any. */
function computeSnoozeDialogue(
    tier: ConsequenceTier,
    snoozeCount: number,
): {trigger: 'task_snoozed_1' | 'task_snoozed_2_3' | 'task_snoozed_4_5' | 'task_snoozed_6plus';
   preferDirector: boolean} | null {
    if (tier === 1) {
        if (snoozeCount >= 4) return {trigger: 'task_snoozed_6plus', preferDirector: true};
        if (snoozeCount >= 2) return {trigger: 'task_snoozed_4_5', preferDirector: false};
        if (snoozeCount >= 1) return {trigger: 'task_snoozed_2_3', preferDirector: false};
    }
    if (tier === 2) {
        if (snoozeCount >= 6) return {trigger: 'task_snoozed_6plus', preferDirector: true};
        if (snoozeCount >= 4) return {trigger: 'task_snoozed_4_5', preferDirector: false};
        if (snoozeCount >= 2) return {trigger: 'task_snoozed_2_3', preferDirector: false};
        if (snoozeCount >= 1) return {trigger: 'task_snoozed_1', preferDirector: false};
    }
    if (tier === 3) {
        if (snoozeCount >= 8) return {trigger: 'task_snoozed_6plus', preferDirector: true};
        if (snoozeCount >= 5) return {trigger: 'task_snoozed_4_5', preferDirector: false};
        if (snoozeCount >= 3) return {trigger: 'task_snoozed_2_3', preferDirector: false};
        if (snoozeCount >= 1) return {trigger: 'task_snoozed_1', preferDirector: false};
    }
    if (tier === 4) {
        if (snoozeCount >= 10) return {trigger: 'task_snoozed_2_3', preferDirector: false};
        if (snoozeCount >= 3)  return {trigger: 'task_snoozed_1', preferDirector: false};
    }
    return null;
}
