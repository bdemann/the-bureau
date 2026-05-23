import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {Goal, GoalStatus, Idea, Project, Task} from '../data/types.js';
import {generateId} from '../data/storage.js';

// ─────────────────────────────────────────────────────────────────────────────
// GoalsViewElement
// Strategic Objectives: long-horizon outcomes scoped to an operation, with
// linked directives and manual status (active / achieved / abandoned).
//
// When filterProjectId is set the view shows only goals for that operation
// and hides the project selector (used from project-detail). When absent the
// global view shows all goals with an operation badge on each card.
// ─────────────────────────────────────────────────────────────────────────────

function msToDateString(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateString(s: string): number | null {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d.getTime();
}

function fmtDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

function sortByTargetDate(goals: Goal[]): Goal[] {
    return goals.sort((a, b) => {
        if (a.targetDate !== null && b.targetDate !== null) return a.targetDate - b.targetDate;
        if (a.targetDate !== null) return -1;
        if (b.targetDate !== null) return 1;
        return b.createdAt - a.createdAt;
    });
}

export const GoalsViewElement = defineElement<{
    goals: ReadonlyArray<Goal>;
    tasks: ReadonlyArray<Task>;
    ideas: ReadonlyArray<Idea>;
    projects: ReadonlyArray<Project>;
    /** When set, only show goals for this project and hide the project selector. */
    filterProjectId?: string | null;
    /** Increment to programmatically open the add form (e.g. from a type picker). */
    openFormTrigger?: number;
}>()({
    tagName: 'goals-view',

    events: {
        goalAdded:              defineElementEvent<Goal>(),
        goalUpdated:            defineElementEvent<Goal>(),
        goalDeleted:            defineElementEvent<string>(),
        spawnRequested:         defineElementEvent<string>(),       // goal id
        unlinkRequested:        defineElementEvent<{goalId: string; taskId: string}>(),
        ideaUnlinkFromGoal:     defineElementEvent<string>(),       // idea id → set goalId = null
        promoteIdeaRequested:   defineElementEvent<Idea>(),
    },

    state: () => ({
        formOpen:             false,
        editingId:            null as string | null,
        formTitle:            '',
        formDesc:             '',
        formTargetDate:       '',
        formProjectId:        null as string | null,
        confirmDeleteId:      null as string | null,
        lastOpenFormTrigger:  0,
    }),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

        /* When embedded inside project-detail, reduce padding */
        :host([data-embedded]) {
            padding: 0 0 24px;
        }

        .page-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.4rem;
            letter-spacing: 0.25em;
            color: #1B2A4A;
            margin-bottom: 4px;
        }

        .page-subtitle {
            font-family: 'Courier Prime', monospace;
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: #6B6B6B;
            margin-bottom: 24px;
        }

        .section-header {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.85rem;
            letter-spacing: 0.2em;
            color: #6B6B6B;
            border-bottom: 1px solid rgba(0,0,0,0.12);
            padding-bottom: 4px;
            margin-bottom: 10px;
            margin-top: 24px;
        }

        .form-card {
            background: #fff;
            border: 1px solid rgba(0,0,0,0.12);
            border-top: 3px solid #1B2A4A;
            padding: 14px;
            margin-bottom: 20px;
        }

        .form-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.9rem;
            letter-spacing: 0.15em;
            color: #1B2A4A;
            margin-bottom: 12px;
        }

        .field { margin-bottom: 10px; }

        .field-label {
            display: block;
            font-size: 0.62rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #6B6B6B;
            margin-bottom: 4px;
            font-family: 'Courier Prime', monospace;
        }

        input[type="text"],
        input[type="date"],
        textarea,
        select {
            width: 100%;
            border: 1px solid rgba(0,0,0,0.18);
            background: #F5EFE0;
            padding: 7px 9px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.85rem;
            color: #1B2A4A;
            box-sizing: border-box;
        }

        textarea { resize: vertical; min-height: 60px; }

        .form-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .btn {
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.12em;
            font-size: 0.85rem;
            padding: 7px 16px;
            border: none;
            cursor: pointer;
        }

        .btn-primary   { background: #1B2A4A; color: #F5EFE0; }
        .btn-primary:hover { background: #243a63; }
        .btn-ghost     { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: #1B2A4A; }
        .btn-ghost:hover { background: rgba(0,0,0,0.05); }
        .btn-danger    { background: #C41E3A; color: #F5EFE0; }
        .btn-danger:hover { background: #a31830; }

        .file-btn {
            width: 100%;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.9rem;
            letter-spacing: 0.15em;
            padding: 10px;
            background: transparent;
            border: 1.5px dashed rgba(0,0,0,0.25);
            color: #6B6B6B;
            cursor: pointer;
            margin-bottom: 20px;
            text-align: center;
        }
        .file-btn:hover { border-color: #1B2A4A; color: #1B2A4A; }

        .empty {
            font-family: 'Courier Prime', monospace;
            font-size: 0.8rem;
            color: #6B6B6B;
            text-align: center;
            padding: 24px 0;
        }

        .goal-card {
            background: #fff;
            border: 1px solid rgba(0,0,0,0.1);
            border-left: 4px solid #1B2A4A;
            padding: 12px 14px;
            margin-bottom: 12px;
        }

        .goal-card.achieved { border-left-color: #2E7D32; opacity: 0.85; }
        .goal-card.abandoned { border-left-color: #9E9E9E; opacity: 0.7; }
        .goal-card.editing  { border-left-color: #B8860B; }

        .goal-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            letter-spacing: 0.1em;
            color: #1B2A4A;
        }

        .goal-desc {
            font-family: 'Courier Prime', monospace;
            font-size: 0.78rem;
            color: #444;
            margin-top: 4px;
            white-space: pre-wrap;
        }

        .goal-meta {
            font-family: 'Courier Prime', monospace;
            font-size: 0.65rem;
            letter-spacing: 0.06em;
            color: #6B6B6B;
            margin-top: 6px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
        }

        .target-date { color: #B8860B; }
        .target-date.overdue { color: #C41E3A; }

        .status-badge {
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.1em;
        }
        .status-badge.achieved { color: #2E7D32; }
        .status-badge.abandoned { color: #9E9E9E; }

        .project-badge {
            display: inline-block;
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 2px 6px;
            border: 1px solid rgba(0,0,0,0.15);
            color: #6B6B6B;
        }

        .linked-section { margin-top: 10px; }

        .linked-label {
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #6B6B6B;
            margin-bottom: 4px;
        }

        .linked-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .linked-chip {
            font-family: 'Courier Prime', monospace;
            font-size: 0.72rem;
            padding: 2px 6px 2px 8px;
            background: rgba(27,42,74,0.07);
            border: 1px solid rgba(27,42,74,0.15);
            color: #1B2A4A;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .unlink-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #9E9E9E;
            font-size: 0.75rem;
            padding: 0 2px;
            line-height: 1;
        }
        .unlink-btn:hover { color: #C41E3A; }

        .idea-chip {
            font-family: 'Courier Prime', monospace;
            font-size: 0.72rem;
            padding: 2px 6px 2px 8px;
            background: rgba(184,134,11,0.07);
            border: 1px solid rgba(184,134,11,0.25);
            color: #6B5300;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .idea-chip-promote {
            background: none;
            border: none;
            cursor: pointer;
            color: #B8860B;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.65rem;
            letter-spacing: 0.08em;
            padding: 0 2px;
            line-height: 1;
        }
        .idea-chip-promote:hover { color: #1B2A4A; }

        .linked-empty {
            font-family: 'Courier Prime', monospace;
            font-size: 0.72rem;
            color: #9E9E9E;
            font-style: italic;
        }

        .goal-actions {
            display: flex;
            gap: 6px;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        .action-btn {
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.1em;
            font-size: 0.72rem;
            padding: 4px 10px;
            border: none;
            cursor: pointer;
        }

        .action-spawn      { background: #1B2A4A; color: #F5EFE0; }
        .action-spawn:hover { background: #243a63; }
        .action-achieve    { background: #2E7D32; color: #fff; }
        .action-achieve:hover { background: #245826; }
        .action-abandon    { background: transparent; border: 1px solid #9E9E9E; color: #6B6B6B; }
        .action-abandon:hover { background: rgba(0,0,0,0.05); }
        .action-reactivate { background: transparent; border: 1px solid #1B2A4A; color: #1B2A4A; }
        .action-reactivate:hover { background: rgba(27,42,74,0.05); }
        .action-edit       { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: #1B2A4A; }
        .action-edit:hover { background: rgba(0,0,0,0.05); }
        .action-delete     { background: transparent; border: 1px solid #C41E3A; color: #C41E3A; }
        .action-delete:hover { background: rgba(196,30,58,0.08); }

        .confirm-delete {
            font-family: 'Courier Prime', monospace;
            font-size: 0.75rem;
            color: #C41E3A;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {goals, tasks, projects} = inputs;
        const filterProjectId = inputs.filterProjectId ?? null;
        const isFiltered = filterProjectId !== null;
        const now = Date.now();

        const visibleGoals = isFiltered
            ? goals.filter(g => g.projectId === filterProjectId)
            : [...goals];

        function taskTitle(id: string): string {
            return tasks.find(t => t.id === id)?.title ?? '(deleted commitment)';
        }

        function projectName(id: string | null): string | null {
            if (!id) return null;
            return projects.find(p => p.id === id)?.name ?? null;
        }

        if (inputs.openFormTrigger !== undefined
                && inputs.openFormTrigger !== state.lastOpenFormTrigger) {
            updateState({lastOpenFormTrigger: inputs.openFormTrigger});
            openAddForm();
        }

        function openAddForm(): void {
            updateState({
                formOpen: true,
                editingId: null,
                formTitle: '',
                formDesc: '',
                formTargetDate: '',
                formProjectId: filterProjectId,
                confirmDeleteId: null,
            });
        }

        function openEditForm(goal: Goal): void {
            updateState({
                formOpen: true,
                editingId: goal.id,
                formTitle: goal.title,
                formDesc: goal.description,
                formTargetDate: goal.targetDate ? msToDateString(goal.targetDate) : '',
                formProjectId: goal.projectId,
                confirmDeleteId: null,
            });
        }

        function closeForm(): void {
            updateState({formOpen: false, editingId: null});
        }

        function submitForm(): void {
            const title = state.formTitle.trim();
            if (!title) return;
            const targetDate = parseDateString(state.formTargetDate);
            if (state.editingId) {
                const existing = goals.find(g => g.id === state.editingId)!;
                dispatch(new events.goalUpdated({
                    ...existing,
                    title,
                    description: state.formDesc.trim(),
                    targetDate,
                    projectId: state.formProjectId,
                }));
            } else {
                dispatch(new events.goalAdded({
                    id: generateId(),
                    projectId: state.formProjectId,
                    title,
                    description: state.formDesc.trim(),
                    status: 'active',
                    targetDate,
                    linkedTaskIds: [],
                    createdAt: Date.now(),
                }));
            }
            closeForm();
        }

        function setStatus(goal: Goal, status: GoalStatus): void {
            dispatch(new events.goalUpdated({...goal, status}));
        }

        const active    = sortByTargetDate(visibleGoals.filter(g => g.status === 'active'));
        const achieved  = sortByTargetDate(visibleGoals.filter(g => g.status === 'achieved'));
        const abandoned = sortByTargetDate(visibleGoals.filter(g => g.status === 'abandoned'));

        function renderForm(label: string) {
            return html`
                <div class="form-card">
                    <div class="form-title">${label}</div>
                    <div class="field">
                        <label class="field-label">Title</label>
                        <input
                            type="text"
                            placeholder="Objective designation…"
                            .value=${state.formTitle}
                            @input=${(e: Event) =>
                                updateState({formTitle: (e.target as HTMLInputElement).value})}
                        />
                    </div>
                    <div class="field">
                        <label class="field-label">Description (optional)</label>
                        <textarea
                            placeholder="Scope, success criteria, context…"
                            .value=${state.formDesc}
                            @input=${(e: Event) =>
                                updateState({formDesc: (e.target as HTMLTextAreaElement).value})}
                        ></textarea>
                    </div>
                    <div class="field">
                        <label class="field-label">Target Date (optional)</label>
                        <input
                            type="date"
                            .value=${state.formTargetDate}
                            @change=${(e: Event) =>
                                updateState({formTargetDate: (e.target as HTMLInputElement).value})}
                        />
                    </div>
                    ${!isFiltered ? html`
                        <div class="field">
                            <label class="field-label">Area of Responsibility</label>
                            <select
                                @change=${(e: Event) => {
                                    const val = (e.target as HTMLSelectElement).value;
                                    updateState({formProjectId: val || null});
                                }}
                            >
                                <option value="" ?selected=${state.formProjectId === null}>— None —</option>
                                ${projects.map(p => html`
                                    <option value=${p.id} ?selected=${state.formProjectId === p.id}>${p.name}</option>
                                `)}
                            </select>
                        </div>
                    ` : html``}
                    <div class="form-actions">
                        <button class="btn btn-primary" @click=${submitForm}>FILE</button>
                        <button class="btn btn-ghost" @click=${closeForm}>CANCEL</button>
                    </div>
                </div>
            `;
        }

        function renderGoalCard(goal: Goal) {
            const isEditing     = state.formOpen && state.editingId === goal.id;
            const confirmingDel = state.confirmDeleteId === goal.id;
            const isActive      = goal.status === 'active';
            const dateOverdue   = goal.targetDate !== null && goal.targetDate < now && isActive;
            const opName        = !isFiltered ? projectName(goal.projectId) : null;
            const linkedIdeas   = inputs.ideas.filter(i => i.goalId === goal.id);

            return html`
                <div class=${'goal-card ' + goal.status + (isEditing ? ' editing' : '')}>
                    ${isEditing
                        ? renderForm('EDIT GOAL')
                        : html`
                            <div class="goal-title">${goal.title}</div>
                            ${goal.description
                                ? html`<div class="goal-desc">${goal.description}</div>`
                                : html``}
                            <div class="goal-meta">
                                ${goal.targetDate
                                    ? html`<span class=${'target-date' + (dateOverdue ? ' overdue' : '')}>
                                            ⊙ Target: ${fmtDate(goal.targetDate)}${dateOverdue ? ' · OVERDUE' : ''}
                                          </span>`
                                    : html``}
                                ${!isActive
                                    ? html`<span class=${'status-badge ' + goal.status}>
                                            ${goal.status === 'achieved' ? '✓ Achieved' : '✕ Abandoned'}
                                          </span>`
                                    : html``}
                                ${opName
                                    ? html`<span class="project-badge">⊙ ${opName}</span>`
                                    : html``}
                            </div>

                            <div class="linked-section">
                                <div class="linked-label">Linked Commitments</div>
                                ${goal.linkedTaskIds.length > 0
                                    ? html`
                                        <div class="linked-chips">
                                            ${goal.linkedTaskIds.map(tid => html`
                                                <span class="linked-chip">
                                                    ${taskTitle(tid)}
                                                    <button
                                                        class="unlink-btn"
                                                        title="Unlink commitment"
                                                        @click=${() => dispatch(new events.unlinkRequested({goalId: goal.id, taskId: tid}))}
                                                    >×</button>
                                                </span>
                                            `)}
                                        </div>
                                      `
                                    : html`<div class="linked-empty">No commitments linked yet.</div>`}
                            </div>

                            <div class="linked-section">
                                <div class="linked-label">Linked Intelligence</div>
                                ${linkedIdeas.length > 0
                                    ? html`
                                        <div class="linked-chips">
                                            ${linkedIdeas.map(idea => html`
                                                <span class="idea-chip">
                                                    ${idea.title}
                                                    <button
                                                        class="idea-chip-promote"
                                                        title="Promote to commitment"
                                                        @click=${() => dispatch(new events.promoteIdeaRequested(idea))}
                                                    >↑</button>
                                                    <button
                                                        class="unlink-btn"
                                                        title="Unlink intelligence"
                                                        @click=${() => dispatch(new events.ideaUnlinkFromGoal(idea.id))}
                                                    >×</button>
                                                </span>
                                            `)}
                                        </div>
                                      `
                                    : html`<div class="linked-empty">No intelligence linked yet.</div>`}
                            </div>

                            <div class="goal-actions">
                                ${isActive
                                    ? html`
                                        <button
                                            class="action-btn action-spawn"
                                            @click=${() => dispatch(new events.spawnRequested(goal.id))}
                                        >+ SPAWN COMMITMENT</button>
                                        <button
                                            class="action-btn action-achieve"
                                            @click=${() => setStatus(goal, 'achieved')}
                                        >MARK ACHIEVED</button>
                                        <button
                                            class="action-btn action-abandon"
                                            @click=${() => setStatus(goal, 'abandoned')}
                                        >ABANDON</button>
                                      `
                                    : html`
                                        <button
                                            class="action-btn action-reactivate"
                                            @click=${() => setStatus(goal, 'active')}
                                        >REACTIVATE</button>
                                      `}
                                <button class="action-btn action-edit" @click=${() => openEditForm(goal)}>EDIT</button>
                                <button
                                    class="action-btn action-delete"
                                    @click=${() => updateState({confirmDeleteId: goal.id})}
                                >DELETE</button>
                            </div>

                            ${confirmingDel
                                ? html`
                                    <div class="confirm-delete">
                                        Permanently delete this objective?
                                        <button
                                            class="btn btn-danger"
                                            style="font-size:0.72rem;padding:3px 8px;"
                                            @click=${() => {
                                                dispatch(new events.goalDeleted(goal.id));
                                                updateState({confirmDeleteId: null});
                                            }}
                                        >CONFIRM</button>
                                        <button
                                            class="btn btn-ghost"
                                            style="font-size:0.72rem;padding:3px 8px;"
                                            @click=${() => updateState({confirmDeleteId: null})}
                                        >CANCEL</button>
                                    </div>
                                  `
                                : html``}
                          `}
                </div>
            `;
        }

        return html`
            ${!isFiltered
                ? html`
                    <div class="page-title">GOALS</div>
                    <div class="page-subtitle">LONG-HORIZON OUTCOMES · SPAWN COMMITMENTS TO BUILD MOMENTUM</div>
                  `
                : html``}

            ${state.formOpen && state.editingId === null
                ? renderForm('NEW GOAL')
                : html`<button class="file-btn" @click=${openAddForm}>+ MAKE GOAL</button>`}

            ${active.length > 0 ? html`
                <div class="section-header">ACTIVE (${active.length})</div>
                ${active.map(renderGoalCard)}
            ` : visibleGoals.length === 0 && !state.formOpen ? html`
                <div class="empty">No objectives on file. File one above to begin.</div>
            ` : html``}

            ${achieved.length > 0 ? html`
                <div class="section-header">ACHIEVED (${achieved.length})</div>
                ${achieved.map(renderGoalCard)}
            ` : html``}

            ${abandoned.length > 0 ? html`
                <div class="section-header">ABANDONED (${abandoned.length})</div>
                ${abandoned.map(renderGoalCard)}
            ` : html``}
        `;
    },
});
