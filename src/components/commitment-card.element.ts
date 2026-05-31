import { css, defineElement, defineElementEvent, html } from "element-vir";
import type { AnyCommitment, Area, Goal, Task } from "../data/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// CommitmentCardElement
// Simplified organization-focused card for all four commitment types.
// Used in the unified list views (all-tasks, all-routines, all-commitments,
// unlinked). Not an action surface — the edit button opens the dialog.
// ─────────────────────────────────────────────────────────────────────────────

export const CommitmentCardElement = defineElement<{
    commitment: AnyCommitment;
    areas: ReadonlyArray<Area>;
    goals: ReadonlyArray<Goal>;
}>()({
    tagName: "commitment-card",

    events: {
        editRequested: defineElementEvent<AnyCommitment>(),
    },

    styles: css`
        :host {
            display: block;
        }

        .card {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            background: var(--color-card);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-left: 4px solid var(--kind-color, var(--color-text-faint));
            padding: 10px 12px;
        }

        .card-body {
            flex: 1;
            min-width: 0;
        }

        .card-title {
            font-family: var(--font-accent);
            font-size: 0.95rem;
            color: var(--color-primary);
            line-height: 1.3;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            align-items: center;
        }

        .badge {
            font-family: var(--font-mono);
            font-size: 0.58rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            padding: 1px 5px;
            border: 1px solid rgba(0, 0, 0, 0.15);
            color: var(--color-text-muted);
            white-space: nowrap;
        }

        .badge.kind-routine {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }
        .badge.kind-task {
            border-color: rgba(var(--color-primary-rgb), 0.4);
            color: rgba(var(--color-primary-rgb), 0.8);
        }
        .badge.kind-goal {
            border-color: var(--color-warning);
            color: var(--color-warning);
        }
        .badge.kind-idea {
            border-color: #8b7030;
            color: #8b7030;
        }

        .badge.no-area {
            border-color: var(--color-danger);
            color: var(--color-danger);
            opacity: 0.7;
        }

        .badge.goal-link {
            border-color: rgba(var(--color-primary-rgb), 0.3);
            color: var(--color-primary);
        }

        .badge.goal-status {
            padding: 1px 5px;
        }
        .badge.goal-status.achieved {
            border-color: var(--color-success);
            color: var(--color-success);
        }
        .badge.goal-status.abandoned {
            border-color: var(--color-text-faint);
            color: var(--color-text-faint);
        }

        .edit-btn {
            background: none;
            border: 1px solid rgba(0, 0, 0, 0.15);
            color: var(--color-text-muted);
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.08em;
            padding: 4px 8px;
            cursor: pointer;
            flex-shrink: 0;
            align-self: center;
            transition: border-color 0.15s, color 0.15s;
        }
        .edit-btn:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }
    `,

    render({ inputs, dispatch, events }) {
        const { commitment, areas, goals } = inputs;

        const areaName = (areaId: string | null) =>
            areaId ? (areas.find((a) => a.id === areaId)?.name ?? null) : null;

        const goalTitle = (goalId: string | null) =>
            goalId ? (goals.find((g) => g.id === goalId)?.title ?? null) : null;

        let kindColor = "var(--color-text-faint)";
        if (commitment.kind === "routine") kindColor = "var(--color-primary)";
        else if (commitment.kind === "task")
            kindColor = "rgba(var(--color-primary-rgb), 0.4)";
        else if (commitment.kind === "goal") kindColor = "var(--color-warning)";
        else if (commitment.kind === "idea") kindColor = "#c9a84c";

        const area = areaName(commitment.areaId);

        let meta = html``;

        if (commitment.kind === "routine" || commitment.kind === "task") {
            const t = commitment as Task;
            const gTitle = goalTitle(t.goalId ?? null);
            meta = html`
                <span class=${"badge kind-" + commitment.kind}>${commitment.kind}</span>
                ${area
                    ? html`<span class="badge">${area}</span>`
                    : html`<span class="badge no-area">no area</span>`}
                ${t.timeOfDay !== "anytime"
                    ? html`<span class="badge">${t.timeOfDay}</span>`
                    : html``}
                ${gTitle
                    ? html`<span class="badge goal-link">→ ${gTitle}</span>`
                    : html``}
            `;
        } else if (commitment.kind === "goal") {
            const g = commitment as Goal;
            meta = html`
                <span class="badge kind-goal">goal</span>
                ${area
                    ? html`<span class="badge">${area}</span>`
                    : html`<span class="badge no-area">no area</span>`}
                ${g.status !== "active"
                    ? html`<span class=${"badge goal-status " + g.status}>${g.status}</span>`
                    : html``}
                ${g.targetDate
                    ? html`<span class="badge">${new Date(g.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>`
                    : html``}
            `;
        } else {
            const gTitle = goalTitle(commitment.goalId ?? null);
            meta = html`
                <span class="badge kind-idea">idea</span>
                ${area
                    ? html`<span class="badge">${area}</span>`
                    : html`<span class="badge no-area">no area</span>`}
                ${gTitle
                    ? html`<span class="badge goal-link">→ ${gTitle}</span>`
                    : html``}
            `;
        }

        return html`
            <div class="card" style="--kind-color:${kindColor}">
                <div class="card-body">
                    <div class="card-title">${commitment.title}</div>
                    <div class="card-meta">${meta}</div>
                </div>
                <button
                    class="edit-btn"
                    @click=${() => dispatch(new events.editRequested(commitment))}
                >
                    EDIT
                </button>
            </div>
        `;
    },
});
