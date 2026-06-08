import { css, defineElement, defineElementEvent, html } from "element-vir";
import {createFullDateInUserTimezone, formatPresets, toLocaleString} from 'date-vir';
import type { FormKind, Goal, GoalStatus, Area, Task } from "../data/types.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// GoalsViewElement
// Strategic Objectives list. Each card is clickable to open goal-detail.
// Status toggles (achieve/abandon/reactivate) are available directly on cards.
// All editing, task management, and linking happens in goal-detail.
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(ms: number): string {
    return toLocaleString(createFullDateInUserTimezone(ms), formatPresets.DateMed);
}

function sortByTargetDate(goals: Goal[]): Goal[] {
    return goals.sort((a, b) => {
        if (a.targetDate !== null && b.targetDate !== null)
            return a.targetDate - b.targetDate;
        if (a.targetDate !== null) return -1;
        if (b.targetDate !== null) return 1;
        return b.createdAt - a.createdAt;
    });
}

export const GoalsViewElement = defineElement<{
    goals: ReadonlyArray<Goal>;
    tasks: ReadonlyArray<Task>;
    areas: ReadonlyArray<Area>;
    /** When set, only show goals for this area and hide the area selector. */
    filterAreaId?: string | null;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "goals-view",

    events: {
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        goalUpdated: defineElementEvent<Goal>(),
        goalSelected: defineElementEvent<string>(), // goal id → open detail
        goalsReordered: defineElementEvent<ReadonlyArray<string>>(),
    },

    state: () => ({
        draggedId: null as string | null,
        dragOverId: null as string | null,
    }),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

        :host([data-embedded]) {
            padding: 0 0 24px;
        }

        .page-title {
            font-family: var(--font-display);
            font-size: 1.4rem;
            letter-spacing: 0.25em;
            color: var(--color-primary);
            margin-bottom: 4px;
        }

        .page-subtitle {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            margin-bottom: 24px;
        }

        .section-header {
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.2em;
            color: var(--color-text-muted);
            border-bottom: 1px solid var(--color-border-subtle);
            padding-bottom: 4px;
            margin-bottom: 10px;
            margin-top: 24px;
        }

        .file-btn {
            width: 100%;
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.15em;
            padding: 10px;
            background: transparent;
            border: 1.5px dashed var(--color-border-strong);
            color: var(--color-text-muted);
            cursor: pointer;
            margin-bottom: 20px;
            text-align: center;
        }
        .file-btn:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }

        .empty {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text-muted);
            text-align: center;
            padding: 24px 0;
        }

        /* ── Goal card ── */
        .goal-card {
            background: var(--color-card);
            border: 1px solid var(--color-border-subtle);
            border-left: 4px solid var(--color-primary);
            padding: 12px 14px;
            margin-bottom: 10px;
            cursor: pointer;
            transition:
                box-shadow 0.15s,
                transform 0.1s;
            position: relative;
        }

        .goal-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        .goal-card.achieved {
            border-left-color: var(--color-success);
            opacity: 0.85;
        }
        .goal-card.abandoned {
            border-left-color: var(--color-text-faint);
            opacity: 0.7;
        }

        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }

        .goal-title {
            font-family: var(--font-accent);
            font-size: 1rem;
            color: var(--color-primary);
            line-height: 1.3;
            flex: 1;
        }

        .card-arrow {
            font-family: var(--font-mono);
            font-size: 1rem;
            color: rgba(var(--color-primary-rgb), 0.35);
            flex-shrink: 0;
            margin-top: 2px;
        }

        .goal-desc {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: #555;
            margin-top: 4px;
            white-space: pre-wrap;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .goal-meta {
            font-family: var(--font-mono);
            font-size: 0.63rem;
            letter-spacing: 0.06em;
            color: var(--color-text-muted);
            margin-top: 6px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .target-date {
            color: var(--color-warning);
        }
        .target-date.overdue {
            color: var(--color-danger);
        }

        .status-badge {
            font-family: var(--font-display);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
        }
        .status-badge.achieved {
            color: var(--color-success);
        }
        .status-badge.abandoned {
            color: var(--color-text-faint);
        }

        .area-badge {
            display: inline-block;
            font-family: var(--font-mono);
            font-size: 0.6rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 1px 5px;
            border: 1px solid var(--color-border);
            color: var(--color-text-muted);
        }

        .linked-section {
            margin-top: 8px;
        }

        .linked-label {
            font-family: var(--font-mono);
            font-size: 0.6rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 4px;
        }

        .linked-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .linked-chip {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            padding: 2px 7px;
            background: rgba(var(--color-primary-rgb), 0.07);
            border: 1px solid rgba(var(--color-primary-rgb), 0.15);
            color: var(--color-primary);
        }

        .linked-empty {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--color-text-faint);
            font-style: italic;
        }

        .goal-actions {
            display: flex;
            gap: 6px;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        .card-drag-wrapper {
            position: relative;
        }
        .card-drag-wrapper.is-dragging {
            opacity: 0.3;
        }
        .card-drag-wrapper.is-drag-over::before {
            content: "";
            display: block;
            height: 2px;
            background: var(--color-primary);
            margin-bottom: 4px;
        }
        .drop-zone-end {
            height: 18px;
        }
        .drop-zone-end.is-drag-over {
            border-top: 2px solid var(--color-primary);
        }

        .action-btn {
            font-family: var(--font-display);
            letter-spacing: 0.1em;
            font-size: 0.68rem;
            padding: 3px 9px;
            border: none;
            cursor: pointer;
        }

        .action-achieve {
            background: var(--color-success);
            color: #fff;
        }
        .action-achieve:hover {
            background: var(--color-success-dark);
        }
        .action-abandon {
            background: transparent;
            border: 1px solid var(--color-text-faint);
            color: var(--color-text-muted);
        }
        .action-abandon:hover {
            background: var(--color-surface-tint);
        }
        .action-reactivate {
            background: transparent;
            border: 1px solid var(--color-primary);
            color: var(--color-primary);
        }
        .action-reactivate:hover {
            background: rgba(var(--color-primary-rgb), 0.05);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();
        const { goals, tasks, areas } = inputs;
        const filterAreaId = inputs.filterAreaId ?? null;
        const isFiltered = filterAreaId !== null;
        const now = Date.now();

        const visibleGoals = isFiltered
            ? goals.filter((g) => g.areaId === filterAreaId)
            : [...goals];

        function taskTitle(id: string): string {
            return (
                tasks.find((t) => t.id === id)?.title ?? "(deleted commitment)"
            );
        }

        function areaName(id: string | null): string | null {
            if (!id) return null;
            return areas.find((p) => p.id === id)?.name ?? null;
        }

        function setStatus(goal: Goal, status: GoalStatus, e: Event): void {
            e.stopPropagation();
            dispatch(new events.goalUpdated({ ...goal, status }));
        }

        const active = sortByTargetDate(
            visibleGoals.filter((g) => g.status === "active"),
        );
        const achieved = sortByTargetDate(
            visibleGoals.filter((g) => g.status === "achieved"),
        );
        const abandoned = sortByTargetDate(
            visibleGoals.filter((g) => g.status === "abandoned"),
        );

        function renderGoalCard(goal: Goal) {
            const isActive = goal.status === "active";
            const dateOverdue =
                goal.targetDate !== null && goal.targetDate < now && isActive;
            const opName = !isFiltered ? areaName(goal.areaId) : null;

            return html`
                <div
                    class=${"goal-card " + goal.status}
                    @click=${() => dispatch(new events.goalSelected(goal.id))}
                >
                    <div class="card-top">
                        <div class="goal-title">${goal.title}</div>
                        <span class="card-arrow">→</span>
                    </div>

                    ${goal.description
                        ? html`<div class="goal-desc">${goal.description}</div>`
                        : html``}

                    <div class="goal-meta">
                        ${goal.targetDate
                            ? html`<span
                                  class=${"target-date" +
                                  (dateOverdue ? " overdue" : "")}
                              >
                                  ⊙ Target:
                                  ${fmtDate(goal.targetDate)}${dateOverdue
                                      ? " · OVERDUE"
                                      : ""}
                              </span>`
                            : html``}
                        ${!isActive
                            ? html`<span class=${"status-badge " + goal.status}>
                                  ${goal.status === "achieved"
                                      ? "✓ Achieved"
                                      : "✕ Abandoned"}
                              </span>`
                            : html``}
                        ${opName
                            ? html`<span class="area-badge">⊙ ${opName}</span>`
                            : html``}
                    </div>

                    ${(() => {
                            const linked = tasks.filter(t => t.goalId === goal.id);
                            return html`
                    <div class="linked-section">
                        <div class="linked-label">Linked Commitments</div>
                        ${linked.length > 0
                            ? html`
                                  <div class="linked-chips">
                                      ${linked.map(
                                          (t) => html`
                                              <span class="linked-chip">${t.title}</span>
                                          `,
                                      )}
                                  </div>
                              `
                            : html`<div class="linked-empty">
                                  No commitments linked yet.
                              </div>`}
                    </div>`;
                        })()}

                    <div class="goal-actions">
                        ${isActive
                            ? html`
                                  <button
                                      class="action-btn action-achieve"
                                      @click=${(e: Event) =>
                                          setStatus(goal, "achieved", e)}
                                  >
                                      MARK ACHIEVED
                                  </button>
                                  <button
                                      class="action-btn action-abandon"
                                      @click=${(e: Event) =>
                                          setStatus(goal, "abandoned", e)}
                                  >
                                      ABANDON
                                  </button>
                              `
                            : html`
                                  <button
                                      class="action-btn action-reactivate"
                                      @click=${(e: Event) =>
                                          setStatus(goal, "active", e)}
                                  >
                                      REACTIVATE
                                  </button>
                              `}
                    </div>
                </div>
            `;
        }

        function renderDraggableGoal(goal: Goal, group: ReadonlyArray<Goal>) {
            return html`
                <div
                    class="card-drag-wrapper ${state.draggedId === goal.id ? "is-dragging" : ""} ${state.dragOverId === goal.id ? "is-drag-over" : ""}"
                    draggable="true"
                    @dragstart=${(e: DragEvent) => {
                        e.dataTransfer?.setData("text/plain", goal.id);
                        updateState({ draggedId: goal.id });
                    }}
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        if (state.draggedId && state.draggedId !== goal.id)
                            updateState({ dragOverId: goal.id });
                    }}
                    @dragleave=${() => {
                        if (state.dragOverId === goal.id) updateState({ dragOverId: null });
                    }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer?.getData("text/plain") ?? state.draggedId;
                        if (fromId && fromId !== goal.id) {
                            dispatch(new events.goalsReordered(
                                reorderBefore(visibleGoals, fromId, goal.id).map((g) => g.id),
                            ));
                        }
                        updateState({ draggedId: null, dragOverId: null });
                    }}
                    @dragend=${() => updateState({ draggedId: null, dragOverId: null })}
                >
                    ${renderGoalCard(goal)}
                </div>
            `;
        }

        function renderSection(sectionGoals: ReadonlyArray<Goal>) {
            return html`
                ${sectionGoals.map((g) => renderDraggableGoal(g, sectionGoals))}
                <div
                    class="drop-zone-end ${state.dragOverId === "__end_" + sectionGoals[0]?.id ? "is-drag-over" : ""}"
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        if (state.draggedId) updateState({ dragOverId: "__end_" + sectionGoals[0]?.id });
                    }}
                    @dragleave=${() => { if (state.dragOverId?.startsWith("__end_")) updateState({ dragOverId: null }); }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer?.getData("text/plain") ?? state.draggedId;
                        if (fromId) {
                            dispatch(new events.goalsReordered(
                                moveToEnd(visibleGoals, fromId).map((g) => g.id),
                            ));
                        }
                        updateState({ draggedId: null, dragOverId: null });
                    }}
                ></div>
            `;
        }

        return html`
            ${!isFiltered
                ? html`
                      <div class="page-title">${skin.pages.goalsTitle}</div>
                      <div class="page-subtitle">
                          ${skin.pages.goalsSubtitle}
                      </div>
                  `
                : html``}

            <button
                class="file-btn"
                @click=${() =>
                    dispatch(new events.makeCommitmentRequested("goal"))}
            >
                + MAKE GOAL
            </button>

            ${active.length > 0
                ? html`
                      <div class="section-header">
                          ACTIVE (${active.length})
                      </div>
                      ${renderSection(active)}
                  `
                : visibleGoals.length === 0
                  ? html`<div class="empty">
                        No objectives on file. Make one above to begin.
                    </div>`
                  : html``}
            ${achieved.length > 0
                ? html`
                      <div class="section-header">
                          ACHIEVED (${achieved.length})
                      </div>
                      ${renderSection(achieved)}
                  `
                : html``}
            ${abandoned.length > 0
                ? html`
                      <div class="section-header">
                          ABANDONED (${abandoned.length})
                      </div>
                      ${renderSection(abandoned)}
                  `
                : html``}
        `;
    },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function reorderBefore<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
    toId: string,
): T[] {
    const item = list.find((x) => x.id === fromId);
    if (!item) return [...list];
    const rest = list.filter((x) => x.id !== fromId);
    const idx = rest.findIndex((x) => x.id === toId);
    if (idx === -1) return [...list];
    rest.splice(idx, 0, item);
    return rest;
}

function moveToEnd<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
): T[] {
    const item = list.find((x) => x.id === fromId);
    if (!item) return [...list];
    return [...list.filter((x) => x.id !== fromId), item];
}
