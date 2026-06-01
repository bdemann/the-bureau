import {
    defineElement,
    defineElementEvent,
    css,
    html,
    listen,
} from "element-vir";
import type { Area, Task } from "../data/types.js";
import { AreaCardElement } from "./area-card.element.js";
import { AreaWizardDialogElement } from "./area-wizard-dialog.element.js";
import { isTaskOverdue, isTaskVisible } from "../data/storage.js";

// ─────────────────────────────────────────────────────────────────────────────
// DashboardViewElement
// The main command center. Shows all active areas.
// Includes a summary of overdue / flagged items at the top.
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardViewElement = defineElement<{
    areas: ReadonlyArray<Area>;
    tasks: ReadonlyArray<Task>;
    /** Count of commitments with no area assigned (all 4 types). */
    unlinkedCount?: number;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "dashboard-view",

    events: {
        areaSelected: defineElementEvent<string>(), // area id
        areaAdded: defineElementEvent<Area>(),
        areaCreated: defineElementEvent<{
            area: Area;
            routines: ReadonlyArray<Task>;
        }>(),
        areasReordered: defineElementEvent<ReadonlyArray<string>>(), // ordered area ids
        /** Fired when user clicks the unlinked commitments card. */
        unlinkedRequested: defineElementEvent<void>(),
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
            background: var(--color-primary);
            color: var(--color-surface);
            padding: 10px 14px;
            font-family: var(--font-mono);
            font-size: 0.75rem;
            line-height: 1.5;
            border-left: 4px solid var(--color-warning);
        }

        .intel-banner .intel-title {
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: var(--color-warning);
            margin-bottom: 3px;
        }

        .intel-stat {
            display: inline;
        }

        .intel-stat.alert {
            color: #ff8888;
            font-weight: 700;
        }

        .intel-stat.good {
            color: #88cc88;
        }

        .section-heading {
            font-family: var(--font-display);
            font-size: 0.75rem;
            letter-spacing: 0.25em;
            color: var(--color-text-muted);
            margin: 20px 0 10px 2px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-heading::after {
            content: "";
            flex: 1;
            height: 1px;
            background: rgba(0, 0, 0, 0.12);
        }

        .area-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px 40px;
            font-family: var(--font-accent);
        }

        .empty-state .stamp-text {
            font-family: var(--font-display);
            font-size: 2rem;
            letter-spacing: 0.3em;
            color: rgba(var(--color-danger-rgb), 0.15);
            border: 4px solid rgba(var(--color-danger-rgb), 0.1);
            display: inline-block;
            padding: 8px 24px;
            margin-bottom: 16px;
            transform: rotate(-2deg);
        }

        .empty-state p {
            font-size: 0.9rem;
            color: var(--color-text-muted);
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
            color: var(--color-primary);
            border: 2px dashed rgba(var(--color-primary-rgb), 0.3);
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition:
                background 0.15s,
                border-color 0.15s;
        }
        .add-btn:hover {
            background: rgba(var(--color-primary-rgb), 0.05);
            border-color: rgba(var(--color-primary-rgb), 0.6);
        }

        .card-drag-wrapper {
            position: relative;
        }
        .card-drag-wrapper.is-dragging {
            opacity: 0.35;
        }
        .card-drag-wrapper.is-drag-over::before {
            content: "";
            display: block;
            height: 2px;
            background: var(--color-primary);
            margin-bottom: 2px;
        }
        .drop-zone-end {
            height: 20px;
        }
        .drop-zone-end.is-drag-over {
            border-top: 2px solid var(--color-primary);
        }

        .unlinked-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 14px 0 0;
            padding: 10px 14px;
            background: none;
            border: 1px solid rgba(var(--color-danger-rgb), 0.3);
            border-left: 4px solid var(--color-danger);
            cursor: pointer;
            width: 100%;
            text-align: left;
            transition: border-color 0.15s, background 0.15s;
        }
        .unlinked-card:hover {
            background: rgba(var(--color-danger-rgb), 0.04);
            border-color: rgba(var(--color-danger-rgb), 0.5);
        }
        .unlinked-card-label {
            font-family: var(--font-display);
            font-size: 0.75rem;
            letter-spacing: 0.2em;
            color: var(--color-danger);
        }
        .unlinked-card-count {
            font-family: var(--font-mono);
            font-size: 0.72rem;
            color: var(--color-text-muted);
        }
        .unlinked-card-arrow {
            font-family: var(--font-mono);
            color: rgba(var(--color-danger-rgb), 0.4);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const { areas, tasks } = inputs;
        const unlinkedCount = inputs.unlinkedCount ?? 0;

        // Calculate summary stats for the intel banner
        const allVisible = tasks.filter(isTaskVisible);
        const overdueCount = allVisible.filter(isTaskOverdue).length;
        const pendingCount = allVisible.length;
        const completedToday = tasks.filter((t) => {
            if (!t.completedAt) return false;
            const d = new Date(t.completedAt);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        }).length;

        return html`
            <!-- Intel summary banner -->
            ${
                areas.length > 0
                    ? html`
                          <div class="intel-banner">
                              <div class="intel-title">
                                  DAILY STATUS BRIEFING
                              </div>
                              <span
                                  class="intel-stat ${pendingCount > 0
                                      ? ""
                                      : "good"}"
                              >
                                  ${pendingCount}
                                  commitment${pendingCount !== 1 ? "s" : ""}
                                  pending
                              </span>
                              ${overdueCount > 0
                                  ? html` ·
                                        <span class="intel-stat alert"
                                            >${overdueCount} overdue</span
                                        >`
                                  : html``}
                              ${completedToday > 0
                                  ? html` ·
                                        <span class="intel-stat good"
                                            >${completedToday} cleared
                                            today</span
                                        >`
                                  : html``}
                          </div>
                      `
                    : html``
            }

            <!-- Unlinked commitments shortcut -->
            ${unlinkedCount > 0
                ? html`
                      <button
                          class="unlinked-card"
                          @click=${() => dispatch(new events.unlinkedRequested())}
                      >
                          <div>
                              <div class="unlinked-card-label">UNLINKED COMMITMENTS</div>
                              <div class="unlinked-card-count">${unlinkedCount} commitment${unlinkedCount !== 1 ? "s" : ""} with no area assigned</div>
                          </div>
                          <span class="unlinked-card-arrow">→</span>
                      </button>
                  `
                : html``}

            <!-- Area grid -->
            ${
                areas.length === 0
                    ? html`
                          <div class="empty-state">
                              <div class="stamp-text">
                                  NO AREAS OF RESPONSIBILITY
                              </div>
                              <p>
                                  Your docket is empty, citizen.<br />
                                  A true patriot doesn't wait for orders — they
                                  file their own.
                              </p>
                          </div>
                      `
                    : html`
                          <div class="section-heading">
                              AREAS OF RESPONSIBILITY
                          </div>
                          <div class="area-grid">
                              ${areas.map(
                                  (area) => html`
                                <div
                                    class="card-drag-wrapper ${state.draggedId === area.id ? "is-dragging" : ""} ${state.dragOverId === area.id ? "is-drag-over" : ""}"
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) => {
                                        e.dataTransfer?.setData(
                                            "text/plain",
                                            area.id,
                                        );
                                        updateState({ draggedId: area.id });
                                    }}
                                    @dragover=${(e: DragEvent) => {
                                        e.preventDefault();
                                        if (
                                            state.draggedId &&
                                            state.draggedId !== area.id
                                        ) {
                                            updateState({
                                                dragOverId: area.id,
                                            });
                                        }
                                    }}
                                    @dragleave=${() => {
                                        if (state.dragOverId === area.id)
                                            updateState({ dragOverId: null });
                                    }}
                                    @drop=${(e: DragEvent) => {
                                        e.preventDefault();
                                        const fromId =
                                            e.dataTransfer?.getData(
                                                "text/plain",
                                            ) ?? state.draggedId;
                                        if (fromId && fromId !== area.id) {
                                            dispatch(
                                                new events.areasReordered(
                                                    reorderBefore(
                                                        areas,
                                                        fromId,
                                                        area.id,
                                                    ).map((p) => p.id),
                                                ),
                                            );
                                        }
                                        updateState({
                                            draggedId: null,
                                            dragOverId: null,
                                        });
                                    }}
                                    @dragend=${() => updateState({ draggedId: null, dragOverId: null })}
                                >
                                    <${AreaCardElement.assign({
                                        area,
                                        tasks: tasks.filter(
                                            (t) => t.areaId === area.id,
                                        ),
                                        activeSkinId: inputs.activeSkinId,
                                    })}
                                        ${listen(
                                            AreaCardElement.events.selected,
                                            (e) =>
                                                dispatch(
                                                    new events.areaSelected(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                    ></${AreaCardElement}>
                                </div>
                            `,
                              )}
                              <div
                                  class="drop-zone-end ${state.dragOverId ===
                                  "__end__"
                                      ? "is-drag-over"
                                      : ""}"
                                  @dragover=${(e: DragEvent) => {
                                      e.preventDefault();
                                      if (state.draggedId)
                                          updateState({
                                              dragOverId: "__end__",
                                          });
                                  }}
                                  @dragleave=${() => {
                                      if (state.dragOverId === "__end__")
                                          updateState({ dragOverId: null });
                                  }}
                                  @drop=${(e: DragEvent) => {
                                      e.preventDefault();
                                      const fromId =
                                          e.dataTransfer?.getData(
                                              "text/plain",
                                          ) ?? state.draggedId;
                                      if (fromId) {
                                          dispatch(
                                              new events.areasReordered(
                                                  moveToEnd(areas, fromId).map(
                                                      (p) => p.id,
                                                  ),
                                              ),
                                          );
                                      }
                                      updateState({
                                          draggedId: null,
                                          dragOverId: null,
                                      });
                                  }}
                              ></div>
                          </div>
                      `
            }

            <button
                class="add-btn"
                @click=${() => updateState({ wizardOpen: true })}
            >
                + NEW AREA OF RESPONSIBILITY
            </button>

            <!-- Area wizard dialog -->
            <${AreaWizardDialogElement.assign({ open: state.wizardOpen, activeSkinId: inputs.activeSkinId })}
                ${listen(AreaWizardDialogElement.events.areaCreated, (e) => {
                    dispatch(new events.areaCreated(e.detail));
                    updateState({ wizardOpen: false });
                })}
                ${listen(AreaWizardDialogElement.events.cancelled, () =>
                    updateState({ wizardOpen: false }),
                )}
            ></${AreaWizardDialogElement}>
        `;
    },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function reorderBefore<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
    toId: string,
): T[] {
    const item = list.find((p) => p.id === fromId);
    if (!item) return [...list];
    const rest = list.filter((p) => p.id !== fromId);
    const idx = rest.findIndex((p) => p.id === toId);
    if (idx === -1) return [...list];
    rest.splice(idx, 0, item);
    return rest;
}

function moveToEnd<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
): T[] {
    const item = list.find((p) => p.id === fromId);
    if (!item) return [...list];
    return [...list.filter((p) => p.id !== fromId), item];
}
