import {
    css,
    defineElement,
    defineElementEvent,
    html,
    listen,
} from "element-vir";
import { ViraButton, ViraColorVariant, ViraEmphasis, ViraSize } from "vira";
import {getNowInUserTimezone} from 'date-vir';
import type { DailyBand, Area, Task, TimeOfDay, TimeSettings } from "../data/types.js";
import { DEFAULT_TIME_SETTINGS, TIME_OF_DAY_SLOTS, getTimeSlot, timeOfDayLabel } from "../data/types.js";
import { getDailyBand } from "../data/urgency.js";
import { getActiveSkin } from "../skins/active-skin.js";
import { TaskItemElement } from "./task-item.element.js";

// ─────────────────────────────────────────────────────────────────────────────
// DailyViewElement
// Cross-area landing view: every visible task, sorted into urgency bands.
// State is owned by the parent (bureau-app); this element only renders.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 5;

// ── View preference persistence ──────────────────────────────────────────────

const VIEW_PREFS_KEY = 'bureau-daily-view-prefs';
const ONE_HOUR_MS = 3_600_000;

type ExpandedSlots = Partial<Record<DailyBand, Partial<Record<TimeOfDay, boolean>>>>;

interface ViewPrefs {
    mergedView: boolean;
    expandMandatory: boolean;
    expandSuggested: boolean;
    expandRadar: boolean;
    expandBacklog: boolean;
    expandedSlots: ExpandedSlots;
    lastActiveMs: number;
}

const DEFAULT_VIEW_PREFS: Omit<ViewPrefs, 'expandedSlots' | 'lastActiveMs'> = {
    mergedView: false,
    expandMandatory: true,
    expandSuggested: true,
    expandRadar: false,
    expandBacklog: false,
};

function loadViewPrefs(): ViewPrefs {
    try {
        const raw = localStorage.getItem(VIEW_PREFS_KEY);
        if (!raw) return { ...DEFAULT_VIEW_PREFS, expandedSlots: {}, lastActiveMs: 0 };
        return { ...DEFAULT_VIEW_PREFS, expandedSlots: {}, lastActiveMs: 0, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_VIEW_PREFS, expandedSlots: {}, lastActiveMs: 0 };
    }
}

function saveViewPrefs(prefs: ViewPrefs): void {
    try {
        localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Storage unavailable — ignore.
    }
}

// Latest pref snapshot — updated every render so the visibilitychange handler
// (which runs outside the render cycle) always saves fresh values.
let _latestPrefs: ViewPrefs = { ...DEFAULT_VIEW_PREFS, expandedSlots: {}, lastActiveMs: 0 };

// ── Time-of-day slot helpers ─────────────────────────────────────────────────

// Module-level settings reference — updated on every render from inputs.
let _activeTimeSettings: TimeSettings = DEFAULT_TIME_SETTINGS;

// Fires when the app returns from background after >= 1 hour away.
// Updated every render so it closes over the latest updateState.
let _onSlotChange: ((slot: TimeOfDay) => void) | null = null;

{
    let timeWhenHidden: number | null = null;
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            timeWhenHidden = Date.now();
        } else if (timeWhenHidden !== null) {
            const elapsed = Date.now() - timeWhenHidden;
            timeWhenHidden = null;
            if (elapsed >= ONE_HOUR_MS) {
                const current = getTimeSlot(getNowInUserTimezone().hour, _activeTimeSettings);
                _onSlotChange?.(current);
            }
        }
    });
}

export const DailyViewElement = defineElement<{
    tasks: ReadonlyArray<Task>;
    areas: ReadonlyArray<Area>;
    timeSettings: TimeSettings;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "daily-view",

    events: {
        taskCompleted: defineElementEvent<string>(),
        taskSnoozed: defineElementEvent<string>(),
        taskUnSnoozed: defineElementEvent<string>(),
        taskSkipped: defineElementEvent<string>(),
        taskNotToday: defineElementEvent<string>(),
        taskProgressLogged: defineElementEvent<string>(),
        taskEditRequested: defineElementEvent<string>(),
        newTaskRequested: defineElementEvent<void>(),
        tasksReordered: defineElementEvent<ReadonlyArray<string>>(), // ordered task ids
    },

    state: () => {
        const prefs = loadViewPrefs();
        const elapsed = Date.now() - prefs.lastActiveMs;
        // Reset to current time slot on fresh opens (no saved time) or after >= 1 hour away.
        // Otherwise restore whatever the user last had open.
        const expandedSlots: ExpandedSlots = (prefs.lastActiveMs === 0 || elapsed >= ONE_HOUR_MS)
            ? (() => {
                const slot = getTimeSlot(getNowInUserTimezone().hour, DEFAULT_TIME_SETTINGS);
                const s = { [slot]: true } as Partial<Record<TimeOfDay, boolean>>;
                return { mandatory: s, suggested: s, radar: s, backlog: s };
            })()
            : prefs.expandedSlots;
        return {
            mergedView: prefs.mergedView,
            expandMandatory: prefs.expandMandatory,
            expandSuggested: prefs.expandSuggested,
            expandRadar: prefs.expandRadar,
            expandBacklog: prefs.expandBacklog,
            expandedSlots,
            draggedId: null as string | null,
            dragOverId: null as string | null,
        };
    },

    styles: css`
        :host {
            display: block;
            padding: 12px 16px 80px;
        }

        .band {
            margin-bottom: 24px;
        }

        .band-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            padding: 4px 0;
            min-height: 44px;
            border-bottom: 1px solid var(--color-border);
        }
        .band-header.mandatory {
            border-bottom-color: var(--color-danger);
        }
        .band-header.suggested {
            border-bottom-color: var(--color-snooze);
        }
        .band-header.radar {
            border-bottom-color: var(--color-warning);
        }
        .band-header.backlog {
            border-bottom-color: var(--color-border);
        }

        .band-header.collapsible {
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }
        @media (hover: hover) {
            .band-header.collapsible:hover {
                opacity: 0.8;
            }
        }

        .band-chevron {
            font-size: 0.6rem;
            opacity: 0.5;
            align-self: center;
        }

        .band-title {
            font-family: var(--font-display);
            font-size: 1rem;
            letter-spacing: 0.18em;
            color: var(--color-primary);
        }
        .band-header.mandatory .band-title {
            color: var(--color-danger);
        }
        .band-header.suggested .band-title {
            color: #7a3000;
        }

        .band-subtitle {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--color-text-muted);
            letter-spacing: 0.05em;
        }

        .band-count {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--color-text-muted);
        }

        .band-empty {
            font-family: var(--font-accent);
            font-size: 0.85rem;
            color: var(--color-text-muted);
            padding: 14px 8px;
            background: rgba(255, 253, 247, 0.6);
            border: 1px dashed var(--color-border);
            text-align: center;
        }

        .task-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .time-group + .time-group {
            margin-top: 10px;
        }

        .time-group-header {
            display: flex;
            align-items: center;
            width: 100%;
            background: none;
            border: none;
            border-bottom: 1px dotted var(--color-border);
            padding: 8px 0 4px;
            margin-bottom: 6px;
            min-height: 44px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--color-text-muted);
            text-align: left;
        }

        @media (hover: hover) {
            .time-group-header:hover {
                color: var(--color-text);
            }
        }

        .time-group-label {
            flex: 1;
        }

        .time-group-count {
            font-size: 0.6rem;
            opacity: 0.65;
            margin-right: 6px;
        }

        .time-group-chevron {
            font-size: 0.55rem;
            opacity: 0.65;
        }

        .collapse-toggle {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
        }

        .view-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .merge-toggle-btn {
            background: none;
            border: 1px solid currentColor;
            font-family: var(--font-mono);
            font-size: 0.6rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 3px 8px;
            -webkit-tap-highlight-color: transparent;
        }
        .merge-toggle-btn.active {
            background: var(--color-primary);
            color: var(--color-surface);
            border-color: var(--color-primary);
        }
        @media (hover: hover) {
            .merge-toggle-btn:hover {
                opacity: 0.8;
            }
        }

        .collapse-all-bar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
        }

        .collapse-all-btn {
            background: none;
            border: none;
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 4px 0;
            -webkit-tap-highlight-color: transparent;
        }
        @media (hover: hover) {
            .collapse-all-btn:hover {
                color: var(--color-text);
            }
        }

        .merged-band-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 4px 0;
            border-bottom: 1px solid var(--color-primary);
        }
        .merged-band-title {
            font-family: var(--font-display);
            font-size: 1rem;
            letter-spacing: 0.18em;
            color: var(--color-primary);
            flex: 1;
        }
        .merged-band-count {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--color-text-muted);
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

        .file-directive-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin-top: 8px;
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
        .file-directive-btn:hover {
            background: var(--color-primary-hover);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        const skin = getActiveSkin();

        // Keep module-level refs current every render.
        _activeTimeSettings = inputs.timeSettings;
        _latestPrefs = {
            mergedView: state.mergedView,
            expandMandatory: state.expandMandatory,
            expandSuggested: state.expandSuggested,
            expandRadar: state.expandRadar,
            expandBacklog: state.expandBacklog,
            expandedSlots: state.expandedSlots,
            lastActiveMs: Date.now(),
        };

        _onSlotChange = (newSlot: TimeOfDay) => {
            const slotState = { [newSlot]: true } as Partial<Record<TimeOfDay, boolean>>;
            const newExpandedSlots: ExpandedSlots = {
                mandatory: slotState,
                suggested: slotState,
                radar: slotState,
                backlog: slotState,
            };
            updateState({ expandedSlots: newExpandedSlots });
            saveViewPrefs({ ..._latestPrefs, expandedSlots: newExpandedSlots, lastActiveMs: Date.now() });
        };

        function updatePrefs(update: Partial<Omit<ViewPrefs, 'lastActiveMs'>>): void {
            updateState(update);
            saveViewPrefs({ ..._latestPrefs, ...update, lastActiveMs: Date.now() });
            _latestPrefs = { ..._latestPrefs, ...update, lastActiveMs: Date.now() };
        }

        function toggleSlot(band: DailyBand, slot: TimeOfDay): void {
            const bandSlots = state.expandedSlots[band] ?? {};
            const newExpandedSlots: ExpandedSlots = {
                ...state.expandedSlots,
                [band]: { ...bandSlots, [slot]: !bandSlots[slot] },
            };
            updatePrefs({ expandedSlots: newExpandedSlots });
        }

        function collapseAll(): void {
            updatePrefs({
                expandMandatory: false,
                expandSuggested: false,
                expandRadar: false,
                expandBacklog: false,
                expandedSlots: { mandatory: {}, suggested: {}, radar: {}, backlog: {} },
            });
        }

        const today = new Date();
        const areasById = new Map(inputs.areas.map((p) => [p.id, p]));

        // Bucket tasks by band, ignoring hidden ones.
        const bands: Record<DailyBand, Task[]> = {
            mandatory: [],
            suggested: [],
            radar: [],
            backlog: [],
            hidden: [],
        };
        for (const task of inputs.tasks) {
            const band = getDailyBand(task, today);
            bands[band].push(task);
        }

        // E1: Auto-collapse mandatory and expand suggested when mandatory becomes empty.
        if (bands.mandatory.length === 0 && state.expandMandatory) {
            queueMicrotask(() => updatePrefs({ expandMandatory: false, expandSuggested: true }));
        }

        const renderTaskList = (tasks: Task[], band?: DailyBand) => html`
            <div class="task-list">
                ${tasks.map(
                    (t) => html`
                    <div
                        class="task-drag-wrapper ${state.draggedId === t.id ? "is-dragging" : ""} ${state.dragOverId === t.id ? "is-drag-over" : ""}"
                        draggable="true"
                        @dragstart=${(e: DragEvent) => {
                            e.dataTransfer?.setData("text/plain", t.id);
                            updateState({ draggedId: t.id });
                        }}
                        @dragover=${(e: DragEvent) => {
                            e.preventDefault();
                            if (
                                state.draggedId &&
                                state.draggedId !== t.id &&
                                tasks.some((x) => x.id === state.draggedId)
                            ) {
                                updateState({ dragOverId: t.id });
                            }
                        }}
                        @dragleave=${() => {
                            if (state.dragOverId === t.id)
                                updateState({ dragOverId: null });
                        }}
                        @drop=${(e: DragEvent) => {
                            e.preventDefault();
                            const fromId =
                                e.dataTransfer?.getData("text/plain") ??
                                state.draggedId;
                            if (
                                fromId &&
                                fromId !== t.id &&
                                tasks.some((x) => x.id === fromId)
                            ) {
                                dispatch(
                                    new events.tasksReordered(
                                        reorderBefore(tasks, fromId, t.id).map(
                                            (x) => x.id,
                                        ),
                                    ),
                                );
                            }
                            updateState({ draggedId: null, dragOverId: null });
                        }}
                        @dragend=${() => updateState({ draggedId: null, dragOverId: null })}
                    >
                        <${TaskItemElement.assign({
                            task: t,
                            areaName: t.areaId
                                ? areasById.get(t.areaId)?.name
                                : undefined,
                            showDragHandle: true,
                            activeSkinId: inputs.activeSkinId,
                            band,
                        })}
                            ${listen(TaskItemElement.events.completed, (e) =>
                                dispatch(new events.taskCompleted(e.detail)),
                            )}
                            ${listen(TaskItemElement.events.snoozed, (e) =>
                                dispatch(new events.taskSnoozed(e.detail)),
                            )}
                            ${listen(TaskItemElement.events.unSnoozed, (e) =>
                                dispatch(new events.taskUnSnoozed(e.detail)),
                            )}
                            ${listen(TaskItemElement.events.skipped, (e) =>
                                dispatch(new events.taskSkipped(e.detail)),
                            )}
                            ${listen(TaskItemElement.events.notToday, (e) =>
                                dispatch(new events.taskNotToday(e.detail)),
                            )}
                            ${listen(
                                TaskItemElement.events.progressLogged,
                                (e) =>
                                    dispatch(
                                        new events.taskProgressLogged(e.detail),
                                    ),
                            )}
                            ${listen(
                                TaskItemElement.events.editRequested,
                                (e) =>
                                    dispatch(
                                        new events.taskEditRequested(e.detail),
                                    ),
                            )}
                        ></${TaskItemElement}>
                    </div>
                `,
                )}
                <div
                    class="drop-zone-end ${state.dragOverId === "__end__" &&
                    tasks.some((x) => x.id === state.draggedId)
                        ? "is-drag-over"
                        : ""}"
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        if (
                            state.draggedId &&
                            tasks.some((x) => x.id === state.draggedId)
                        ) {
                            updateState({ dragOverId: "__end__" });
                        }
                    }}
                    @dragleave=${() => {
                        if (state.dragOverId === "__end__")
                            updateState({ dragOverId: null });
                    }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        const fromId =
                            e.dataTransfer?.getData("text/plain") ??
                            state.draggedId;
                        if (fromId && tasks.some((x) => x.id === fromId)) {
                            dispatch(
                                new events.tasksReordered(
                                    moveToEnd(tasks, fromId).map((x) => x.id),
                                ),
                            );
                        }
                        updateState({ draggedId: null, dragOverId: null });
                    }}
                ></div>
            </div>
        `;

        const renderTasksGrouped = (tasks: Task[], band?: DailyBand) => {
            const slotGroups = TIME_OF_DAY_SLOTS.map((slot: TimeOfDay) => ({
                slot,
                tasks: tasks.filter((t) => (t.timeOfDay ?? "anytime") === slot),
            })).filter((g) => g.tasks.length > 0);

            if (slotGroups.length <= 1) return renderTaskList(tasks, band);

            return html`
                ${slotGroups.map((g) => {
                    const bandSlots = band ? (state.expandedSlots[band] ?? {}) : {};
                    const isExpanded = !!bandSlots[g.slot];
                    return html`
                        <div class="time-group">
                            <button
                                class="time-group-header"
                                @click=${() => band ? toggleSlot(band, g.slot) : undefined}
                            >
                                <span class="time-group-label"
                                    >${timeOfDayLabel(g.slot)}</span
                                >
                                <span class="time-group-count"
                                    >${g.tasks.length}</span
                                >
                                <span class="time-group-chevron"
                                    >${isExpanded ? "▾" : "▸"}</span
                                >
                            </button>
                            ${isExpanded ? renderTaskList(g.tasks, band) : html``}
                        </div>
                    `;
                })}
            `;
        };

        // 'hidden' is a valid DailyBand but is never rendered; return empty strings for it.
        const skinBand = (band: DailyBand) => {
            if (band === "hidden")
                return { label: "", subtitle: "", empty: "" };
            return skin.bands[band];
        };

        const renderBand = (
            band: DailyBand,
            opts?: {
                emptyMessage?: string;
                collapsible?: boolean;
                /** When true, this band is collapsed regardless of task count. Otherwise it only collapses past COLLAPSE_THRESHOLD. */
                alwaysCollapse?: boolean;
                expanded?: boolean;
                onToggle?: () => void;
            },
        ) => {
            const tasks = bands[band];
            const overThreshold = tasks.length > COLLAPSE_THRESHOLD;
            const isCollapsible = !!(
                opts?.collapsible &&
                (opts.alwaysCollapse ||
                    overThreshold ||
                    opts.expanded !== undefined)
            );
            const isExpanded = opts?.expanded ?? true;

            return html`
                <section class="band">
                    <div
                        class="band-header ${band} ${isCollapsible
                            ? "collapsible"
                            : ""}"
                        @click=${isCollapsible
                            ? (opts?.onToggle ?? (() => {}))
                            : null}
                    >
                        <div>
                            <div class="band-title">
                                ${skinBand(band).label}
                            </div>
                            <div class="band-subtitle">
                                ${skinBand(band).subtitle}
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="band-count">${tasks.length}</span>
                            ${isCollapsible
                                ? html`<span class="band-chevron"
                                      >${isExpanded ? "▾" : "▸"}</span
                                  >`
                                : html``}
                        </div>
                    </div>

                    ${!isExpanded
                        ? html``
                        : tasks.length === 0
                          ? opts?.emptyMessage
                              ? html`<div class="band-empty">
                                    ${opts.emptyMessage}
                                </div>`
                              : html``
                          : html`${renderTasksGrouped(tasks, band)}`}
                </section>
            `;
        };

        const mergedTasks = [...bands.mandatory, ...bands.suggested];

        return html`
            <div class="view-controls">
                <button
                    class="merge-toggle-btn ${state.mergedView ? 'active' : ''}"
                    @click=${() => updatePrefs({ mergedView: !state.mergedView })}
                    title="Merge mandatory and suggested into one list"
                >MERGE VIEW</button>
                <button
                    class="collapse-all-btn"
                    @click=${collapseAll}
                >COLLAPSE ALL</button>
            </div>

            ${state.mergedView
                ? html`
                    <section class="band">
                        <div class="merged-band-header">
                            <div class="merged-band-title">TODAY</div>
                            <span class="merged-band-count">${mergedTasks.length}</span>
                        </div>
                        ${mergedTasks.length === 0
                            ? html`<div class="band-empty">${skinBand("mandatory").empty}</div>`
                            : html`${renderTasksGrouped(mergedTasks, 'mandatory')}`}
                    </section>
                `
                : html`
                    ${renderBand("mandatory", {
                        emptyMessage: skinBand("mandatory").empty,
                        collapsible: true,
                        alwaysCollapse: true,
                        expanded: state.expandMandatory,
                        onToggle: () =>
                            updatePrefs({ expandMandatory: !state.expandMandatory }),
                    })}
                    ${renderBand("suggested", {
                        collapsible: true,
                        alwaysCollapse: true,
                        expanded: state.expandSuggested,
                        onToggle: () =>
                            updatePrefs({ expandSuggested: !state.expandSuggested }),
                    })}
                `}
            ${renderBand("radar", {
                collapsible: true,
                alwaysCollapse: true,
                expanded: state.expandRadar,
                onToggle: () =>
                    updatePrefs({ expandRadar: !state.expandRadar }),
            })}
            ${renderBand("backlog", {
                collapsible: true,
                alwaysCollapse: true,
                expanded: state.expandBacklog,
                onToggle: () =>
                    updatePrefs({ expandBacklog: !state.expandBacklog }),
            })}

            <button
                class="file-directive-btn"
                @click=${() => dispatch(new events.newTaskRequested())}
            >
                ${skin.actions.makeCommitmentCta}
            </button>
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
