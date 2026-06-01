import {
    defineElement,
    defineElementEvent,
    css,
    html,
    listen,
} from "element-vir";
import { getActiveSkin } from "../skins/active-skin.js";
import type {
    FormKind,
    Goal,
    Idea,
    Area,
    AreaColor,
    Task,
} from "../data/types.js";
import {
    isCurrentlyPaused,
    isTaskVisible,
    isTaskOverdue,
} from "../data/storage.js";
import { GoalsViewElement } from "./goals-view.element.js";
import { IdeasViewElement } from "./ideas-view.element.js";

const COLOR_OPTIONS: ReadonlyArray<{
    key: AreaColor;
    label: string;
    swatch: string;
}> = [
    { key: "red", label: "Crimson", swatch: "var(--color-danger)" },
    { key: "navy", label: "Navy", swatch: "var(--color-primary)" },
    { key: "gold", label: "Gold", swatch: "var(--color-warning)" },
    { key: "olive", label: "Olive", swatch: "#4A5E2A" },
    { key: "slate", label: "Slate", swatch: "#4A5568" },
];
import { TaskItemElement } from "./task-item.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// AreaDetailElement
// Shows all tasks within a area, grouped: active → snoozed → completed.
// ─────────────────────────────────────────────────────────────────────────────

export const AreaDetailElement = defineElement<{
    area: Area;
    tasks: ReadonlyArray<Task>; // only this area's tasks
    goals: ReadonlyArray<Goal>; // only this area's goals
    ideas: ReadonlyArray<Idea>; // all ideas (filtered internally by area/goal)
    areas: ReadonlyArray<Area>;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "area-detail",

    events: {
        taskCompleted: defineElementEvent<string>(),
        taskSnoozed: defineElementEvent<string>(),
        taskUnSnoozed: defineElementEvent<string>(),
        taskSkipped: defineElementEvent<string>(),
        taskProgressLogged: defineElementEvent<string>(),
        taskEditRequested: defineElementEvent<string>(),
        newTaskRequested: defineElementEvent<string>(),
        newCommitmentRequested: defineElementEvent<{
            areaId: string;
            kind: FormKind;
        }>(),
        tasksReordered: defineElementEvent<ReadonlyArray<string>>(),
        back: defineElementEvent<void>(),
        areaDeleted: defineElementEvent<string>(),
        areaUpdated: defineElementEvent<Area>(),
        goalUpdated: defineElementEvent<Goal>(),
        goalSelected: defineElementEvent<string>(),
        ideaUpdated: defineElementEvent<Idea>(),
        ideaDeleted: defineElementEvent<string>(),
        ideaPromoteRequested: defineElementEvent<Idea>(),
    },

    state: () => ({
        showCompleted: false,
        confirmingDelete: false,
        editingArea: false,
        draggedId: null as string | null,
        dragOverId: null as string | null,
        editName: "",
        editDescription: "",
        editColor: "navy" as AreaColor,
    }),

    styles: css`
        :host {
            display: block;
            padding: 0 12px;
            /* Extra bottom clearance so content scrolls above the sticky add button */
            padding-bottom: 80px;
        }

        .section-label {
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: var(--color-text-muted);
            padding: 16px 2px 6px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
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
            color: var(--color-text-muted);
            font-family: var(--font-accent);
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
            padding: 16px;
            background: var(--color-primary);
            color: var(--color-surface);
            border: none;
            border-top: 1px solid rgba(0, 0, 0, 0.18);
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s;
            position: sticky;
            bottom: 0;
            bottom: env(safe-area-inset-bottom, 0px);
            z-index: 10;
        }
        .add-btn:hover {
            background: var(--color-primary-hover);
        }

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

        .completed-task {
            opacity: 0.45;
            position: relative;
        }

        .completed-task::after {
            content: "CLEARED";
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

        .snoozed-section {
            margin-top: 8px;
        }

        .task-drag-wrapper {
            position: relative;
        }
        .task-drag-wrapper.is-dragging {
            opacity: 0.35;
        }
        .task-drag-wrapper.is-drag-over::before {
            content: "";
            display: block;
            height: 2px;
            background: var(--color-primary);
            margin-bottom: 1px;
        }
        .drop-zone-end {
            height: 20px;
        }
        .drop-zone-end.is-drag-over {
            border-top: 2px solid var(--color-primary);
        }

        .delete-zone {
            margin-top: 32px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
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
            transition:
                background 0.15s,
                color 0.15s;
        }
        .delete-btn:hover {
            background: var(--color-danger);
            color: var(--color-surface);
        }

        .confirm-delete {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 12px;
            background: #fff5f5;
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
        .confirm-yes:hover {
            background: var(--color-danger-dark);
        }

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
        .confirm-no:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        .zone-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .edit-btn {
            background: none;
            border: 1px solid var(--color-primary);
            color: var(--color-primary);
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.2em;
            padding: 8px 16px;
            cursor: pointer;
            transition:
                background 0.15s,
                color 0.15s;
        }
        .edit-btn:hover {
            background: var(--color-primary);
            color: var(--color-surface);
        }

        .edit-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .edit-label {
            display: block;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-family: var(--font-mono);
            color: var(--color-text-muted);
            margin-bottom: 3px;
        }

        .edit-input {
            width: 100%;
            font-family: var(--font-accent);
            font-size: 0.9rem;
            background: var(--color-card);
            border: 1px solid rgba(0, 0, 0, 0.2);
            padding: 8px 10px;
            color: var(--color-text);
            box-sizing: border-box;
        }
        .edit-input:focus {
            outline: none;
            border-color: var(--color-primary);
        }

        .edit-textarea {
            min-height: 60px;
            resize: vertical;
        }

        .color-grid {
            display: flex;
            gap: 8px;
        }
        .color-option {
            display: none;
        }
        .color-swatch {
            display: block;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid transparent;
            cursor: pointer;
            transition:
                border-color 0.15s,
                transform 0.1s;
        }
        .color-swatch.selected {
            border-color: var(--color-text);
            transform: scale(1.15);
        }

        .save-btn {
            background: var(--color-primary);
            border: none;
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 0.85rem;
            letter-spacing: 0.15em;
            padding: 8px 16px;
            cursor: pointer;
        }
        .save-btn:hover {
            background: var(--color-primary-hover);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();
        const { area, tasks } = inputs;

        const activeTasks = tasks.filter(isTaskVisible);

        const pausedTasks = tasks.filter(
            (t) => t.completedAt === null && isCurrentlyPaused(t),
        );

        const snoozedTasks = tasks.filter(
            (t) =>
                t.completedAt === null &&
                !isCurrentlyPaused(t) &&
                t.snoozedUntil !== null &&
                t.snoozedUntil > Date.now(),
        );

        const completedTasks = tasks
            .filter((t) => t.completedAt !== null)
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

        return html`
            <!-- Active tasks section -->
            ${
                activeTasks.length === 0 &&
                pausedTasks.length === 0 &&
                snoozedTasks.length === 0
                    ? html`
                          <div class="empty-state">
                              <p>No active commitments in this area.</p>
                              <p class="empty-quote">
                                  "A cleared docket is not an idle one — it is a
                                  prepared one."<br />
                                  — Agent H. Whitaker
                              </p>
                          </div>
                      `
                    : html``
            }

            ${
                activeTasks.length > 0
                    ? html`
                          <div class="section-label">ACTIVE COMMITMENTS</div>
                          <div class="task-list">
                              ${activeTasks.map(
                                  (task) => html`
                                <div
                                    class="task-drag-wrapper ${state.draggedId === task.id ? "is-dragging" : ""} ${state.dragOverId === task.id ? "is-drag-over" : ""}"
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) => {
                                        e.dataTransfer?.setData(
                                            "text/plain",
                                            task.id,
                                        );
                                        updateState({ draggedId: task.id });
                                    }}
                                    @dragover=${(e: DragEvent) => {
                                        e.preventDefault();
                                        if (
                                            state.draggedId &&
                                            state.draggedId !== task.id
                                        ) {
                                            updateState({
                                                dragOverId: task.id,
                                            });
                                        }
                                    }}
                                    @dragleave=${() => {
                                        if (state.dragOverId === task.id)
                                            updateState({ dragOverId: null });
                                    }}
                                    @drop=${(e: DragEvent) => {
                                        e.preventDefault();
                                        const fromId =
                                            e.dataTransfer?.getData(
                                                "text/plain",
                                            ) ?? state.draggedId;
                                        if (fromId && fromId !== task.id) {
                                            dispatch(
                                                new events.tasksReordered(
                                                    reorderBefore(
                                                        activeTasks,
                                                        fromId,
                                                        task.id,
                                                    ).map((t) => t.id),
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
                                <${TaskItemElement.assign({ task, showDragHandle: true, activeSkinId: inputs.activeSkinId })}
                                    ${listen(
                                        TaskItemElement.events.completed,
                                        (e) =>
                                            dispatch(
                                                new events.taskCompleted(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                    ${listen(
                                        TaskItemElement.events.snoozed,
                                        (e) =>
                                            dispatch(
                                                new events.taskSnoozed(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                    ${listen(
                                        TaskItemElement.events.unSnoozed,
                                        (e) =>
                                            dispatch(
                                                new events.taskUnSnoozed(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                    ${listen(
                                        TaskItemElement.events.skipped,
                                        (e) =>
                                            dispatch(
                                                new events.taskSkipped(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                    ${listen(
                                        TaskItemElement.events.progressLogged,
                                        (e) =>
                                            dispatch(
                                                new events.taskProgressLogged(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                    ${listen(
                                        TaskItemElement.events.editRequested,
                                        (e) =>
                                            dispatch(
                                                new events.taskEditRequested(
                                                    e.detail,
                                                ),
                                            ),
                                    )}
                                ></${TaskItemElement}>
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
                                      updateState({ dragOverId: "__end__" });
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
                                              new events.tasksReordered(
                                                  moveToEnd(
                                                      activeTasks,
                                                      fromId,
                                                  ).map((t) => t.id),
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
                    : html``
            }

            <!-- Paused tasks -->
            ${
                pausedTasks.length > 0
                    ? html`
                          <div class="snoozed-section">
                              <div class="section-label">
                                  PAUSED (${pausedTasks.length})
                              </div>
                              <div class="task-list">
                                  ${pausedTasks.map(
                                      (task) => html`
                                    <${TaskItemElement.assign({ task, activeSkinId: inputs.activeSkinId })}
                                        ${listen(
                                            TaskItemElement.events
                                                .editRequested,
                                            (e) =>
                                                dispatch(
                                                    new events.taskEditRequested(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                    ></${TaskItemElement}>
                                `,
                                  )}
                              </div>
                          </div>
                      `
                    : html``
            }

            <!-- Snoozed tasks -->
            ${
                snoozedTasks.length > 0
                    ? html`
                          <div class="snoozed-section">
                              <div class="section-label">
                                  SNOOZED (${snoozedTasks.length})
                              </div>
                              <div class="task-list">
                                  ${snoozedTasks.map(
                                      (task) => html`
                                    <${TaskItemElement.assign({ task, activeSkinId: inputs.activeSkinId })}
                                        ${listen(
                                            TaskItemElement.events.completed,
                                            (e) =>
                                                dispatch(
                                                    new events.taskCompleted(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                        ${listen(
                                            TaskItemElement.events.snoozed,
                                            (e) =>
                                                dispatch(
                                                    new events.taskSnoozed(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                        ${listen(
                                            TaskItemElement.events.unSnoozed,
                                            (e) =>
                                                dispatch(
                                                    new events.taskUnSnoozed(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                        ${listen(
                                            TaskItemElement.events
                                                .editRequested,
                                            (e) =>
                                                dispatch(
                                                    new events.taskEditRequested(
                                                        e.detail,
                                                    ),
                                                ),
                                        )}
                                    ></${TaskItemElement}>
                                `,
                                  )}
                              </div>
                          </div>
                      `
                    : html``
            }

            <!-- Add task button -->
            <button
                class="add-btn"
                @click=${() => dispatch(new events.newTaskRequested(area.id))}
            >
                + MAKE NEW COMMITMENT
            </button>

            <!-- Completed tasks (collapsed by default) -->
            ${
                completedTasks.length > 0
                    ? html`
                          <button
                              class="toggle-completed"
                              @click=${() =>
                                  updateState({
                                      showCompleted: !state.showCompleted,
                                  })}
                          >
                              ${state.showCompleted ? "Hide" : "Show"}
                              ${completedTasks.length} cleared
                              commitment${completedTasks.length !== 1
                                  ? "s"
                                  : ""}
                          </button>

                          ${state.showCompleted
                              ? html`
                                    <div class="section-label">CLEARED</div>
                                    <div class="task-list">
                                        ${completedTasks.map(
                                            (task) => html`
                                        <div class="completed-task">
                                            <${TaskItemElement.assign({ task, activeSkinId: inputs.activeSkinId })}
                                                ${listen(
                                                    TaskItemElement.events
                                                        .completed,
                                                    (e) =>
                                                        dispatch(
                                                            new events.taskCompleted(
                                                                e.detail,
                                                            ),
                                                        ),
                                                )}
                                                ${listen(
                                                    TaskItemElement.events
                                                        .snoozed,
                                                    (e) =>
                                                        dispatch(
                                                            new events.taskSnoozed(
                                                                e.detail,
                                                            ),
                                                        ),
                                                )}
                                                ${listen(
                                                    TaskItemElement.events
                                                        .unSnoozed,
                                                    (e) =>
                                                        dispatch(
                                                            new events.taskUnSnoozed(
                                                                e.detail,
                                                            ),
                                                        ),
                                                )}
                                                ${listen(
                                                    TaskItemElement.events
                                                        .editRequested,
                                                    (e) =>
                                                        dispatch(
                                                            new events.taskEditRequested(
                                                                e.detail,
                                                            ),
                                                        ),
                                                )}
                                            ></${TaskItemElement}>
                                        </div>
                                    `,
                                        )}
                                    </div>
                                `
                              : html``}
                      `
                    : html``
            }

            <!-- Goals for this area -->
            <div class="goals-section">
                <div class="section-label" style="margin-bottom:8px">${skin.types.goalPlural.toUpperCase()}</div>
                <${GoalsViewElement.assign({
                    goals: inputs.goals,
                    tasks: inputs.tasks,
                    areas: inputs.areas,
                    filterAreaId: area.id,
                    activeSkinId: inputs.activeSkinId,
                })}
                    ${listen(
                        GoalsViewElement.events.makeCommitmentRequested,
                        (e) =>
                            dispatch(
                                new events.newCommitmentRequested({
                                    areaId: area.id,
                                    kind: e.detail,
                                }),
                            ),
                    )}
                    ${listen(GoalsViewElement.events.goalUpdated, (e) =>
                        dispatch(new events.goalUpdated(e.detail)),
                    )}
                    ${listen(GoalsViewElement.events.goalSelected, (e) =>
                        dispatch(new events.goalSelected(e.detail)),
                    )}
                ></${GoalsViewElement}>
            </div>

            <!-- Intelligence for this area -->
            <div class="intel-section">
                <div class="section-label" style="margin-bottom:0">${skin.types.ideaPlural.toUpperCase()}</div>
                <${IdeasViewElement.assign({
                    ideas: inputs.ideas,
                    goals: inputs.goals,
                    areas: inputs.areas,
                    filterAreaId: area.id,
                    activeSkinId: inputs.activeSkinId,
                })} data-embedded=${""}
                    ${listen(
                        IdeasViewElement.events.makeCommitmentRequested,
                        (e) =>
                            dispatch(
                                new events.newCommitmentRequested({
                                    areaId: area.id,
                                    kind: e.detail,
                                }),
                            ),
                    )}
                    ${listen(IdeasViewElement.events.ideaUpdated, (e) =>
                        dispatch(new events.ideaUpdated(e.detail)),
                    )}
                    ${listen(IdeasViewElement.events.ideaDeleted, (e) =>
                        dispatch(new events.ideaDeleted(e.detail)),
                    )}
                    ${listen(IdeasViewElement.events.promoteRequested, (e) =>
                        dispatch(new events.ideaPromoteRequested(e.detail)),
                    )}
                ></${IdeasViewElement}>
            </div>

            <!-- Edit / delete area zone -->
            <div class="delete-zone">
                ${
                    state.editingArea
                        ? html`
                              <div class="edit-form">
                                  <div>
                                      <label class="edit-label"
                                          >Area Name</label
                                      >
                                      <input
                                          class="edit-input"
                                          type="text"
                                          .value=${state.editName}
                                          @input=${(e: Event) =>
                                              updateState({
                                                  editName: (
                                                      e.target as HTMLInputElement
                                                  ).value,
                                              })}
                                      />
                                  </div>
                                  <div>
                                      <label class="edit-label">Briefing</label>
                                      <textarea
                                          class="edit-input edit-textarea"
                                          .value=${state.editDescription}
                                          @input=${(e: Event) =>
                                              updateState({
                                                  editDescription: (
                                                      e.target as HTMLTextAreaElement
                                                  ).value,
                                              })}
                                      ></textarea>
                                  </div>
                                  <div>
                                      <label class="edit-label"
                                          >Designation Color</label
                                      >
                                      <div class="color-grid">
                                          ${COLOR_OPTIONS.map(
                                              (opt) => html`
                                                  <div>
                                                      <input
                                                          type="radio"
                                                          class="color-option"
                                                          name="edit-color"
                                                          id="ec-${opt.key}"
                                                          .checked=${state.editColor ===
                                                          opt.key}
                                                          @change=${() =>
                                                              updateState({
                                                                  editColor:
                                                                      opt.key,
                                                              })}
                                                      />
                                                      <label
                                                          for="ec-${opt.key}"
                                                          class="color-swatch ${state.editColor ===
                                                          opt.key
                                                              ? "selected"
                                                              : ""}"
                                                          style="background:${opt.swatch}"
                                                          title="${opt.label}"
                                                      ></label>
                                                  </div>
                                              `,
                                          )}
                                      </div>
                                  </div>
                                  <div class="confirm-actions">
                                      <button
                                          class="save-btn"
                                          @click=${() => {
                                              const trimmed =
                                                  state.editName.trim();
                                              if (!trimmed) return;
                                              dispatch(
                                                  new events.areaUpdated({
                                                      ...area,
                                                      name: trimmed,
                                                      description:
                                                          state.editDescription.trim(),
                                                      colorKey: state.editColor,
                                                  }),
                                              );
                                              updateState({
                                                  editingArea: false,
                                              });
                                          }}
                                      >
                                          SAVE CHANGES
                                      </button>
                                      <button
                                          class="confirm-no"
                                          @click=${() =>
                                              updateState({
                                                  editingArea: false,
                                              })}
                                      >
                                          CANCEL
                                      </button>
                                  </div>
                              </div>
                          `
                        : state.confirmingDelete
                          ? html`
                                <div class="confirm-delete">
                                    <p>
                                        PERMANENTLY DECOMMISSION THIS AREA AND
                                        ALL ITS COMMITMENTS?
                                    </p>
                                    <div class="confirm-actions">
                                        <button
                                            class="confirm-yes"
                                            @click=${() =>
                                                dispatch(
                                                    new events.areaDeleted(
                                                        area.id,
                                                    ),
                                                )}
                                        >
                                            DECOMMISSION
                                        </button>
                                        <button
                                            class="confirm-no"
                                            @click=${() =>
                                                updateState({
                                                    confirmingDelete: false,
                                                })}
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                </div>
                            `
                          : html`
                                <div class="zone-actions">
                                    <button
                                        class="edit-btn"
                                        @click=${() =>
                                            updateState({
                                                editingArea: true,
                                                editName: area.name,
                                                editDescription:
                                                    area.description,
                                                editColor: area.colorKey,
                                            })}
                                    >
                                        EDIT AREA
                                    </button>
                                    <button
                                        class="delete-btn"
                                        @click=${() =>
                                            updateState({
                                                confirmingDelete: true,
                                            })}
                                    >
                                        DECOMMISSION AREA
                                    </button>
                                </div>
                            `
                }
            </div>

        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function reorderBefore<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
    toId: string,
): T[] {
    const item = list.find((t) => t.id === fromId);
    if (!item) return [...list];
    const rest = list.filter((t) => t.id !== fromId);
    const idx = rest.findIndex((t) => t.id === toId);
    if (idx === -1) return [...list];
    rest.splice(idx, 0, item);
    return rest;
}

function moveToEnd<T extends { id: string }>(
    list: ReadonlyArray<T>,
    fromId: string,
): T[] {
    const item = list.find((t) => t.id === fromId);
    if (!item) return [...list];
    return [...list.filter((t) => t.id !== fromId), item];
}
