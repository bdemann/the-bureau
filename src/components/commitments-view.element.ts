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
    },

    state: () => ({
        groupByTimeOfDay: false,
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
            border: 1px solid rgba(0, 0, 0, 0.2);
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
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            margin-bottom: 4px;
        }

        .card-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-bottom: 4px;
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
            border: 1.5px dashed rgba(0, 0, 0, 0.25);
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

        function renderCard(c: AnyCommitment) {
            return html`
                <${CommitmentCardElement.assign({ commitment: c, areas, goals })}
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
            // Group tasks by time-of-day slot
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
                            ${items.map(renderCard)}
                        </div>
                    `;
                })}
            `;
        } else {
            listContent = html`
                <div class="card-list">
                    ${commitments.map(renderCard)}
                </div>
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
                              class=${"toggle-btn" +
                              (state.groupByTimeOfDay ? " active" : "")}
                              @click=${() =>
                                  updateState({
                                      groupByTimeOfDay:
                                          !state.groupByTimeOfDay,
                                  })}
                          >
                              ${state.groupByTimeOfDay
                                  ? "⊞ BY TIME"
                                  : "⊟ BY TIME"}
                          </button>
                      `
                    : html``}
            </div>

            ${listContent}
        `;
    },
});
