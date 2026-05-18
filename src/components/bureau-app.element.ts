import {css, defineElement, html, listen} from 'element-vir';
import type {AppState, AppView, ConsequenceTier, DialogueEntry, Goal, Idea, Project, Task} from '../data/types.js';
import {
    generateId,
    getTodayString,
    isTaskOverdue,
    loadState,
    saveState,
    startOfDay,
} from '../data/storage.js';
import {advanceRecurrence, isMultiplePerPeriod, isRecurrenceEnded, rolloverIfNeeded} from '../data/recurrence.js';
import {getDialogueFor} from '../data/dialogues.js';
import {AddTaskDialogElement} from './add-task-dialog.element.js';
import {BureauHeaderElement} from './bureau-header.element.js';
import {CharacterDialogueElement} from './character-dialogue.element.js';
import {DailyViewElement} from './daily-view.element.js';
import {DashboardViewElement} from './dashboard-view.element.js';
import {InsightsViewElement} from './insights-view.element.js';
import {IdeasViewElement} from './ideas-view.element.js';
import {GoalsViewElement} from './goals-view.element.js';
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
    const todayMidnight = startOfDay(today).getTime();
    const tasks = loaded.tasks.map(t => {
        const rolled = rolloverIfNeeded(t, today);
        // One-time hard-date tasks past their date can never be done — mark missed.
        if (!rolled.recurrence
            && rolled.completedAt === null
            && rolled.missedAt === null
            && rolled.windowType === 'hard'
            && rolled.suggestedDate !== null
            && rolled.suggestedDate < todayMidnight) {
            return {
                ...rolled,
                missedAt: rolled.suggestedDate,
                totalMisses: rolled.totalMisses + 1,
            };
        }
        return rolled;
    });

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

        .undo-toast {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1B2A4A;
            color: #F5EFE0;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.8rem;
            letter-spacing: 0.04em;
            z-index: 300;
            max-width: 90vw;
            animation: toast-in 0.2s ease-out;
            white-space: nowrap;
        }

        @keyframes toast-in {
            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .undo-toast-label {
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }

        .undo-btn {
            background: none;
            border: 1px solid #F5EFE0;
            color: #F5EFE0;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 4px 10px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .undo-btn:hover { background: rgba(255,255,255,0.1); }
    `,

    state: () => ({
        app: bootstrap(),
        editingTask: null as Task | null,
        addingTask: false,
        newTaskProjectId: null as string | null,
        promotingIdea: null as Idea | null,
        spawningForGoalId: null as string | null,
        undoAction: null as {
            prevTask: Task;
            prevScore: number;
            label: string;
            expiresAt: number;
            timerId: ReturnType<typeof setTimeout>;
        } | null,
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
            // A new memo replaces any existing visible one rather than stacking.
            const clearedQueue = queue.map(d => d.dismissed ? d : {...d, dismissed: true});
            commit({dialogueQueue: [entry, ...clearedQueue.slice(0, 9)]});
        }

        function triggerDialogue(
            trigger: Parameters<typeof getDialogueFor>[0],
            preferDirector = false,
        ): void {
            const line = getDialogueFor(trigger, preferDirector);
            pushDialogue(line.character, line.message);
        }

        // ── Undo helpers ───────────────────────────────────────────────────────

        const UNDO_TTL_MS = 30_000; // 30 seconds

        function offerUndo(prevTask: Task, prevScore: number, label: string): void {
            // Cancel any existing undo timer.
            if (state.undoAction) clearTimeout(state.undoAction.timerId);
            const timerId = setTimeout(
                () => updateState({undoAction: null}),
                UNDO_TTL_MS,
            );
            updateState({
                undoAction: {
                    prevTask,
                    prevScore,
                    label,
                    expiresAt: Date.now() + UNDO_TTL_MS,
                    timerId,
                },
            });
        }

        function onUndo(): void {
            if (!state.undoAction) return;
            clearTimeout(state.undoAction.timerId);
            const {prevTask, prevScore} = state.undoAction;
            const tasks = state.app.tasks.map(t =>
                t.id === prevTask.id ? prevTask : t,
            );
            commit({tasks, patriotScore: prevScore});
            updateState({undoAction: null});
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
                    const isFullPeriodComplete = t.completionsThisPeriod + 1 >= t.recurrence!.frequencyPerPeriod;
                    const newStreak = isFullPeriodComplete ? t.taskCompletionStreak + 1 : t.taskCompletionStreak;
                    return {
                        ...withCount,
                        completionsThisPeriod: t.completionsThisPeriod + 1,
                        snoozeCount: 0,
                        snoozedUntil: null,
                        taskCompletionStreak: newStreak,
                        maxTaskCompletionStreak: Math.max(t.maxTaskCompletionStreak, newStreak),
                        skipStreak: isFullPeriodComplete ? 0 : t.skipStreak,
                    };
                }

                // Standard recurring: advance to next period.
                if (t.recurrence) {
                    const newStreak = t.taskCompletionStreak + 1;
                    return {
                        ...advanceRecurrence(withCount, now),
                        taskCompletionStreak: newStreak,
                        maxTaskCompletionStreak: Math.max(t.maxTaskCompletionStreak, newStreak),
                        skipStreak: 0,
                    };
                }

                // One-time: mark complete.
                return {
                    ...withCount,
                    completedAt: now.getTime(),
                    snoozeCount: 0,
                    snoozedUntil: null,
                    taskCompletionStreak: t.taskCompletionStreak + 1,
                    maxTaskCompletionStreak: Math.max(t.maxTaskCompletionStreak, t.taskCompletionStreak + 1),
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

            // Daily routines cannot be snoozed.
            if (task.kind === 'routine'
                && (task.recurrence?.cadence === 'daily'
                    || task.recurrence?.cadence === 'multiple_per_day')) {
                return;
            }

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
                    ? {...t, snoozeCount: newSnoozeCount, snoozedUntil, totalSnoozes: t.totalSnoozes + 1}
                    : t,
            );
            commit({tasks, patriotScore: newScore});
            offerUndo(task, prevScore, `Snoozed "${task.title}"`);

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
            const target = state.app.tasks.find(t => t.id === taskId);
            if (!target || !target.recurrence) return;

            const now = new Date();
            const tasks = state.app.tasks.map(t => {
                if (t.id !== taskId || !t.recurrence) return t;
                const advanced = advanceRecurrence(t, now);
                return {
                    ...advanced,
                    totalSkips: t.totalSkips + 1,
                    skipStreak: t.skipStreak + 1,
                    taskCompletionStreak: 0,
                };
            });

            const tier = target.consequenceTier as ConsequenceTier;
            const penalty = skipPenalty(tier);
            const prevScore = state.app.patriotScore;
            const newScore = Math.max(0, prevScore - penalty);

            commit({tasks, patriotScore: newScore});
            offerUndo(target, prevScore, `Skipped "${target.title}"`);
            triggerDialogue('task_skipped', tier <= 2);

            if (newScore < 40 && prevScore >= 40) {
                setTimeout(() => triggerDialogue('score_low', true), 600);
            }
        }

        function onTaskAdded(task: Task): void {
            const ideas = state.promotingIdea
                ? state.app.ideas.filter(i => i.id !== state.promotingIdea!.id)
                : state.app.ideas;
            const goalIdToLink = state.spawningForGoalId ?? state.promotingIdea?.goalId ?? null;
            const goals = goalIdToLink
                ? state.app.goals.map(g =>
                    g.id === goalIdToLink
                        ? {...g, linkedTaskIds: [...g.linkedTaskIds, task.id]}
                        : g,
                  )
                : state.app.goals;
            commit({tasks: [...state.app.tasks, task], ideas, goals});
            updateState({addingTask: false, newTaskProjectId: null, promotingIdea: null, spawningForGoalId: null});
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
            const goals    = state.app.goals.filter(g => g.projectId !== projectId);
            const ideas    = state.app.ideas.filter(i => i.projectId !== projectId);
            commit({projects, tasks, goals, ideas, view: 'operations', selectedProjectId: null});
        }

        function onProjectUpdated(project: Project): void {
            const projects = state.app.projects.map(p => p.id === project.id ? project : p);
            commit({projects});
        }

        function onTaskDeleted(taskId: string): void {
            const tasks = state.app.tasks.filter(t => t.id !== taskId);
            commit({tasks});
            updateState({editingTask: null});
        }

        function onMissedTaskRevived(taskId: string): void {
            const todayMs = startOfDay(new Date()).getTime();
            const tasks = state.app.tasks.map(t => {
                if (t.id !== taskId) return t;
                // Clear missed status; if suggestedDate is in the past, reset to
                // today so the task surfaces in the mandatory band immediately.
                const suggestedDate = (t.suggestedDate !== null && t.suggestedDate < todayMs)
                    ? todayMs
                    : t.suggestedDate;
                return {...t, missedAt: null, suggestedDate};
            });
            commit({tasks});
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

        function onNewTaskRequested(projectId: string | null): void {
            updateState({addingTask: true, newTaskProjectId: projectId, editingTask: null});
        }

        function onProjectsReordered(orderedIds: ReadonlyArray<string>): void {
            const orderedSet = new Set(orderedIds);
            const orderedProjects = orderedIds
                .map(id => state.app.projects.find(p => p.id === id))
                .filter((p): p is Project => p !== undefined);
            let idx = 0;
            const newProjects = state.app.projects.map(p =>
                orderedSet.has(p.id) ? orderedProjects[idx++]! : p,
            );
            commit({projects: newProjects});
        }

        function onIdeaAdded(idea: Idea): void {
            commit({ideas: [...state.app.ideas, idea]});
        }

        function onIdeaUpdated(idea: Idea): void {
            commit({ideas: state.app.ideas.map(i => i.id === idea.id ? idea : i)});
        }

        function onIdeaDeleted(id: string): void {
            commit({ideas: state.app.ideas.filter(i => i.id !== id)});
        }

        function onIdeaUnlinkFromGoal(ideaId: string): void {
            commit({ideas: state.app.ideas.map(i => i.id === ideaId ? {...i, goalId: null} : i)});
        }

        function onGoalAdded(goal: Goal): void {
            commit({goals: [...state.app.goals, goal]});
        }

        function onGoalUpdated(goal: Goal): void {
            commit({goals: state.app.goals.map(g => g.id === goal.id ? goal : g)});
        }

        function onGoalDeleted(id: string): void {
            commit({goals: state.app.goals.filter(g => g.id !== id)});
        }

        function onUnlinkRequested({goalId, taskId}: {goalId: string; taskId: string}): void {
            commit({
                goals: state.app.goals.map(g =>
                    g.id === goalId
                        ? {...g, linkedTaskIds: g.linkedTaskIds.filter(id => id !== taskId)}
                        : g,
                ),
            });
        }

        function onSpawnRequested(goalId: string): void {
            const goal = state.app.goals.find(g => g.id === goalId);
            updateState({
                spawningForGoalId: goalId,
                addingTask: true,
                newTaskProjectId: goal?.projectId ?? null,
                editingTask: null,
            });
        }

        function onPromoteRequested(idea: Idea): void {
            updateState({
                promotingIdea: idea,
                addingTask: true,
                newTaskProjectId: idea.projectId,
                editingTask: null,
            });
        }

        function onTasksReordered(orderedIds: ReadonlyArray<string>): void {
            const orderedSet = new Set(orderedIds);
            const orderedTasks = orderedIds
                .map(id => state.app.tasks.find(t => t.id === id))
                .filter((t): t is Task => t !== undefined);
            let idx = 0;
            const newTasks = state.app.tasks.map(t =>
                orderedSet.has(t.id) ? orderedTasks[idx++]! : t,
            );
            commit({tasks: newTasks});
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
                    ${listen(BureauHeaderElement.events.insightsRequested,
                        () => setView('insights'))}
                    ${listen(BureauHeaderElement.events.ideasRequested,
                        () => setView('ideas'))}
                    ${listen(BureauHeaderElement.events.goalsRequested,
                        () => setView('goals'))}
                ></${BureauHeaderElement}>

                ${currentDialogue
                    ? html`
                        <${CharacterDialogueElement.assign({dialogue: currentDialogue})}
                            ${listen(CharacterDialogueElement.events.dismissed, onDismissDialogue)}
                        ></${CharacterDialogueElement}>
                      `
                    : html``}

                ${view === 'goals'
                    ? html`
                        <${GoalsViewElement.assign({
                            goals: state.app.goals,
                            tasks: state.app.tasks,
                            ideas: state.app.ideas,
                            projects: state.app.projects,
                        })}
                            ${listen(GoalsViewElement.events.goalAdded, e =>
                                onGoalAdded(e.detail))}
                            ${listen(GoalsViewElement.events.goalUpdated, e =>
                                onGoalUpdated(e.detail))}
                            ${listen(GoalsViewElement.events.goalDeleted, e =>
                                onGoalDeleted(e.detail))}
                            ${listen(GoalsViewElement.events.spawnRequested, e =>
                                onSpawnRequested(e.detail))}
                            ${listen(GoalsViewElement.events.unlinkRequested, e =>
                                onUnlinkRequested(e.detail))}
                            ${listen(GoalsViewElement.events.ideaUnlinkFromGoal, e =>
                                onIdeaUnlinkFromGoal(e.detail))}
                            ${listen(GoalsViewElement.events.promoteIdeaRequested, e =>
                                onPromoteRequested(e.detail))}
                        ></${GoalsViewElement}>
                      `
                    : view === 'ideas'
                    ? html`
                        <${IdeasViewElement.assign({
                            ideas: state.app.ideas,
                            goals: state.app.goals,
                            projects: state.app.projects,
                        })}
                            ${listen(IdeasViewElement.events.ideaAdded, e =>
                                onIdeaAdded(e.detail))}
                            ${listen(IdeasViewElement.events.ideaUpdated, e =>
                                onIdeaUpdated(e.detail))}
                            ${listen(IdeasViewElement.events.ideaDeleted, e =>
                                onIdeaDeleted(e.detail))}
                            ${listen(IdeasViewElement.events.promoteRequested, e =>
                                onPromoteRequested(e.detail))}
                        ></${IdeasViewElement}>
                      `
                    : view === 'insights'
                    ? html`
                        <${InsightsViewElement.assign({
                            tasks: state.app.tasks,
                            projects: state.app.projects,
                        })}
                            ${listen(InsightsViewElement.events.missedTaskDismissed, e =>
                                onTaskDeleted(e.detail))}
                            ${listen(InsightsViewElement.events.missedTaskRevived, e =>
                                onMissedTaskRevived(e.detail))}
                        ></${InsightsViewElement}>
                      `
                    : view === 'daily'
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
                            ${listen(DailyViewElement.events.newTaskRequested, () =>
                                onNewTaskRequested(null))}
                            ${listen(DailyViewElement.events.tasksReordered, e =>
                                onTasksReordered(e.detail))}
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
                            ${listen(DashboardViewElement.events.projectsReordered, e =>
                                onProjectsReordered(e.detail))}
                        ></${DashboardViewElement}>
                      `
                    : selectedProject
                    ? html`
                        <${ProjectDetailElement.assign({
                            project: selectedProject,
                            tasks: state.app.tasks.filter(
                                t => t.projectId === selectedProject.id,
                            ),
                            goals: state.app.goals.filter(
                                g => g.projectId === selectedProject.id,
                            ),
                            ideas: state.app.ideas,
                            projects: state.app.projects,
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
                            ${listen(ProjectDetailElement.events.newTaskRequested, e =>
                                onNewTaskRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.back, onBack)}
                            ${listen(ProjectDetailElement.events.taskEditRequested, e =>
                                onTaskEditRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.projectDeleted, e =>
                                onProjectDeleted(e.detail))}
                            ${listen(ProjectDetailElement.events.projectUpdated, e =>
                                onProjectUpdated(e.detail))}
                            ${listen(ProjectDetailElement.events.tasksReordered, e =>
                                onTasksReordered(e.detail))}
                            ${listen(ProjectDetailElement.events.goalAdded, e =>
                                onGoalAdded(e.detail))}
                            ${listen(ProjectDetailElement.events.goalUpdated, e =>
                                onGoalUpdated(e.detail))}
                            ${listen(ProjectDetailElement.events.goalDeleted, e =>
                                onGoalDeleted(e.detail))}
                            ${listen(ProjectDetailElement.events.goalSpawnRequested, e =>
                                onSpawnRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.goalUnlinkRequested, e =>
                                onUnlinkRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.ideaAdded, e =>
                                onIdeaAdded(e.detail))}
                            ${listen(ProjectDetailElement.events.ideaUpdated, e =>
                                onIdeaUpdated(e.detail))}
                            ${listen(ProjectDetailElement.events.ideaDeleted, e =>
                                onIdeaDeleted(e.detail))}
                            ${listen(ProjectDetailElement.events.ideaPromoteRequested, e =>
                                onPromoteRequested(e.detail))}
                            ${listen(ProjectDetailElement.events.ideaUnlinkFromGoal, e =>
                                onIdeaUnlinkFromGoal(e.detail))}
                        ></${ProjectDetailElement}>
                      `
                    : html`
                        <p class="empty-msg">
                            Operation not found. Return to dashboard.
                        </p>
                      `}
                <!-- Root-level dialog — handles both creating and editing tasks -->
                <${AddTaskDialogElement.assign({
                    projectId: state.editingTask?.projectId ?? state.newTaskProjectId,
                    open: state.editingTask !== null || state.addingTask,
                    editTask: state.editingTask,
                    projects: state.app.projects,
                    prefillTitle: state.promotingIdea?.title ?? null,
                    prefillDescription: state.promotingIdea?.description ?? null,
                })}
                    ${listen(AddTaskDialogElement.events.taskSubmitted, e =>
                        onTaskAdded(e.detail))}
                    ${listen(AddTaskDialogElement.events.taskUpdated, e =>
                        onTaskUpdated(e.detail))}
                    ${listen(AddTaskDialogElement.events.taskDeleted, e =>
                        onTaskDeleted(e.detail))}
                    ${listen(AddTaskDialogElement.events.cancelled, () =>
                        updateState({editingTask: null, addingTask: false, newTaskProjectId: null, promotingIdea: null, spawningForGoalId: null}))}
                ></${AddTaskDialogElement}>

                ${state.undoAction
                    ? html`
                        <div class="undo-toast">
                            <span class="undo-toast-label">${state.undoAction.label}</span>
                            <button class="undo-btn" @click=${onUndo}>UNDO</button>
                        </div>
                      `
                    : html``}
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

/** Score penalty for skipping a period entirely, scaled by tier. */
function skipPenalty(tier: ConsequenceTier): number {
    switch (tier) {
        case 1: return 12;
        case 2: return 7;
        case 3: return 4;
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
