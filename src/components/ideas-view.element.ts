import { css, defineElement, defineElementEvent, html } from "element-vir";
import type { FormKind, Goal, Idea, Area } from "../data/types.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// IdeasViewElement
// Field Intelligence: capture raw ideas, optionally link to an area and
// a goal within that area, promote to a directive when ready.
//
// When filterAreaId is set only that area's ideas are shown and the
// area selector is hidden (used from area-detail). The goal selector
// always shows goals for the currently selected area.
// ─────────────────────────────────────────────────────────────────────────────

export const IdeasViewElement = defineElement<{
    ideas: ReadonlyArray<Idea>;
    areas: ReadonlyArray<Area>;
    goals: ReadonlyArray<Goal>;
    /** When set, only show ideas for this area and hide the area selector. */
    filterAreaId?: string | null;
    /** When set, only show ideas for this goal and lock the goal selector to it. */
    filterGoalId?: string | null;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "ideas-view",

    events: {
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        ideaUpdated: defineElementEvent<Idea>(),
        ideaDeleted: defineElementEvent<string>(),
        ideaEditRequested: defineElementEvent<Idea>(),
        promoteRequested: defineElementEvent<Idea>(),
        ideasReordered: defineElementEvent<ReadonlyArray<string>>(),
    },

    state: () => ({
        confirmDeleteId: null as string | null,
        draggedId: null as string | null,
        dragOverId: null as string | null,
    }),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

        :host([data-embedded]) {
            padding: 4px 0 0;
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

        .btn {
            font-family: var(--font-display);
            letter-spacing: 0.12em;
            font-size: 0.85rem;
            padding: 7px 16px;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: var(--color-primary);
            color: var(--color-surface);
        }
        .btn-primary:hover {
            background: var(--color-primary-hover);
        }
        .btn-ghost {
            background: transparent;
            border: 1px solid var(--color-border);
            color: var(--color-primary);
        }
        .btn-ghost:hover {
            background: var(--color-surface-tint);
        }
        .btn-danger {
            background: var(--color-danger);
            color: var(--color-surface);
        }
        .btn-danger:hover {
            background: var(--color-danger-dark);
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
            padding: 32px 0;
        }

        .idea-card {
            background: var(--color-card);
            border: 1px solid var(--color-border-subtle);
            border-left: 3px solid var(--color-warning);
            padding: 12px 14px;
            margin-bottom: 12px;
            cursor: pointer;
            transition:
                box-shadow 0.15s,
                transform 0.1s;
        }

        .idea-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }

        .idea-title {
            font-family: var(--font-display);
            font-size: 1rem;
            letter-spacing: 0.1em;
            color: var(--color-primary);
        }

        .idea-desc {
            font-family: var(--font-mono);
            font-size: 0.78rem;
            color: #444;
            margin-top: 4px;
            white-space: pre-wrap;
        }

        .idea-meta {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 6px;
        }

        .meta-badge {
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 2px 6px;
            border: 1px solid var(--color-border);
            color: var(--color-text-muted);
        }

        .meta-badge.goal {
            border-color: var(--color-primary) 33;
            color: var(--color-primary);
        }

        .idea-actions {
            display: flex;
            gap: 6px;
            margin-top: 10px;
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

        .action-promote {
            background: var(--color-primary);
            color: var(--color-surface);
        }
        .action-promote:hover {
            background: var(--color-primary-hover);
        }
        .action-edit {
            background: transparent;
            border: 1px solid var(--color-border);
            color: var(--color-primary);
        }
        .action-edit:hover {
            background: var(--color-surface-tint);
        }
        .action-delete {
            background: transparent;
            border: 1px solid var(--color-danger);
            color: var(--color-danger);
        }
        .action-delete:hover {
            background: rgba(var(--color-danger-rgb), 0.08);
        }

        .confirm-delete {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--color-danger);
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
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
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();
        const { ideas, areas, goals } = inputs;
        const filterAreaId = inputs.filterAreaId ?? null;
        const filterGoalId = inputs.filterGoalId ?? null;
        const isFiltered = filterAreaId !== null;
        const isGoalFiltered = filterGoalId !== null;

        const visibleIdeas = isGoalFiltered
            ? ideas.filter((i) => i.goalId === filterGoalId)
            : isFiltered
              ? ideas.filter((i) => i.areaId === filterAreaId)
              : [...ideas];

        const sortedIdeas = visibleIdeas.sort(
            (a, b) => b.createdAt - a.createdAt,
        );

        function areaName(id: string | null): string | null {
            if (!id) return null;
            return areas.find((p) => p.id === id)?.name ?? null;
        }

        function goalName(id: string | null): string | null {
            if (!id) return null;
            return goals.find((g) => g.id === id)?.title ?? null;
        }

        return html`
            ${!isFiltered
                ? html`
                      <div class="page-title">${skin.pages.ideasTitle}</div>
                      <div class="page-subtitle">
                          ${skin.pages.ideasSubtitle}
                      </div>
                  `
                : html``}

            <button
                class="file-btn"
                @click=${() =>
                    dispatch(new events.makeCommitmentRequested("idea"))}
            >
                + MAKE IDEA
            </button>

            ${sortedIdeas.length === 0
                ? html`<div class="empty">${skin.pages.ideasEmpty}</div>`
                : html``}
            ${sortedIdeas.map((idea) => {
                const confirmingDelete = state.confirmDeleteId === idea.id;
                const opName = !isFiltered ? areaName(idea.areaId) : null;
                const gName = goalName(idea.goalId);

                return html`
                    <div
                        class="card-drag-wrapper ${state.draggedId === idea.id ? "is-dragging" : ""} ${state.dragOverId === idea.id ? "is-drag-over" : ""}"
                        draggable="true"
                        @dragstart=${(e: DragEvent) => {
                            e.dataTransfer?.setData("text/plain", idea.id);
                            updateState({ draggedId: idea.id });
                        }}
                        @dragover=${(e: DragEvent) => {
                            e.preventDefault();
                            if (state.draggedId && state.draggedId !== idea.id)
                                updateState({ dragOverId: idea.id });
                        }}
                        @dragleave=${() => {
                            if (state.dragOverId === idea.id) updateState({ dragOverId: null });
                        }}
                        @drop=${(e: DragEvent) => {
                            e.preventDefault();
                            const fromId = e.dataTransfer?.getData("text/plain") ?? state.draggedId;
                            if (fromId && fromId !== idea.id) {
                                dispatch(new events.ideasReordered(
                                    reorderBefore(sortedIdeas, fromId, idea.id).map((i) => i.id),
                                ));
                            }
                            updateState({ draggedId: null, dragOverId: null, confirmDeleteId: null });
                        }}
                        @dragend=${() => updateState({ draggedId: null, dragOverId: null })}
                    >
                    <div
                        class="idea-card"
                        @click=${(e: Event) => {
                            const target = e.target as HTMLElement;
                            if (
                                target.closest(".idea-actions") ||
                                target.closest(".confirm-delete")
                            )
                                return;
                            dispatch(new events.ideaEditRequested(idea));
                        }}
                    >
                        <div class="idea-title">${idea.title}</div>
                        ${idea.description
                            ? html`<div class="idea-desc">
                                  ${idea.description}
                              </div>`
                            : html``}
                        ${opName || gName
                            ? html`
                                  <div class="idea-meta">
                                      ${opName
                                          ? html`<span class="meta-badge"
                                                >⊙ ${opName}</span
                                            >`
                                          : html``}
                                      ${gName
                                          ? html`<span class="meta-badge goal"
                                                >→ ${gName}</span
                                            >`
                                          : html``}
                                  </div>
                              `
                            : html``}
                        <div class="idea-actions">
                            <button
                                class="action-btn action-promote"
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    dispatch(new events.promoteRequested(idea));
                                }}
                            >
                                PROMOTE TO COMMITMENT
                            </button>
                            <button
                                class="action-btn action-edit"
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    dispatch(
                                        new events.ideaEditRequested(idea),
                                    );
                                }}
                            >
                                EDIT
                            </button>
                            <button
                                class="action-btn action-delete"
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    updateState({ confirmDeleteId: idea.id });
                                }}
                            >
                                DELETE
                            </button>
                        </div>
                        ${confirmingDelete
                            ? html`
                                  <div class="confirm-delete">
                                      Permanently delete this intelligence?
                                      <button
                                          class="btn btn-danger"
                                          style="font-size:0.72rem;padding:3px 8px;"
                                          @click=${(e: Event) => {
                                              e.stopPropagation();
                                              dispatch(
                                                  new events.ideaDeleted(
                                                      idea.id,
                                                  ),
                                              );
                                              updateState({
                                                  confirmDeleteId: null,
                                              });
                                          }}
                                      >
                                          CONFIRM
                                      </button>
                                      <button
                                          class="btn btn-ghost"
                                          style="font-size:0.72rem;padding:3px 8px;"
                                          @click=${(e: Event) => {
                                              e.stopPropagation();
                                              updateState({
                                                  confirmDeleteId: null,
                                              });
                                          }}
                                      >
                                          CANCEL
                                      </button>
                                  </div>
                              `
                            : html``}
                    </div>
                    </div>
                `;
            })}
            ${sortedIdeas.length > 0
                ? html`
                      <div
                          class="drop-zone-end ${state.dragOverId === "__end__" ? "is-drag-over" : ""}"
                          @dragover=${(e: DragEvent) => {
                              e.preventDefault();
                              if (state.draggedId) updateState({ dragOverId: "__end__" });
                          }}
                          @dragleave=${() => {
                              if (state.dragOverId === "__end__") updateState({ dragOverId: null });
                          }}
                          @drop=${(e: DragEvent) => {
                              e.preventDefault();
                              const fromId = e.dataTransfer?.getData("text/plain") ?? state.draggedId;
                              if (fromId) {
                                  dispatch(new events.ideasReordered(
                                      moveToEnd(sortedIdeas, fromId).map((i) => i.id),
                                  ));
                              }
                              updateState({ draggedId: null, dragOverId: null });
                          }}
                      ></div>
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
