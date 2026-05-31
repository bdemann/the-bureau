import { css, defineElement, html, listen } from "element-vir";
import type {
    AppState,
    AppView,
    ConsequenceTier,
    DialogueEntry,
    FormKind,
    Goal,
    Idea,
    Area,
    Task,
} from "../data/types.js";
import {
    generateId,
    getTodayString,
    isTaskOverdue,
    loadState,
    saveState,
    startOfDay,
} from "../data/storage.js";
import {
    advanceRecurrence,
    isMultiplePerPeriod,
    isRecurrenceEnded,
    rolloverIfNeeded,
} from "../data/recurrence.js";
import {
    countActiveTasks,
    missPenalty,
    skipPenalty,
    snoozePenalty,
    streakDepthMultiplier,
    taskScaleMultiplier,
    tierCompletionReward,
} from "../data/scoring.js";
import { isNextOccurrenceTomorrow } from "../data/urgency.js";
import {
    computeRemediationOnComplete,
    computeRemediationOnSkip,
    computeRemediationOnSnooze,
} from "../data/remediation.js";
import { getDialogueFor } from "../data/dialogues.js";
import { setActiveSkin } from "../skins/active-skin.js";
import { getSkinById, loadSkinId, saveSkinId } from "../skins/all-skins.js";
import { AddTaskDialogElement } from "./add-task-dialog.element.js";
import { BureauBottomNavElement } from "./bureau-bottom-nav.element.js";
import { BureauHeaderElement } from "./bureau-header.element.js";
import { CharacterDialogueElement } from "./character-dialogue.element.js";
import { DailyViewElement } from "./daily-view.element.js";
import { DashboardViewElement } from "./dashboard-view.element.js";
import { InsightsViewElement } from "./insights-view.element.js";
import { IdeasViewElement } from "./ideas-view.element.js";
import { GoalDetailElement } from "./goal-detail.element.js";
import { GoalsViewElement } from "./goals-view.element.js";
import { AreaDetailElement } from "./area-detail.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// BureauAppElement — Root element. Owns all state.
// All state changes flow through here. Children communicate via events up.
// Phase 2: top-level routing is Daily / Area.
// ─────────────────────────────────────────────────────────────────────────────

function bootstrap(): AppState {
    const loaded = loadState();

    // Roll any recurring tasks forward whose period elapsed while we were away.
    const today = new Date();
    const todayMidnight = startOfDay(today).getTime();

    // Compute N-scaling from the pre-rollover active task count so missed tasks
    // are penalised using the state they were missed in.
    const activeCount = countActiveTasks(loaded.tasks);
    const multiplier = taskScaleMultiplier(activeCount);
    let scoreAdjustment = 0;

    const tasks = loaded.tasks.map((t) => {
        const rolled = rolloverIfNeeded(t, today);

        // Recurring: period rolled over without completion — charge a miss penalty.
        if (rolled.totalMisses > t.totalMisses) {
            scoreAdjustment -=
                missPenalty(t.consequenceTier as ConsequenceTier) *
                (rolled.totalMisses - t.totalMisses) *
                multiplier;
        }

        // One-time hard-date tasks past their date can never be done — mark missed.
        if (
            !rolled.recurrence &&
            rolled.completedAt === null &&
            rolled.missedAt === null &&
            rolled.windowType === "hard" &&
            rolled.suggestedDate !== null &&
            rolled.suggestedDate < todayMidnight
        ) {
            scoreAdjustment -=
                missPenalty(t.consequenceTier as ConsequenceTier) * multiplier;
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
        const dayLine = getDialogueFor("day_start", false);
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

    const patriotScore = Math.max(0, loaded.patriotScore + scoreAdjustment);
    const next: AppState = {
        ...loaded,
        tasks,
        dialogueQueue,
        lastActiveDate,
        patriotScore,
    };
    saveState(next);
    return next;
}

export const BureauAppElement = defineElement()({
    tagName: "bureau-app",

    styles: css`
        :host {
            display: block;
            min-height: 100vh;
            background-color: var(--color-surface);
            background-image:
                radial-gradient(
                    ellipse at 0% 100%,
                    rgba(184, 134, 11, 0.03) 0%,
                    transparent 60%
                ),
                radial-gradient(
                    ellipse at 100% 0%,
                    rgba(var(--color-danger-rgb), 0.03) 0%,
                    transparent 60%
                );
        }

        .app-shell {
            max-width: 640px;
            margin: 0 auto;
            /* Leave room for the fixed bottom nav bar (64px) + safe area */
            padding-bottom: calc(
                64px + max(16px, env(safe-area-inset-bottom, 0px))
            );
        }

        .empty-msg {
            padding: 40px;
            text-align: center;
            font-family: var(--font-accent);
            color: var(--color-text-muted);
        }

        .undo-toast {
            position: fixed;
            bottom: calc(
                64px + max(16px, env(safe-area-inset-bottom, 0px)) + 8px
            );
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-primary);
            color: var(--color-surface);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            letter-spacing: 0.04em;
            z-index: 300;
            max-width: 90vw;
            animation: toast-in 0.2s ease-out;
            white-space: nowrap;
        }

        @keyframes toast-in {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        .undo-toast-label {
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }

        .undo-btn {
            background: none;
            border: 1px solid var(--color-surface);
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 0.8rem;
            letter-spacing: 0.15em;
            padding: 4px 10px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .undo-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    `,

    state: () => {
        const savedSkinId = loadSkinId();
        setActiveSkin(getSkinById(savedSkinId));
        return {
            app: bootstrap(),
            activeSkinId: savedSkinId,
            editingTask: null as Task | null,
            editingGoal: null as Goal | null,
            editingIdea: null as Idea | null,
            addingTask: false,
            newTaskAreaId: null as string | null,
            newTaskDefaultKind: "task" as FormKind,
            promotingIdea: null as Idea | null,
            spawningForGoalId: null as string | null,
            selectedGoalId: null as string | null,
            undoAction: null as {
                prevTask: Task;
                prevScore: number;
                label: string;
                expiresAt: number;
                timerId: ReturnType<typeof setTimeout>;
            } | null,
        };
    },

    render({ state, updateState }) {
        // `state.app` is a live reactive ref: updateState mutates it in place,
        // so reading state.app inside any handler always returns the latest
        // committed value. Don't snapshot it into a local — that would freeze
        // the value at render time and silently swallow updates between two
        // commits in the same handler.
        const {
            view,
            selectedAreaId,
            dialogueQueue,
            patriotScore,
            completionStreak,
        } = state.app;

        const currentDialogue = dialogueQueue.find((d) => !d.dismissed) ?? null;
        const selectedArea = selectedAreaId
            ? (state.app.areas.find((p) => p.id === selectedAreaId) ?? null)
            : null;

        const selectedGoal = state.selectedGoalId
            ? (state.app.goals.find((g) => g.id === state.selectedGoalId) ??
              null)
            : null;

        // ── State helpers ──────────────────────────────────────────────────────

        function commit(updates: Partial<AppState>): void {
            const next = { ...state.app, ...updates } as AppState;
            saveState(next);
            updateState({ app: next });
        }

        function pushDialogue(
            character: "director" | "agent",
            message: string,
        ): void {
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
            const clearedQueue = queue.map((d) =>
                d.dismissed ? d : { ...d, dismissed: true },
            );
            commit({ dialogueQueue: [entry, ...clearedQueue.slice(0, 9)] });
        }

        function triggerDialogue(
            trigger: Parameters<typeof getDialogueFor>[0],
            preferDirector = false,
        ): void {
            const line = getDialogueFor(trigger, preferDirector);
            pushDialogue(line.character, line.message);
        }

        // ── Undo helpers ───────────────────────────────────────────────────────

        const UNDO_TTL_MS = 3_000; // 3 seconds

        function offerUndo(
            prevTask: Task,
            prevScore: number,
            label: string,
        ): void {
            // Cancel any existing undo timer.
            if (state.undoAction) clearTimeout(state.undoAction.timerId);
            const timerId = setTimeout(
                () => updateState({ undoAction: null }),
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
            const { prevTask, prevScore } = state.undoAction;
            const tasks = state.app.tasks.map((t) =>
                t.id === prevTask.id ? prevTask : t,
            );
            commit({ tasks, patriotScore: prevScore });
            updateState({ undoAction: null });
        }

        // ── Event handlers ─────────────────────────────────────────────────────

        function onTaskCompleted(taskId: string): void {
            const target = state.app.tasks.find((t) => t.id === taskId);
            if (!target) return;

            const now = new Date();
            const tasks = state.app.tasks.map((t) => {
                if (t.id !== taskId) return t;

                const newTotalCompletions = t.totalCompletions + 1;
                const withCount = {
                    ...t,
                    totalCompletions: newTotalCompletions,
                };

                // Compute remediation state from the current skip/snooze streak.
                const remediation = computeRemediationOnComplete(
                    t.skipStreak,
                    t.snoozeCount,
                    t.remediationCount,
                );

                // If end condition is met, permanently retire the task.
                if (isRecurrenceEnded(withCount, now)) {
                    return {
                        ...withCount,
                        completedAt: now.getTime(),
                        recurrence: null,
                        snoozeCount: 0,
                        snoozedUntil: null,
                        skipStreak: 0,
                        remediationCount: 0,
                    };
                }

                // Multiple-per-period: bump count, reset snooze. The period
                // doesn't roll over on the Nth completion — that happens at
                // the next period boundary via rolloverIfNeeded() on startup.
                // The urgency engine treats count >= target as "complete for
                // this period," so the task hides correctly until rollover.
                if (isMultiplePerPeriod(t)) {
                    const isFullPeriodComplete =
                        t.completionsThisPeriod + 1 >=
                        t.recurrence!.frequencyPerPeriod;
                    const newStreak = isFullPeriodComplete
                        ? t.taskCompletionStreak + 1
                        : t.taskCompletionStreak;
                    return {
                        ...withCount,
                        completionsThisPeriod: t.completionsThisPeriod + 1,
                        snoozedUntil: null,
                        taskCompletionStreak: newStreak,
                        maxTaskCompletionStreak: Math.max(
                            t.maxTaskCompletionStreak,
                            newStreak,
                        ),
                        ...(isFullPeriodComplete
                            ? {
                                  skipStreak: remediation.skipStreak,
                                  snoozeCount: remediation.snoozeCount,
                                  remediationCount:
                                      remediation.remediationCount,
                              }
                            : {}),
                    };
                }

                // Standard recurring: advance to next period.
                if (t.recurrence) {
                    const newStreak = t.taskCompletionStreak + 1;
                    return {
                        ...advanceRecurrence(withCount, now),
                        taskCompletionStreak: newStreak,
                        maxTaskCompletionStreak: Math.max(
                            t.maxTaskCompletionStreak,
                            newStreak,
                        ),
                        skipStreak: remediation.skipStreak,
                        snoozeCount: remediation.snoozeCount,
                        remediationCount: remediation.remediationCount,
                    };
                }

                // One-time: mark complete.
                return {
                    ...withCount,
                    completedAt: now.getTime(),
                    snoozeCount: remediation.snoozeCount,
                    snoozedUntil: null,
                    skipStreak: remediation.skipStreak,
                    remediationCount: remediation.remediationCount,
                    taskCompletionStreak: t.taskCompletionStreak + 1,
                    maxTaskCompletionStreak: Math.max(
                        t.maxTaskCompletionStreak,
                        t.taskCompletionStreak + 1,
                    ),
                };
            });

            const tier = (target.consequenceTier ?? 3) as ConsequenceTier;
            const active = countActiveTasks(state.app.tasks);
            const reward =
                tierCompletionReward(tier) * taskScaleMultiplier(active);
            const prevScore = state.app.patriotScore;
            const newScore = Math.min(200, prevScore + reward);
            const newStreak = state.app.completionStreak + 1;

            commit({
                tasks,
                patriotScore: newScore,
                completionStreak: newStreak,
            });

            const preferDirector = Math.random() < 0.25;
            triggerDialogue("task_completed", preferDirector);

            if (newStreak > 0 && newStreak % 5 === 0) {
                setTimeout(() => triggerDialogue("streak"), 400);
            }
            if (newScore >= 150 && prevScore < 150) {
                setTimeout(() => triggerDialogue("score_high"), 800);
            }
        }

        function onTaskSnoozed(taskId: string): void {
            const task = state.app.tasks.find((t) => t.id === taskId);
            if (!task) return;

            // Daily routines cannot be snoozed.
            if (
                task.kind === "routine" &&
                (task.recurrence?.cadence === "daily" ||
                    task.recurrence?.cadence === "multiple_per_day")
            ) {
                return;
            }

            // Manually disabled snooze.
            if (task.disableSnooze) return;

            // Next occurrence is tomorrow — snooze would just bring it back on the
            // same committed day (e.g. Mon–Sat routine on any weekday).
            if (isNextOccurrenceTomorrow(task)) return;

            // Hard-date tasks: cannot snooze past the date.
            if (
                task.windowType === "hard" &&
                task.suggestedDate !== null &&
                task.suggestedDate <= Date.now()
            ) {
                return;
            }

            const snoozeRemediation = computeRemediationOnSnooze(
                task.snoozeCount,
                task.remediationCount,
            );
            const newSnoozeCount = snoozeRemediation.snoozeCount;
            let snoozedUntil = Date.now() + 24 * 60 * 60 * 1000;
            if (task.windowType === "hard" && task.suggestedDate !== null) {
                snoozedUntil = Math.min(snoozedUntil, task.suggestedDate);
            }

            const tier = task.consequenceTier as ConsequenceTier;
            const active = countActiveTasks(state.app.tasks);
            const rawPenalty = Math.min(
                snoozePenalty(tier) *
                    newSnoozeCount *
                    streakDepthMultiplier(newSnoozeCount),
                30,
            );
            // Floor at 1 so a snooze always produces a visible score change,
            // even when taskScaleMultiplier is tiny (many tasks).
            const penalty = Math.max(
                1,
                rawPenalty * taskScaleMultiplier(active),
            );
            const prevScore = state.app.patriotScore;
            const newScore = Math.max(0, prevScore - penalty);

            const tasks = state.app.tasks.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          snoozeCount: newSnoozeCount,
                          snoozedUntil,
                          totalSnoozes: t.totalSnoozes + 1,
                          remediationCount: snoozeRemediation.remediationCount,
                      }
                    : t,
            );
            commit({ tasks, patriotScore: newScore });
            offerUndo(task, prevScore, `Snoozed "${task.title}"`);

            // Tier-aware dialogue escalation: tier 1 escalates faster.
            const escalation = computeSnoozeDialogue(tier, newSnoozeCount);
            if (escalation) {
                triggerDialogue(escalation.trigger, escalation.preferDirector);
            }

            if (newScore < 40 && prevScore >= 40) {
                setTimeout(() => triggerDialogue("score_low", true), 600);
            }
        }

        function onTaskUnSnoozed(taskId: string): void {
            const tasks = state.app.tasks.map((t) =>
                t.id === taskId ? { ...t, snoozedUntil: null } : t,
            );
            commit({ tasks });
        }

        function onTaskProgressLogged(taskId: string): void {
            const target = state.app.tasks.find((t) => t.id === taskId);
            if (!target) return;
            const now = Date.now();
            const tasks = state.app.tasks.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          progressCount: t.progressCount + 1,
                          // Record when progress was logged so the urgency engine can
                          // hide the milestone for the rest of today (see step2Milestone).
                          lastProgressAt: now,
                          snoozedUntil: null,
                      }
                    : t,
            );
            const active = countActiveTasks(state.app.tasks);
            const reward =
                (tierCompletionReward(
                    target.consequenceTier as ConsequenceTier,
                ) *
                    taskScaleMultiplier(active)) /
                4;
            const newScore = Math.min(200, state.app.patriotScore + reward);
            commit({ tasks, patriotScore: newScore });
        }

        function onTaskSkipped(taskId: string): void {
            const target = state.app.tasks.find((t) => t.id === taskId);
            if (!target || !target.recurrence) return;

            const now = new Date();
            const tasks = state.app.tasks.map((t) => {
                if (t.id !== taskId || !t.recurrence) return t;
                const skipRemediation = computeRemediationOnSkip(
                    t.skipStreak,
                    t.remediationCount,
                );
                const advanced = advanceRecurrence(t, now);
                return {
                    ...advanced,
                    totalSkips: t.totalSkips + 1,
                    skipStreak: skipRemediation.skipStreak,
                    remediationCount: skipRemediation.remediationCount,
                    taskCompletionStreak: 0,
                };
            });

            const tier = target.consequenceTier as ConsequenceTier;
            const active = countActiveTasks(state.app.tasks);
            const newSkipStreak =
                tasks.find((t) => t.id === taskId)?.skipStreak ?? 1;
            // Floor at 1 so a skip always produces a visible score change,
            // even when taskScaleMultiplier is tiny (many tasks).
            const penalty = Math.max(
                1,
                skipPenalty(tier) *
                    streakDepthMultiplier(newSkipStreak) *
                    taskScaleMultiplier(active),
            );
            const prevScore = state.app.patriotScore;
            const newScore = Math.max(0, prevScore - penalty);

            commit({ tasks, patriotScore: newScore });
            offerUndo(target, prevScore, `Skipped "${target.title}"`);
            // Skip is intentionally silent — no character dialogue fires.
            // The skip-indicator badge on the card provides the feedback.

            if (newScore < 40 && prevScore >= 40) {
                setTimeout(() => triggerDialogue("score_low", true), 600);
            }
        }

        function onTaskAdded(task: Task): void {
            const ideas = state.promotingIdea
                ? state.app.ideas.filter(
                      (i) => i.id !== state.promotingIdea!.id,
                  )
                : state.app.ideas;
            commit({ tasks: [...state.app.tasks, task], ideas });
            updateState({
                addingTask: false,
                newTaskAreaId: null,
                promotingIdea: null,
                spawningForGoalId: null,
            });
            if (Math.random() < 0.6) {
                triggerDialogue("task_added", false);
            }
        }

        function onTaskGoalLinked({
            taskId,
            goalId,
        }: {
            taskId: string;
            goalId: string;
        }): void {
            onGoalTaskLinked({ goalId, taskId });
        }

        function onAreaAdded(area: Area): void {
            commit({ areas: [...state.app.areas, area] });
        }

        function onAreaDeleted(areaId: string): void {
            const areas = state.app.areas.filter((p) => p.id !== areaId);
            const tasks = state.app.tasks.filter((t) => t.areaId !== areaId);
            const goals = state.app.goals.filter((g) => g.areaId !== areaId);
            const ideas = state.app.ideas.filter((i) => i.areaId !== areaId);
            commit({
                areas,
                tasks,
                goals,
                ideas,
                view: "areas",
                selectedAreaId: null,
            });
        }

        function onAreaUpdated(area: Area): void {
            const areas = state.app.areas.map((p) =>
                p.id === area.id ? area : p,
            );
            commit({ areas });
        }

        function onTaskDeleted(taskId: string): void {
            const tasks = state.app.tasks.filter((t) => t.id !== taskId);
            commit({ tasks });
            updateState({ editingTask: null });
        }

        function onMissedTaskRevived(taskId: string): void {
            const todayMs = startOfDay(new Date()).getTime();
            const tasks = state.app.tasks.map((t) => {
                if (t.id !== taskId) return t;
                // Clear missed status; if suggestedDate is in the past, reset to
                // today so the task surfaces in the mandatory band immediately.
                const suggestedDate =
                    t.suggestedDate !== null && t.suggestedDate < todayMs
                        ? todayMs
                        : t.suggestedDate;
                return { ...t, missedAt: null, suggestedDate };
            });
            commit({ tasks });
        }

        function onAreaCreated(
            area: Area,
            routines: ReadonlyArray<Task>,
        ): void {
            commit({
                areas: [...state.app.areas, area],
                tasks: [...state.app.tasks, ...routines],
            });
            triggerDialogue("task_added", false);
        }

        function onTaskEditRequested(taskId: string): void {
            const task = state.app.tasks.find((t) => t.id === taskId) ?? null;
            updateState({ editingTask: task });
        }

        function onNewTaskRequested(
            areaId: string | null,
            kind: FormKind = "task",
        ): void {
            updateState({
                addingTask: true,
                newTaskAreaId: areaId,
                editingTask: null,
                newTaskDefaultKind: kind,
            });
        }

        function onGoalSubmitted(goal: Goal): void {
            commit({ goals: [...state.app.goals, goal] });
            updateState({ addingTask: false, newTaskAreaId: null });
        }

        function onIdeaSubmitted(idea: Idea): void {
            commit({ ideas: [...state.app.ideas, idea] });
            updateState({
                addingTask: false,
                newTaskAreaId: null,
                spawningForGoalId: null,
            });
        }

        function onAreasReordered(orderedIds: ReadonlyArray<string>): void {
            const orderedSet = new Set(orderedIds);
            const orderedAreas = orderedIds
                .map((id) => state.app.areas.find((p) => p.id === id))
                .filter((p): p is Area => p !== undefined);
            let idx = 0;
            const newAreas = state.app.areas.map((p) =>
                orderedSet.has(p.id) ? orderedAreas[idx++]! : p,
            );
            commit({ areas: newAreas });
        }

        function onIdeaUpdated(idea: Idea): void {
            commit({
                ideas: state.app.ideas.map((i) =>
                    i.id === idea.id ? idea : i,
                ),
            });
            updateState({ editingIdea: null });
        }

        function onIdeaDeleted(id: string): void {
            commit({ ideas: state.app.ideas.filter((i) => i.id !== id) });
            updateState({ editingIdea: null });
        }

        function onIdeaUnlinkFromGoal(ideaId: string): void {
            commit({
                ideas: state.app.ideas.map((i) =>
                    i.id === ideaId ? { ...i, goalId: null } : i,
                ),
            });
        }

        function onGoalUpdated(goal: Goal): void {
            commit({
                goals: state.app.goals.map((g) =>
                    g.id === goal.id ? goal : g,
                ),
            });
            updateState({ editingGoal: null });
        }

        function onGoalDeleted(id: string): void {
            commit({ goals: state.app.goals.filter((g) => g.id !== id) });
            updateState({ editingGoal: null });
        }

        function onGoalEditRequested(goal: Goal): void {
            updateState({
                editingGoal: goal,
                editingTask: null,
                addingTask: false,
                editingIdea: null,
            });
        }

        function onIdeaEditRequested(idea: Idea): void {
            updateState({
                editingIdea: idea,
                editingTask: null,
                addingTask: false,
                editingGoal: null,
            });
        }

        function onLinkedGoalChanged({
            taskId,
            oldGoalId,
            newGoalId,
        }: {
            taskId: string;
            oldGoalId: string | null;
            newGoalId: string | null;
        }): void {
            let goals = state.app.goals;
            if (oldGoalId) {
                goals = goals.map((g) =>
                    g.id === oldGoalId
                        ? {
                              ...g,
                              linkedTaskIds: g.linkedTaskIds.filter(
                                  (id) => id !== taskId,
                              ),
                          }
                        : g,
                );
            }
            if (newGoalId) {
                goals = goals.map((g) =>
                    g.id === newGoalId && !g.linkedTaskIds.includes(taskId)
                        ? { ...g, linkedTaskIds: [...g.linkedTaskIds, taskId] }
                        : g,
                );
            }
            commit({ goals });
        }

        function onUnlinkRequested({
            goalId,
            taskId,
        }: {
            goalId: string;
            taskId: string;
        }): void {
            commit({
                goals: state.app.goals.map((g) =>
                    g.id === goalId
                        ? {
                              ...g,
                              linkedTaskIds: g.linkedTaskIds.filter(
                                  (id) => id !== taskId,
                              ),
                          }
                        : g,
                ),
            });
        }

        function onGoalTaskLinked({
            goalId,
            taskId,
        }: {
            goalId: string;
            taskId: string;
        }): void {
            commit({
                goals: state.app.goals.map((g) =>
                    g.id === goalId
                        ? { ...g, linkedTaskIds: [...g.linkedTaskIds, taskId] }
                        : g,
                ),
            });
        }

        function onGoalDetailMakeCommitment(kind: FormKind): void {
            const goal =
                state.app.goals.find((g) => g.id === state.selectedGoalId) ??
                null;
            updateState({
                addingTask: true,
                newTaskAreaId: goal?.areaId ?? null,
                editingTask: null,
                newTaskDefaultKind: kind,
                spawningForGoalId: state.selectedGoalId,
            });
        }

        function onGoalSelected(goalId: string): void {
            updateState({ selectedGoalId: goalId });
        }

        function onPromoteRequested(idea: Idea): void {
            updateState({
                promotingIdea: idea,
                addingTask: true,
                newTaskAreaId: idea.areaId,
                editingTask: null,
                // Pre-fill the linked objective if the idea had one
                spawningForGoalId: idea.goalId ?? null,
            });
        }

        function onTasksReordered(orderedIds: ReadonlyArray<string>): void {
            const orderedSet = new Set(orderedIds);
            const orderedTasks = orderedIds
                .map((id) => state.app.tasks.find((t) => t.id === id))
                .filter((t): t is Task => t !== undefined);
            let idx = 0;
            const newTasks = state.app.tasks.map((t) =>
                orderedSet.has(t.id) ? orderedTasks[idx++]! : t,
            );
            commit({ tasks: newTasks });
        }

        function onTaskUpdated(task: Task): void {
            const tasks = state.app.tasks.map((t) =>
                t.id === task.id ? task : t,
            );
            commit({ tasks });
            updateState({ editingTask: null });
        }

        function onAreaSelected(areaId: string): void {
            const areaTasks = state.app.tasks.filter(
                (t) => t.areaId === areaId,
            );
            const overdue = areaTasks.filter((t) => isTaskOverdue(t));
            commit({ view: "area", selectedAreaId: areaId });
            if (overdue.length > 0) {
                const preferDirector = overdue.length >= 3;
                setTimeout(
                    () => triggerDialogue("task_overdue", preferDirector),
                    300,
                );
            }
        }

        function setView(next: AppView): void {
            commit({ view: next, selectedAreaId: null });
            // Clear any sub-detail state so the target view shows its top level.
            updateState({ selectedGoalId: null });
        }

        function onBack(): void {
            if (state.selectedGoalId !== null) {
                updateState({ selectedGoalId: null });
            } else {
                commit({ view: "areas", selectedAreaId: null });
            }
        }

        function onDismissDialogue(): void {
            const target = state.app.dialogueQueue.find((d) => !d.dismissed);
            if (!target) return;
            const dialogueQueue = state.app.dialogueQueue.map((d) =>
                d.id === target.id ? { ...d, dismissed: true } : d,
            );
            commit({ dialogueQueue });
        }

        // ── Render ─────────────────────────────────────────────────────────────

        return html`
            <div class="app-shell">
                <${BureauHeaderElement.assign({
                    patriotScore,
                    streak: completionStreak,
                    onBack:
                        view === "area" || state.selectedGoalId !== null
                            ? onBack
                            : null,
                    areaName: selectedGoal?.title ?? selectedArea?.name ?? null,
                    activeSkinId: state.activeSkinId,
                })}
                    ${listen(BureauHeaderElement.events.insightsRequested, () =>
                        setView("insights"),
                    )}
                    ${listen(
                        BureauHeaderElement.events.skinChangeRequested,
                        (e) => {
                            const newSkin = getSkinById(e.detail);
                            setActiveSkin(newSkin);
                            saveSkinId(e.detail);
                            // Clear any un-dismissed dialogues — their text was resolved
                            // against the old skin and would show the wrong vocabulary.
                            const clearedQueue = state.app.dialogueQueue.map(
                                (d) =>
                                    d.dismissed ? d : { ...d, dismissed: true },
                            );
                            commit({ dialogueQueue: clearedQueue });
                            updateState({ activeSkinId: e.detail });
                        },
                    )}
                ></${BureauHeaderElement}>

                ${
                    currentDialogue
                        ? html`
                        <${CharacterDialogueElement.assign({ dialogue: currentDialogue })}
                            ${listen(CharacterDialogueElement.events.dismissed, onDismissDialogue)}
                        ></${CharacterDialogueElement}>
                      `
                        : html``
                }

                ${
                    selectedGoal !== null
                        ? html`
                        <${GoalDetailElement.assign({
                            goal: selectedGoal,
                            tasks: state.app.tasks,
                            areas: state.app.areas,
                            ideas: state.app.ideas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                GoalDetailElement.events.goalUpdated,
                                (e) => onGoalUpdated(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.goalEditRequested,
                                (e) => onGoalEditRequested(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.goalDeleted,
                                (e) => {
                                    onGoalDeleted(e.detail);
                                    updateState({ selectedGoalId: null });
                                },
                            )}
                            ${listen(
                                GoalDetailElement.events.taskCompleted,
                                (e) => onTaskCompleted(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskSnoozed,
                                (e) => onTaskSnoozed(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskUnSnoozed,
                                (e) => onTaskUnSnoozed(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskSkipped,
                                (e) => onTaskSkipped(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskProgressLogged,
                                (e) => onTaskProgressLogged(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskEditRequested,
                                (e) => onTaskEditRequested(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events
                                    .makeCommitmentRequested,
                                (e) => onGoalDetailMakeCommitment(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.taskUnlinked,
                                (e) => onUnlinkRequested(e.detail),
                            )}
                            ${listen(GoalDetailElement.events.taskLinked, (e) =>
                                onGoalTaskLinked(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.ideaUpdated,
                                (e) => onIdeaUpdated(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.ideaDeleted,
                                (e) => onIdeaDeleted(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.ideaEditRequested,
                                (e) => onIdeaEditRequested(e.detail),
                            )}
                            ${listen(
                                GoalDetailElement.events.ideaPromoteRequested,
                                (e) => onPromoteRequested(e.detail),
                            )}
                        ></${GoalDetailElement}>
                      `
                        : view === "goals"
                          ? html`
                        <${GoalsViewElement.assign({
                            goals: state.app.goals,
                            tasks: state.app.tasks,
                            areas: state.app.areas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                GoalsViewElement.events.makeCommitmentRequested,
                                (e) => onNewTaskRequested(null, e.detail),
                            )}
                            ${listen(GoalsViewElement.events.goalUpdated, (e) =>
                                onGoalUpdated(e.detail),
                            )}
                            ${listen(
                                GoalsViewElement.events.goalSelected,
                                (e) => onGoalSelected(e.detail),
                            )}
                        ></${GoalsViewElement}>
                      `
                          : view === "ideas"
                            ? html`
                        <${IdeasViewElement.assign({
                            ideas: state.app.ideas,
                            goals: state.app.goals,
                            areas: state.app.areas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                IdeasViewElement.events.makeCommitmentRequested,
                                (e) => onNewTaskRequested(null, e.detail),
                            )}
                            ${listen(IdeasViewElement.events.ideaUpdated, (e) =>
                                onIdeaUpdated(e.detail),
                            )}
                            ${listen(IdeasViewElement.events.ideaDeleted, (e) =>
                                onIdeaDeleted(e.detail),
                            )}
                            ${listen(
                                IdeasViewElement.events.ideaEditRequested,
                                (e) => onIdeaEditRequested(e.detail),
                            )}
                            ${listen(
                                IdeasViewElement.events.promoteRequested,
                                (e) => onPromoteRequested(e.detail),
                            )}
                        ></${IdeasViewElement}>
                      `
                            : view === "insights"
                              ? html`
                        <${InsightsViewElement.assign({
                            tasks: state.app.tasks,
                            areas: state.app.areas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                InsightsViewElement.events.missedTaskDismissed,
                                (e) => onTaskDeleted(e.detail),
                            )}
                            ${listen(
                                InsightsViewElement.events.missedTaskRevived,
                                (e) => onMissedTaskRevived(e.detail),
                            )}
                        ></${InsightsViewElement}>
                      `
                              : view === "daily"
                                ? html`
                        <${DailyViewElement.assign({
                            tasks: state.app.tasks,
                            areas: state.app.areas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                DailyViewElement.events.taskCompleted,
                                (e) => onTaskCompleted(e.detail),
                            )}
                            ${listen(DailyViewElement.events.taskSnoozed, (e) =>
                                onTaskSnoozed(e.detail),
                            )}
                            ${listen(
                                DailyViewElement.events.taskUnSnoozed,
                                (e) => onTaskUnSnoozed(e.detail),
                            )}
                            ${listen(DailyViewElement.events.taskSkipped, (e) =>
                                onTaskSkipped(e.detail),
                            )}
                            ${listen(
                                DailyViewElement.events.taskProgressLogged,
                                (e) => onTaskProgressLogged(e.detail),
                            )}
                            ${listen(
                                DailyViewElement.events.taskEditRequested,
                                (e) => onTaskEditRequested(e.detail),
                            )}
                            ${listen(
                                DailyViewElement.events.newTaskRequested,
                                () => onNewTaskRequested(null),
                            )}
                            ${listen(
                                DailyViewElement.events.tasksReordered,
                                (e) => onTasksReordered(e.detail),
                            )}
                        ></${DailyViewElement}>
                      `
                                : view === "areas"
                                  ? html`
                        <${DashboardViewElement.assign({
                            areas: state.app.areas,
                            tasks: state.app.tasks,
                        })}
                            ${listen(
                                DashboardViewElement.events.areaSelected,
                                (e) => onAreaSelected(e.detail),
                            )}
                            ${listen(
                                DashboardViewElement.events.areaAdded,
                                (e) => onAreaAdded(e.detail),
                            )}
                            ${listen(
                                DashboardViewElement.events.areaCreated,
                                (e) =>
                                    onAreaCreated(
                                        e.detail.area,
                                        e.detail.routines,
                                    ),
                            )}
                            ${listen(
                                DashboardViewElement.events.areasReordered,
                                (e) => onAreasReordered(e.detail),
                            )}
                        ></${DashboardViewElement}>
                      `
                                  : selectedArea
                                    ? html`
                        <${AreaDetailElement.assign({
                            area: selectedArea,
                            tasks: state.app.tasks.filter(
                                (t) => t.areaId === selectedArea.id,
                            ),
                            goals: state.app.goals.filter(
                                (g) => g.areaId === selectedArea.id,
                            ),
                            ideas: state.app.ideas,
                            areas: state.app.areas,
                            activeSkinId: state.activeSkinId,
                        })}
                            ${listen(
                                AreaDetailElement.events.taskCompleted,
                                (e) => onTaskCompleted(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.taskSnoozed,
                                (e) => onTaskSnoozed(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.taskUnSnoozed,
                                (e) => onTaskUnSnoozed(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.taskSkipped,
                                (e) => onTaskSkipped(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.taskProgressLogged,
                                (e) => onTaskProgressLogged(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.newTaskRequested,
                                (e) => onNewTaskRequested(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.newCommitmentRequested,
                                (e) =>
                                    onNewTaskRequested(
                                        e.detail.areaId,
                                        e.detail.kind,
                                    ),
                            )}
                            ${listen(AreaDetailElement.events.back, onBack)}
                            ${listen(
                                AreaDetailElement.events.taskEditRequested,
                                (e) => onTaskEditRequested(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.areaDeleted,
                                (e) => onAreaDeleted(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.areaUpdated,
                                (e) => onAreaUpdated(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.tasksReordered,
                                (e) => onTasksReordered(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.goalUpdated,
                                (e) => onGoalUpdated(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.goalSelected,
                                (e) => onGoalSelected(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.ideaUpdated,
                                (e) => onIdeaUpdated(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.ideaDeleted,
                                (e) => onIdeaDeleted(e.detail),
                            )}
                            ${listen(
                                AreaDetailElement.events.ideaPromoteRequested,
                                (e) => onPromoteRequested(e.detail),
                            )}
                        ></${AreaDetailElement}>
                      `
                                    : html`
                                          <p class="empty-msg">
                                              Area not found. Return to
                                              dashboard.
                                          </p>
                                      `
                }
                <!-- Root-level dialog — handles creating and editing all commitment types -->
                <${AddTaskDialogElement.assign({
                    areaId:
                        state.editingTask?.areaId ??
                        state.editingGoal?.areaId ??
                        state.editingIdea?.areaId ??
                        state.newTaskAreaId,
                    open:
                        state.editingTask !== null ||
                        state.addingTask ||
                        state.editingGoal !== null ||
                        state.editingIdea !== null,
                    editTask: state.editingTask,
                    editGoal: state.editingGoal,
                    editIdea: state.editingIdea,
                    areas: state.app.areas,
                    goals: state.app.goals,
                    prefillTitle: state.promotingIdea?.title ?? null,
                    prefillDescription:
                        state.promotingIdea?.description ?? null,
                    defaultKind: state.newTaskDefaultKind,
                    defaultGoalId: state.spawningForGoalId,
                    activeSkinId: state.activeSkinId,
                })}
                    ${listen(AddTaskDialogElement.events.taskSubmitted, (e) =>
                        onTaskAdded(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.taskGoalLinked, (e) =>
                        onTaskGoalLinked(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.taskUpdated, (e) =>
                        onTaskUpdated(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.taskDeleted, (e) =>
                        onTaskDeleted(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.goalSubmitted, (e) =>
                        onGoalSubmitted(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.goalUpdated, (e) =>
                        onGoalUpdated(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.goalDeleted, (e) =>
                        onGoalDeleted(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.ideaSubmitted, (e) =>
                        onIdeaSubmitted(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.ideaUpdated, (e) =>
                        onIdeaUpdated(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.ideaDeleted, (e) =>
                        onIdeaDeleted(e.detail),
                    )}
                    ${listen(
                        AddTaskDialogElement.events.linkedGoalChanged,
                        (e) => onLinkedGoalChanged(e.detail),
                    )}
                    ${listen(AddTaskDialogElement.events.cancelled, () =>
                        updateState({
                            editingTask: null,
                            editingGoal: null,
                            editingIdea: null,
                            addingTask: false,
                            newTaskAreaId: null,
                            promotingIdea: null,
                            spawningForGoalId: null,
                        }),
                    )}
                ></${AddTaskDialogElement}>

                ${
                    state.undoAction
                        ? html`
                              <div class="undo-toast">
                                  <span class="undo-toast-label"
                                      >${state.undoAction.label}</span
                                  >
                                  <button class="undo-btn" @click=${onUndo}>
                                      UNDO
                                  </button>
                              </div>
                          `
                        : html``
                }
            </div>

            <!-- Fixed bottom navigation bar — primary view switching -->
            <${BureauBottomNavElement.assign({
                currentView: view,
                goalDetailActive: state.selectedGoalId !== null,
                activeSkinId: state.activeSkinId,
            })}
                ${listen(
                    BureauBottomNavElement.events.viewChangeRequested,
                    (e) => setView(e.detail),
                )}
            ></${BureauBottomNavElement}>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map (tier, snoozeCount) to the dialogue trigger to emit, if any. */
function computeSnoozeDialogue(
    tier: ConsequenceTier,
    snoozeCount: number,
): {
    trigger:
        | "task_snoozed_1"
        | "task_snoozed_2_3"
        | "task_snoozed_4_5"
        | "task_snoozed_6plus";
    preferDirector: boolean;
} | null {
    if (tier === 1) {
        if (snoozeCount >= 4)
            return { trigger: "task_snoozed_6plus", preferDirector: true };
        if (snoozeCount >= 2)
            return { trigger: "task_snoozed_4_5", preferDirector: false };
        if (snoozeCount >= 1)
            return { trigger: "task_snoozed_2_3", preferDirector: false };
    }
    if (tier === 2) {
        if (snoozeCount >= 6)
            return { trigger: "task_snoozed_6plus", preferDirector: true };
        if (snoozeCount >= 4)
            return { trigger: "task_snoozed_4_5", preferDirector: false };
        if (snoozeCount >= 2)
            return { trigger: "task_snoozed_2_3", preferDirector: false };
        if (snoozeCount >= 1)
            return { trigger: "task_snoozed_1", preferDirector: false };
    }
    if (tier === 3) {
        if (snoozeCount >= 8)
            return { trigger: "task_snoozed_6plus", preferDirector: true };
        if (snoozeCount >= 5)
            return { trigger: "task_snoozed_4_5", preferDirector: false };
        if (snoozeCount >= 3)
            return { trigger: "task_snoozed_2_3", preferDirector: false };
        if (snoozeCount >= 1)
            return { trigger: "task_snoozed_1", preferDirector: false };
    }
    if (tier === 4) {
        if (snoozeCount >= 10)
            return { trigger: "task_snoozed_2_3", preferDirector: false };
        if (snoozeCount >= 3)
            return { trigger: "task_snoozed_1", preferDirector: false };
    }
    return null;
}
