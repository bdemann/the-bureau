import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {ViraButton, ViraColorVariant, ViraEmphasis, ViraSize} from 'vira';
import type {DailyBand, Project, Task, TimeOfDay} from '../data/types.js';
import {TIME_OF_DAY_SLOTS, timeOfDayLabel} from '../data/types.js';
import {bandLabel, bandSubtitle, getDailyBand} from '../data/urgency.js';
import {TaskItemElement} from './task-item.element.js';


// ─────────────────────────────────────────────────────────────────────────────
// DailyViewElement
// Cross-project landing view: every visible task, sorted into urgency bands.
// State is owned by the parent (bureau-app); this element only renders.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 5;

// ── Time-of-day slot helpers ─────────────────────────────────────────────────

function getCurrentTimeSlot(): TimeOfDay {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'bedtime'; // 21:00–04:59
}

// The visibility-change callback is updated on every render so it always
// closes over the latest updateState. Only fires when the tab returns from
// background AND the time slot has changed since it was hidden — that's the
// "came back later" signal. Active use never hides the page, so it never fires.
let _onSlotChange: ((slot: TimeOfDay) => void) | null = null;

{
    let slotWhenHidden: TimeOfDay | null = null;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            slotWhenHidden = getCurrentTimeSlot();
        } else if (slotWhenHidden !== null) {
            const current = getCurrentTimeSlot();
            if (current !== slotWhenHidden) _onSlotChange?.(current);
            slotWhenHidden = null;
        }
    });
}

export const DailyViewElement = defineElement<{
    tasks: ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
}>()({
    tagName: 'daily-view',

    events: {
        taskCompleted:      defineElementEvent<string>(),
        taskSnoozed:        defineElementEvent<string>(),
        taskUnSnoozed:      defineElementEvent<string>(),
        taskSkipped:        defineElementEvent<string>(),
        taskProgressLogged: defineElementEvent<string>(),
        taskEditRequested:  defineElementEvent<string>(),
        newTaskRequested:   defineElementEvent<void>(),
        tasksReordered:     defineElementEvent<ReadonlyArray<string>>(),  // ordered task ids
    },

    state: () => ({
        expandRadar:   false,
        expandBacklog: false,
        expandedSlots: {[getCurrentTimeSlot()]: true} as Partial<Record<TimeOfDay, boolean>>,
        draggedId: null as string | null,
        dragOverId: null as string | null,
    }),

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
            align-items: baseline;
            gap: 12px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(0,0,0,0.15);
        }
        .band-header.mandatory  { border-bottom-color: #C41E3A; }
        .band-header.suggested  { border-bottom-color: #E8821A; }
        .band-header.radar      { border-bottom-color: #B8860B; }
        .band-header.backlog    { border-bottom-color: rgba(0,0,0,0.2); }

        .band-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            letter-spacing: 0.18em;
            color: #1B2A4A;
        }
        .band-header.mandatory .band-title { color: #C41E3A; }
        .band-header.suggested .band-title { color: #7A3000; }

        .band-subtitle {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
            color: #6B6B6B;
            letter-spacing: 0.05em;
        }

        .band-count {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
            color: #6B6B6B;
        }

        .band-empty {
            font-family: 'Special Elite', serif;
            font-size: 0.85rem;
            color: #6B6B6B;
            padding: 14px 8px;
            background: rgba(255,253,247,0.6);
            border: 1px dashed rgba(0,0,0,0.15);
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
            border-bottom: 1px dotted rgba(0,0,0,0.18);
            padding: 0 0 4px;
            margin-bottom: 6px;
            cursor: pointer;
            font-family: 'Courier Prime', monospace;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #6B6B6B;
            text-align: left;
        }

        @media (hover: hover) {
            .time-group-header:hover { color: #2C2C2C; }
        }

        .time-group-label { flex: 1; }

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

        .task-drag-wrapper { position: relative; }
        .task-drag-wrapper.is-dragging { opacity: 0.35; }
        .task-drag-wrapper.is-drag-over::before {
            content: '';
            display: block;
            height: 2px;
            background: #1B2A4A;
            margin-bottom: 1px;
        }
        .drop-zone-end { height: 20px; }
        .drop-zone-end.is-drag-over { border-top: 2px solid #1B2A4A; }

        .file-directive-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin-top: 8px;
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
        .file-directive-btn:hover { background: #2A3F6F; }

    `,

    render({inputs, state, updateState, dispatch, events}) {
        // Keep the callback current every render so it captures the latest updateState.
        _onSlotChange = (newSlot: TimeOfDay) => {
            updateState({expandedSlots: {[newSlot]: true}});
        };

        function toggleSlot(slot: TimeOfDay): void {
            updateState({expandedSlots: {...state.expandedSlots, [slot]: !state.expandedSlots[slot]}});
        }

        const today = new Date();
        const projectsById = new Map(inputs.projects.map(p => [p.id, p]));

        // Bucket tasks by band, ignoring hidden ones.
        const bands: Record<DailyBand, Task[]> = {
            mandatory: [],
            suggested: [],
            radar:     [],
            backlog:   [],
            hidden:    [],
        };
        for (const task of inputs.tasks) {
            const band = getDailyBand(task, today);
            bands[band].push(task);
        }

        const renderTaskList = (tasks: Task[]) => html`
            <div class="task-list">
                ${tasks.map(t => html`
                    <div
                        class="task-drag-wrapper ${state.draggedId === t.id ? 'is-dragging' : ''} ${state.dragOverId === t.id ? 'is-drag-over' : ''}"
                        draggable="true"
                        @dragstart=${(e: DragEvent) => {
                            e.dataTransfer?.setData('text/plain', t.id);
                            updateState({draggedId: t.id});
                        }}
                        @dragover=${(e: DragEvent) => {
                            e.preventDefault();
                            if (state.draggedId && state.draggedId !== t.id
                                    && tasks.some(x => x.id === state.draggedId)) {
                                updateState({dragOverId: t.id});
                            }
                        }}
                        @dragleave=${() => {
                            if (state.dragOverId === t.id) updateState({dragOverId: null});
                        }}
                        @drop=${(e: DragEvent) => {
                            e.preventDefault();
                            const fromId = e.dataTransfer?.getData('text/plain') ?? state.draggedId;
                            if (fromId && fromId !== t.id && tasks.some(x => x.id === fromId)) {
                                dispatch(new events.tasksReordered(
                                    reorderBefore(tasks, fromId, t.id).map(x => x.id)
                                ));
                            }
                            updateState({draggedId: null, dragOverId: null});
                        }}
                        @dragend=${() => updateState({draggedId: null, dragOverId: null})}
                    >
                        <${TaskItemElement.assign({
                            task: t,
                            projectName: t.projectId ? projectsById.get(t.projectId)?.name : undefined,
                            showDragHandle: true,
                        })}
                            ${listen(TaskItemElement.events.completed, e =>
                                dispatch(new events.taskCompleted(e.detail)))}
                            ${listen(TaskItemElement.events.snoozed, e =>
                                dispatch(new events.taskSnoozed(e.detail)))}
                            ${listen(TaskItemElement.events.unSnoozed, e =>
                                dispatch(new events.taskUnSnoozed(e.detail)))}
                            ${listen(TaskItemElement.events.skipped, e =>
                                dispatch(new events.taskSkipped(e.detail)))}
                            ${listen(TaskItemElement.events.progressLogged, e =>
                                dispatch(new events.taskProgressLogged(e.detail)))}
                            ${listen(TaskItemElement.events.editRequested, e =>
                                dispatch(new events.taskEditRequested(e.detail)))}
                        ></${TaskItemElement}>
                    </div>
                `)}
                <div
                    class="drop-zone-end ${state.dragOverId === '__end__' && tasks.some(x => x.id === state.draggedId) ? 'is-drag-over' : ''}"
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        if (state.draggedId && tasks.some(x => x.id === state.draggedId)) {
                            updateState({dragOverId: '__end__'});
                        }
                    }}
                    @dragleave=${() => {
                        if (state.dragOverId === '__end__') updateState({dragOverId: null});
                    }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer?.getData('text/plain') ?? state.draggedId;
                        if (fromId && tasks.some(x => x.id === fromId)) {
                            dispatch(new events.tasksReordered(
                                moveToEnd(tasks, fromId).map(x => x.id)
                            ));
                        }
                        updateState({draggedId: null, dragOverId: null});
                    }}
                ></div>
            </div>
        `;

        const renderTasksGrouped = (tasks: Task[]) => {
            const slotGroups = TIME_OF_DAY_SLOTS
                .map((slot: TimeOfDay) => ({
                    slot,
                    tasks: tasks.filter(t => (t.timeOfDay ?? 'anytime') === slot),
                }))
                .filter(g => g.tasks.length > 0);

            if (slotGroups.length <= 1) return renderTaskList(tasks);

            return html`
                ${slotGroups.map(g => {
                    const isExpanded = !!state.expandedSlots[g.slot];
                    return html`
                        <div class="time-group">
                            <button
                                class="time-group-header"
                                @click=${() => toggleSlot(g.slot)}
                            >
                                <span class="time-group-label">${timeOfDayLabel(g.slot)}</span>
                                <span class="time-group-count">${g.tasks.length}</span>
                                <span class="time-group-chevron">${isExpanded ? '▾' : '▸'}</span>
                            </button>
                            ${isExpanded ? renderTaskList(g.tasks) : html``}
                        </div>
                    `;
                })}
            `;
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
            const showCollapsed =
                opts?.collapsible
                && (opts.alwaysCollapse || overThreshold)
                && !opts.expanded;

            return html`
                <section class="band">
                    <div class="band-header ${band}">
                        <div>
                            <div class="band-title">${bandLabel(band)}</div>
                            <div class="band-subtitle">${bandSubtitle(band)}</div>
                        </div>
                        <div class="band-count">${tasks.length}</div>
                    </div>

                    ${tasks.length === 0
                        ? opts?.emptyMessage
                            ? html`<div class="band-empty">${opts.emptyMessage}</div>`
                            : html``
                        : showCollapsed
                            ? html`
                                <div class="collapse-toggle">
                                    <${ViraButton.assign({
                                        text: `Show ${tasks.length}`,
                                        color: ViraColorVariant.Neutral,
                                        buttonEmphasis: ViraEmphasis.Subtle,
                                        buttonSize: ViraSize.Small,
                                    })}
                                        @click=${opts?.onToggle ?? (() => {})}
                                    ></${ViraButton}>
                                </div>
                              `
                            : html`
                                ${renderTasksGrouped(tasks)}
                                ${opts?.collapsible && opts.expanded
                                    ? html`
                                        <div class="collapse-toggle">
                                            <${ViraButton.assign({
                                                text: 'Hide',
                                                color: ViraColorVariant.Neutral,
                                                buttonEmphasis: ViraEmphasis.Subtle,
                                                buttonSize: ViraSize.Small,
                                            })}
                                                @click=${opts?.onToggle ?? (() => {})}
                                            ></${ViraButton}>
                                        </div>
                                      `
                                    : html``}
                              `}
                </section>
            `;
        };

        return html`
            ${renderBand('mandatory', {
                emptyMessage: 'No mandatory tasks today. Agent Whitaker approves.',
            })}
            ${renderBand('suggested')}
            ${renderBand('radar', {
                collapsible: true,
                expanded: state.expandRadar,
                onToggle: () => updateState({expandRadar: !state.expandRadar}),
            })}
            ${renderBand('backlog', {
                collapsible: true,
                alwaysCollapse: true,
                expanded: state.expandBacklog,
                onToggle: () => updateState({expandBacklog: !state.expandBacklog}),
            })}

            <button
                class="file-directive-btn"
                @click=${() => dispatch(new events.newTaskRequested())}
            >+ FILE DIRECTIVE</button>
        `;
    },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function reorderBefore<T extends {id: string}>(list: ReadonlyArray<T>, fromId: string, toId: string): T[] {
    const item = list.find(t => t.id === fromId);
    if (!item) return [...list];
    const rest = list.filter(t => t.id !== fromId);
    const idx = rest.findIndex(t => t.id === toId);
    if (idx === -1) return [...list];
    rest.splice(idx, 0, item);
    return rest;
}

function moveToEnd<T extends {id: string}>(list: ReadonlyArray<T>, fromId: string): T[] {
    const item = list.find(t => t.id === fromId);
    if (!item) return [...list];
    return [...list.filter(t => t.id !== fromId), item];
}
