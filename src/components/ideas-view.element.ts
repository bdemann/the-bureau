import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {FormKind, Goal, Idea, Project} from '../data/types.js';
import {getActiveSkin} from '../skins/active-skin.js';

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
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: 'ideas-view',

    events: {
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        ideaUpdated:             defineElementEvent<Idea>(),
        ideaDeleted:             defineElementEvent<string>(),
        ideaEditRequested:       defineElementEvent<Idea>(),
        promoteRequested:        defineElementEvent<Idea>(),
    },

    state: () => ({
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

        .btn-primary   { background: var(--color-primary); color: var(--color-surface); }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .btn-ghost     { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: var(--color-primary); }
        .btn-ghost:hover { background: rgba(0,0,0,0.05); }
        .btn-danger    { background: var(--color-danger); color: var(--color-surface); }
        .btn-danger:hover { background: var(--color-danger-dark); }

        .file-btn {
            width: 100%;
            font-family: var(--font-display);
            font-size: 0.9rem;
            letter-spacing: 0.15em;
            padding: 10px;
            background: transparent;
            border: 1.5px dashed rgba(0,0,0,0.25);
            color: var(--color-text-muted);
            cursor: pointer;
            margin-bottom: 20px;
            text-align: center;
        }
        .file-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

        .empty {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text-muted);
            text-align: center;
            padding: 32px 0;
        }

        .idea-card {
            background: var(--color-card);
            border: 1px solid rgba(0,0,0,0.1);
            border-left: 3px solid var(--color-warning);
            padding: 12px 14px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: box-shadow 0.15s, transform 0.1s;
        }

        .idea-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
            border: 1px solid rgba(0,0,0,0.15);
            color: var(--color-text-muted);
        }

        .meta-badge.goal { border-color: var(--color-primary)33; color: var(--color-primary); }

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

        .action-promote { background: var(--color-primary); color: var(--color-surface); }
        .action-promote:hover { background: var(--color-primary-hover); }
        .action-edit { background: transparent; border: 1px solid rgba(0,0,0,0.2); color: var(--color-primary); }
        .action-edit:hover { background: rgba(0,0,0,0.05); }
        .action-delete { background: transparent; border: 1px solid var(--color-danger); color: var(--color-danger); }
        .action-delete:hover { background: rgba(var(--color-danger-rgb),0.08); }

        .confirm-delete {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--color-danger);
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const skin = getActiveSkin();
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

        function projectName(id: string | null): string | null {
            if (!id) return null;
            return projects.find(p => p.id === id)?.name ?? null;
        }

        function goalName(id: string | null): string | null {
            if (!id) return null;
            return goals.find(g => g.id === id)?.title ?? null;
        }

        return html`
            ${!isFiltered
                ? html`
                    <div class="page-title">${skin.pages.ideasTitle}</div>
                    <div class="page-subtitle">${skin.pages.ideasSubtitle}</div>
                  `
                : html``}

            <button
                class="file-btn"
                @click=${() => dispatch(new events.makeCommitmentRequested('idea'))}
            >+ MAKE IDEA</button>

            ${sortedIdeas.length === 0
                ? html`<div class="empty">${skin.pages.ideasEmpty}</div>`
                : html``}

            ${sortedIdeas.map(idea => {
                const confirmingDelete = state.confirmDeleteId === idea.id;
                const opName = !isFiltered ? projectName(idea.projectId) : null;
                const gName = goalName(idea.goalId);

                return html`
                    <div
                        class="idea-card"
                        @click=${(e: Event) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('.idea-actions') || target.closest('.confirm-delete')) return;
                            dispatch(new events.ideaEditRequested(idea));
                        }}
                    >
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
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    dispatch(new events.promoteRequested(idea));
                                }}
                            >PROMOTE TO COMMITMENT</button>
                            <button
                                class="action-btn action-edit"
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    dispatch(new events.ideaEditRequested(idea));
                                }}
                            >EDIT</button>
                            <button
                                class="action-btn action-delete"
                                @click=${(e: Event) => {
                                    e.stopPropagation();
                                    updateState({confirmDeleteId: idea.id});
                                }}
                            >DELETE</button>
                        </div>
                        ${confirmingDelete ? html`
                            <div class="confirm-delete">
                                Permanently delete this intelligence?
                                <button
                                    class="btn btn-danger"
                                    style="font-size:0.72rem;padding:3px 8px;"
                                    @click=${(e: Event) => {
                                        e.stopPropagation();
                                        dispatch(new events.ideaDeleted(idea.id));
                                        updateState({confirmDeleteId: null});
                                    }}
                                >CONFIRM</button>
                                <button
                                    class="btn btn-ghost"
                                    style="font-size:0.72rem;padding:3px 8px;"
                                    @click=${(e: Event) => {
                                        e.stopPropagation();
                                        updateState({confirmDeleteId: null});
                                    }}
                                >CANCEL</button>
                            </div>
                        ` : html``}
                    </div>
                `;
            })}
        `;
    },
});
