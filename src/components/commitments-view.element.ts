import { css, defineElement, defineElementEvent, html, listen } from "element-vir";
import type {
    AnyCommitment,
    Area,
    FormKind,
    Goal,
    TimeOfDay,
} from "../data/types.js";
import { TIME_OF_DAY_SLOTS, TIME_OF_DAY_ORDER, timeOfDayLabel } from "../data/types.js";
import { CommitmentCardElement } from "./commitment-card.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// CommitmentsViewElement
// Organization-focused list view for any filtered slice of the commitments
// array. Used for: All Tasks, All Routines, All Commitments, Unlinked.
//
// showTimeOfDayToggle=true enables grouping by time-of-day slot (tasks only).
// Drag-to-reorder is available in flat (non-grouped) mode.
// ─────────────────────────────────────────────────────────────────────────────

export const CommitmentsViewElement = defineElement<{
    commitments: ReadonlyArray<AnyCommitment>;
    areas: ReadonlyArray<Area>;
    goals: ReadonlyArray<Goal>;
    pageTitle: string;
    subtitle: string;
    /** Show the time-of-day group toggle. Only meaningful for task/routine views. */
    showTimeOfDayToggle?: boolean;
    /** Label for the "add new" button. Omit to hide the button. */
    addLabel?: string | null;
    /** Re-render trigger when skin changes. */
    activeSkinId: string;
}>()({
    tagName: "commitments-view",

    events: {
        commitmentEditRequested: defineElementEvent<AnyCommitment>(),
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        commitmentsReordered: defineElementEvent<ReadonlyArray<string>>(),
    },

    state: () => ({
        groupByTimeOfDay: false,
        draggedId: null as string | null,
        dragOverId: null as string | null,
    }),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
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
            margin-bottom: 16px;
        }

        .controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 14px;
        }

        .count {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
        }

        .toggle-btn {
            background: none;
            border: 1px solid var(--color-border);
            color: var(--color-text-muted);
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            padding: 5px 10px;
            cursor: pointer;
            transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .toggle-btn.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: var(--color-surface);
        }
        .toggle-btn:not(.active):hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }

        .section-label {
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: var(--color-text-muted);
            padding: 14px 0 6px;
            border-bottom: 1px solid var(--color-surface-tint);
            margin-bottom: 4px;
        }

        .card-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-bottom: 4px;
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
            margin-bottom: 2px;
        }

        .drop-zone-end {
            height: 18px;
        }
        .drop-zone-end.is-drag-over {
            border-top: 2px solid var(--color-primary);
        }

        .empty {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text-muted);
            text-align: center;
            padding: 40px 0;
        }

        .add-btn {
            width: 100%;
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.15em;
            padding: 10px;
            background: transparent;
            border: 1.5px dashed var(--color-border-strong);
            color: var(--color-text-muted);
            cursor: pointer;
            margin-bottom: 16px;
            text-align: center;
        }
        .add-btn:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const { commitments, areas, goals, pageTitle, subtitle, showTimeOfDayToggle, addLabel } = inputs;
        const canDrag = !state.groupByTimeOfDay;

        function renderDraggableCard(c: AnyCommitment) {
            return html`
                <div
                    class="card-drag-wrapper ${state.draggedId === c.id ? "is-dragging" : ""} ${state.dragOverId === c.id ? "is-drag-over" : ""}"
                    draggable="true"
                    @dragstart=${(e: DragEvent) => {
                        e.dataTransfer?.setData("text/plain", c.id);
                        updateState({ draggedId: c.id });
                    }}
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        if (state.draggedId && state.draggedId !== c.id) {
                            updateState({ dragOverId: c.id });
                        }
                    }}
                    @dragleave=${() => {
                        if (state.dragOverId === c.id)
                            updateState({ dragOverId: null });
                    }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer?.getData("text/plain") ?? state.draggedId;
                        if (fromId && fromId !== c.id) {
                            dispatch(new events.commitmentsReordered(
                                reorderBefore(commitments, fromId, c.id).map((x) => x.id),
                            ));
                        }
                        updateState({ draggedId: null, dragOverId: null });
                    }}
                    @dragend=${() => updateState({ draggedId: null, dragOverId: null })}
                >
                    <${CommitmentCardElement.assign({ commitment: c, areas, goals, activeSkinId: inputs.activeSkinId })}
                        ${listen(CommitmentCardElement.events.editRequested, (e) =>
                            dispatch(new events.commitmentEditRequested(e.detail)),
                        )}
                    ></${CommitmentCardElement}>
                </div>
            `;
        }

        function renderStaticCard(c: AnyCommitment) {
            return html`
                <${CommitmentCardElement.assign({ commitment: c, areas, goals, activeSkinId: inputs.activeSkinId })}
                    ${listen(CommitmentCardElement.events.editRequested, (e) =>
                        dispatch(new events.commitmentEditRequested(e.detail)),
                    )}
                ></${CommitmentCardElement}>
            `;
        }

        let listContent = html``;

        if (commitments.length === 0) {
            listContent = html`<div class="empty">No commitments here.</div>`;
        } else if (showTimeOfDayToggle && state.groupByTimeOfDay) {
            const slotMap = new Map<TimeOfDay, AnyCommitment[]>();
            for (const slot of TIME_OF_DAY_SLOTS) slotMap.set(slot, []);
            for (const c of commitments) {
                const slot = (c as any).timeOfDay as TimeOfDay | undefined;
                slotMap.get(slot ?? "anytime")!.push(c);
            }
            const sortedSlots = [...TIME_OF_DAY_SLOTS].sort(
                (a, b) => TIME_OF_DAY_ORDER[a] - TIME_OF_DAY_ORDER[b],
            );
            listContent = html`
                ${sortedSlots.map((slot) => {
                    const items = slotMap.get(slot)!;
                    if (items.length === 0) return html``;
                    return html`
                        <div class="section-label">${timeOfDayLabel(slot).toUpperCase()} (${items.length})</div>
                        <div class="card-list">
                            ${items.map(renderStaticCard)}
                        </div>
                    `;
                })}
            `;
        } else {
            listContent = html`
                <div class="card-list">
                    ${commitments.map(canDrag ? renderDraggableCard : renderStaticCard)}
                </div>
                ${canDrag && commitments.length > 0
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
                                      dispatch(new events.commitmentsReordered(
                                          moveToEnd(commitments, fromId).map((x) => x.id),
                                      ));
                                  }
                                  updateState({ draggedId: null, dragOverId: null });
                              }}
                          ></div>
                      `
                    : html``}
            `;
        }

        const defaultKindForAdd: FormKind =
            pageTitle.toLowerCase().includes("routine")
                ? "routine"
                : pageTitle.toLowerCase().includes("idea")
                  ? "idea"
                  : pageTitle.toLowerCase().includes("goal")
                    ? "goal"
                    : "task";

        return html`
            <div class="page-title">${pageTitle}</div>
            <div class="page-subtitle">${subtitle}</div>

            ${addLabel
                ? html`
                      <button
                          class="add-btn"
                          @click=${() =>
                              dispatch(
                                  new events.makeCommitmentRequested(
                                      defaultKindForAdd,
                                  ),
                              )}
                      >
                          + ${addLabel}
                      </button>
                  `
                : html``}

            <div class="controls">
                <span class="count">${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}</span>
                ${showTimeOfDayToggle
                    ? html`
                          <button
                              class=${"toggle-btn" + (state.groupByTimeOfDay ? " active" : "")}
                              @click=${() => updateState({ groupByTimeOfDay: !state.groupByTimeOfDay })}
                          >
                              ${state.groupByTimeOfDay ? "⊞ BY TIME" : "⊟ BY TIME"}
                          </button>
                      `
                    : html``}
            </div>

            ${listContent}
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
