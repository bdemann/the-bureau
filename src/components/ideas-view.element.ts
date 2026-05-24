import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {FormKind, Goal, Idea, Project} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// IdeasViewElement
// Field Intelligence: capture raw ideas, optionally link to an operation and
// a goal within that operation, promote to a directive when ready.
//
// When filterProjectId is set only that project's ideas are shown and the
// project selector is hidden (used from project-detail). The goal selector
// always shows goals for the currently selected project.
// ─────────────────────────────────────────────────────────────────────────────

export const IdeasViewElement = defineElement<{
    ideas:           ReadonlyArray<Idea>;
    projects:        ReadonlyArray<Project>;
    goals:           ReadonlyArray<Goal>;
    /** When set, only show ideas for this project and hide the project selector. */
    filterProjectId?: string | null;
    /** When set, only show ideas for this goal and lock the goal selector to it. */
    filterGoalId?:    string | null;
}>()({
    tagName: 'ideas-view',

    events: {
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        ideaUpdated:             defineElementEvent<Idea>(),
        ideaDeleted:             defineElementEvent<string>(),
        promoteRequested:        defineElementEvent<Idea>(),
    },

    state: () => ({
        formOpen:        false,
        editingId:       null as string | null,
        formTitle:       '',
        formDesc:        '',
        formProjectId:   null as string | null,
        formGoalId:      null as string | null,
        confirmDeleteId: null as string | null,
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

        textarea { resize: vertical; min-height: 64px; }

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
            padding: 32px 0;
        }

        .idea-card {
            background: #FDFAF5;
            border: 1px solid rgba(0,0,0,0.1);
            border-left: 3px solid #B8860B;
            padding: 12px 14px;
            margin-bottom: 12px;
        }

        .idea-card.editing { border-left-color: #1B2A4A; }

        .idea-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            letter-spacing: 0.1em;
            color: #1B2A4A;
        }

        .idea-desc {
            font-family: 'Courier Prime', monospace;
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
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 2px 6px;
            border: 1px solid rgba(0,0,0,0.15);
            color: #6B6B6B;
        }

        .meta-badge.goal { border-color: #1B2A4A33; color: #1B2A4A; }

        .idea-actions {
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

        .action-promote { background: #1B2A4A; color: #F5EFE0; }
        .action-promote:hover { background: #243a63; }
        .action-edit { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: #1B2A4A; }
        .action-edit:hover { background: rgba(0,0,0,0.05); }
        .action-delete { background: transparent; border: 1px solid #C41E3A; color: #C41E3A; }
        .action-delete:hover { background: rgba(196,30,58,0.08); }

        .confirm-delete {
            font-family: 'Courier Prime', monospace;
            font-size: 0.75rem;
            color: #C41E3A;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {ideas, projects, goals} = inputs;
        const filterProjectId = inputs.filterProjectId ?? null;
        const filterGoalId    = inputs.filterGoalId ?? null;
        const isFiltered = filterProjectId !== null;
        const isGoalFiltered = filterGoalId !== null;

        const visibleIdeas = isGoalFiltered
            ? ideas.filter(i => i.goalId === filterGoalId)
            : isFiltered
                ? ideas.filter(i => i.projectId === filterProjectId)
                : [...ideas];

        const sortedIdeas = visibleIdeas.sort((a, b) => b.createdAt - a.createdAt);

        // Goals available for the currently selected project (in form).
        // When we're goal-filtered, the goal is locked — no dropdown needed.
        const effectiveProjectId = isFiltered ? filterProjectId : state.formProjectId;
        const availableGoals = isGoalFiltered
            ? []   // goal is locked; don't show dropdown
            : effectiveProjectId
                ? goals.filter(g => g.projectId === effectiveProjectId && g.status === 'active')
                : [];

        function projectName(id: string | null): string | null {
            if (!id) return null;
            return projects.find(p => p.id === id)?.name ?? null;
        }

        function goalName(id: string | null): string | null {
            if (!id) return null;
            return goals.find(g => g.id === id)?.title ?? null;
        }

        function openEditForm(idea: Idea): void {
            updateState({
                formOpen: true,
                editingId: idea.id,
                formTitle: idea.title,
                formDesc: idea.description,
                formProjectId: idea.projectId,
                formGoalId: idea.goalId,
                confirmDeleteId: null,
            });
        }

        function closeForm(): void {
            updateState({formOpen: false, editingId: null});
        }

        function submitForm(): void {
            const title = state.formTitle.trim();
            if (!title || !state.editingId) return;
            const existing = ideas.find(i => i.id === state.editingId)!;
            dispatch(new events.ideaUpdated({
                ...existing,
                title,
                description: state.formDesc.trim(),
                projectId: isFiltered ? filterProjectId : state.formProjectId,
                // When goal-filtered, keep the locked goal; otherwise use the picker
                goalId: isGoalFiltered ? filterGoalId : state.formGoalId,
            }));
            closeForm();
        }

        function renderForm(label: string) {
            return html`
                <div class="form-card">
                    <div class="form-title">${label}</div>
                    <div class="field">
                        <label class="field-label">Title</label>
                        <input
                            type="text"
                            placeholder="Intelligence designation…"
                            .value=${state.formTitle}
                            @input=${(e: Event) =>
                                updateState({formTitle: (e.target as HTMLInputElement).value})}
                        />
                    </div>
                    <div class="field">
                        <label class="field-label">Notes (optional)</label>
                        <textarea
                            placeholder="Details, context, leads…"
                            .value=${state.formDesc}
                            @input=${(e: Event) =>
                                updateState({formDesc: (e.target as HTMLTextAreaElement).value})}
                        ></textarea>
                    </div>
                    ${!isFiltered ? html`
                        <div class="field">
                            <label class="field-label">Linked Area (optional)</label>
                            <select
                                @change=${(e: Event) => {
                                    const val = (e.target as HTMLSelectElement).value;
                                    updateState({formProjectId: val || null, formGoalId: null});
                                }}
                            >
                                <option value="" ?selected=${state.formProjectId === null}>— None —</option>
                                ${projects.map(p => html`
                                    <option value=${p.id} ?selected=${state.formProjectId === p.id}>${p.name}</option>
                                `)}
                            </select>
                        </div>
                    ` : html``}
                    ${availableGoals.length > 0 ? html`
                        <div class="field">
                            <label class="field-label">Linked Objective (optional)</label>
                            <select
                                @change=${(e: Event) => {
                                    const val = (e.target as HTMLSelectElement).value;
                                    updateState({formGoalId: val || null});
                                }}
                            >
                                <option value="" ?selected=${state.formGoalId === null}>— None —</option>
                                ${availableGoals.map(g => html`
                                    <option value=${g.id} ?selected=${state.formGoalId === g.id}>${g.title}</option>
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

        return html`
            ${!isFiltered
                ? html`
                    <div class="page-title">IDEAS</div>
                    <div class="page-subtitle">UNPROCESSED OBSERVATIONS · PROPOSED AREAS</div>
                  `
                : html``}

            <button
                class="file-btn"
                @click=${() => dispatch(new events.makeCommitmentRequested('idea'))}
            >+ MAKE IDEA</button>

            ${sortedIdeas.length === 0
                ? html`<div class="empty">No intelligence on file. Observations go here.</div>`
                : html``}

            ${sortedIdeas.map(idea => {
                const isEditing = state.formOpen && state.editingId === idea.id;
                const confirmingDelete = state.confirmDeleteId === idea.id;
                const opName = !isFiltered ? projectName(idea.projectId) : null;
                const gName = goalName(idea.goalId);

                return html`
                    <div class=${'idea-card' + (isEditing ? ' editing' : '')}>
                        ${isEditing
                            ? renderForm('EDIT IDEA')
                            : html`
                                <div class="idea-title">${idea.title}</div>
                                ${idea.description
                                    ? html`<div class="idea-desc">${idea.description}</div>`
                                    : html``}
                                ${(opName || gName) ? html`
                                    <div class="idea-meta">
                                        ${opName ? html`<span class="meta-badge">⊙ ${opName}</span>` : html``}
                                        ${gName  ? html`<span class="meta-badge goal">→ ${gName}</span>` : html``}
                                    </div>
                                ` : html``}
                                <div class="idea-actions">
                                    <button
                                        class="action-btn action-promote"
                                        @click=${() => dispatch(new events.promoteRequested(idea))}
                                    >PROMOTE TO COMMITMENT</button>
                                    <button
                                        class="action-btn action-edit"
                                        @click=${() => openEditForm(idea)}
                                    >EDIT</button>
                                    <button
                                        class="action-btn action-delete"
                                        @click=${() => updateState({confirmDeleteId: idea.id})}
                                    >DELETE</button>
                                </div>
                                ${confirmingDelete ? html`
                                    <div class="confirm-delete">
                                        Permanently delete this intelligence?
                                        <button
                                            class="btn btn-danger"
                                            style="font-size:0.72rem;padding:3px 8px;"
                                            @click=${() => {
                                                dispatch(new events.ideaDeleted(idea.id));
                                                updateState({confirmDeleteId: null});
                                            }}
                                        >CONFIRM</button>
                                        <button
                                            class="btn btn-ghost"
                                            style="font-size:0.72rem;padding:3px 8px;"
                                            @click=${() => updateState({confirmDeleteId: null})}
                                        >CANCEL</button>
                                    </div>
                                ` : html``}
                              `}
                    </div>
                `;
            })}
        `;
    },
});
