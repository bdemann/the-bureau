import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {FormKind, Goal, GoalStatus, Project, Task} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// GoalsViewElement
// Strategic Objectives list. Each card is clickable to open goal-detail.
// Status toggles (achieve/abandon/reactivate) are available directly on cards.
// All editing, task management, and linking happens in goal-detail.
// ─────────────────────────────────────────────────────────────────────────────

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
    goals:    ReadonlyArray<Goal>;
    tasks:    ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
    /** When set, only show goals for this project and hide the project selector. */
    filterProjectId?: string | null;
}>()({
    tagName: 'goals-view',

    events: {
        makeCommitmentRequested: defineElementEvent<FormKind>(),
        goalUpdated:             defineElementEvent<Goal>(),
        goalSelected:            defineElementEvent<string>(),  // goal id → open detail
    },

    state: () => ({}),

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

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

        /* ── Goal card ── */
        .goal-card {
            background: #FDFAF5;
            border: 1px solid rgba(0,0,0,0.12);
            border-left: 4px solid #1B2A4A;
            padding: 12px 14px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: box-shadow 0.15s, transform 0.1s;
            position: relative;
        }

        .goal-card:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }

        .goal-card.achieved { border-left-color: #2E7D32; opacity: 0.85; }
        .goal-card.abandoned { border-left-color: #9E9E9E; opacity: 0.7; }

        .card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }

        .goal-title {
            font-family: 'Special Elite', serif;
            font-size: 1rem;
            color: #1B2A4A;
            line-height: 1.3;
            flex: 1;
        }

        .card-arrow {
            font-family: 'Courier Prime', monospace;
            font-size: 1rem;
            color: rgba(27,42,74,0.35);
            flex-shrink: 0;
            margin-top: 2px;
        }

        .goal-desc {
            font-family: 'Courier Prime', monospace;
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
            font-family: 'Courier Prime', monospace;
            font-size: 0.63rem;
            letter-spacing: 0.06em;
            color: #6B6B6B;
            margin-top: 6px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .target-date { color: #B8860B; }
        .target-date.overdue { color: #C41E3A; }

        .status-badge {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.65rem;
            letter-spacing: 0.1em;
        }
        .status-badge.achieved  { color: #2E7D32; }
        .status-badge.abandoned { color: #9E9E9E; }

        .project-badge {
            display: inline-block;
            font-family: 'Courier Prime', monospace;
            font-size: 0.6rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 1px 5px;
            border: 1px solid rgba(0,0,0,0.15);
            color: #6B6B6B;
        }

        .linked-section { margin-top: 8px; }

        .linked-label {
            font-family: 'Courier Prime', monospace;
            font-size: 0.6rem;
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
            font-size: 0.7rem;
            padding: 2px 7px;
            background: rgba(27,42,74,0.07);
            border: 1px solid rgba(27,42,74,0.15);
            color: #1B2A4A;
        }

        .linked-empty {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
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
            font-size: 0.68rem;
            padding: 3px 9px;
            border: none;
            cursor: pointer;
        }

        .action-achieve    { background: #2E7D32; color: #fff; }
        .action-achieve:hover  { background: #245826; }
        .action-abandon    { background: transparent; border: 1px solid #9E9E9E; color: #6B6B6B; }
        .action-abandon:hover  { background: rgba(0,0,0,0.05); }
        .action-reactivate { background: transparent; border: 1px solid #1B2A4A; color: #1B2A4A; }
        .action-reactivate:hover { background: rgba(27,42,74,0.05); }
    `,

    render({inputs, dispatch, events}) {
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

        function setStatus(goal: Goal, status: GoalStatus, e: Event): void {
            e.stopPropagation();
            dispatch(new events.goalUpdated({...goal, status}));
        }

        const active    = sortByTargetDate(visibleGoals.filter(g => g.status === 'active'));
        const achieved  = sortByTargetDate(visibleGoals.filter(g => g.status === 'achieved'));
        const abandoned = sortByTargetDate(visibleGoals.filter(g => g.status === 'abandoned'));

        function renderGoalCard(goal: Goal) {
            const isActive    = goal.status === 'active';
            const dateOverdue = goal.targetDate !== null && goal.targetDate < now && isActive;
            const opName      = !isFiltered ? projectName(goal.projectId) : null;

            return html`
                <div
                    class=${'goal-card ' + goal.status}
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
                                        <span class="linked-chip">${taskTitle(tid)}</span>
                                    `)}
                                </div>
                              `
                            : html`<div class="linked-empty">No commitments linked yet.</div>`}
                    </div>

                    <div class="goal-actions">
                        ${isActive
                            ? html`
                                <button
                                    class="action-btn action-achieve"
                                    @click=${(e: Event) => setStatus(goal, 'achieved', e)}
                                >MARK ACHIEVED</button>
                                <button
                                    class="action-btn action-abandon"
                                    @click=${(e: Event) => setStatus(goal, 'abandoned', e)}
                                >ABANDON</button>
                              `
                            : html`
                                <button
                                    class="action-btn action-reactivate"
                                    @click=${(e: Event) => setStatus(goal, 'active', e)}
                                >REACTIVATE</button>
                              `}
                    </div>
                </div>
            `;
        }

        return html`
            ${!isFiltered
                ? html`
                    <div class="page-title">GOALS</div>
                    <div class="page-subtitle">LONG-HORIZON OUTCOMES · CLICK AN OBJECTIVE TO MANAGE COMMITMENTS</div>
                  `
                : html``}

            <button
                class="file-btn"
                @click=${() => dispatch(new events.makeCommitmentRequested('goal'))}
            >+ MAKE GOAL</button>

            ${active.length > 0
                ? html`
                    <div class="section-header">ACTIVE (${active.length})</div>
                    ${active.map(renderGoalCard)}
                  `
                : visibleGoals.length === 0
                ? html`<div class="empty">No objectives on file. Make one above to begin.</div>`
                : html``}

            ${achieved.length > 0
                ? html`
                    <div class="section-header">ACHIEVED (${achieved.length})</div>
                    ${achieved.map(renderGoalCard)}
                  `
                : html``}

            ${abandoned.length > 0
                ? html`
                    <div class="section-header">ABANDONED (${abandoned.length})</div>
                    ${abandoned.map(renderGoalCard)}
                  `
                : html``}
        `;
    },
});
