import { defineElement, defineElementEvent, css, html } from "element-vir";
import type { Area, Task } from "../data/types.js";
import { isTaskOverdue, isTaskVisible } from "../data/storage.js";
import { SNOOZE_CRITICAL } from "../data/types.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// AreaCardElement
// Dashboard summary card for an area.
// Shows task counts, overdue flags, and critical snooze alerts.
// ─────────────────────────────────────────────────────────────────────────────

const AREA_COLORS: Record<string, string> = {
    red: "var(--color-danger)",
    navy: "var(--color-primary)",
    gold: "var(--color-warning)",
    olive: "#4A5E2A",
    slate: "#4A5568",
};

export const AreaCardElement = defineElement<{
    area: Area;
    tasks: Task[];
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "area-card",

    events: {
        selected: defineElementEvent<string>(), // area id
    },

    styles: css`
        :host {
            display: block;
        }

        .card {
            background: var(--color-card);
            border: 1px solid var(--color-border-subtle);
            border-top: 5px solid var(--area-color, var(--color-primary));
            padding: 14px 16px 16px;
            cursor: pointer;
            transition:
                transform 0.12s,
                box-shadow 0.12s;
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        .card:active {
            transform: translateY(0);
        }

        /* Folder tab decoration */
        .card::before {
            content: "";
            position: absolute;
            top: -5px;
            right: 20px;
            width: 40px;
            height: 5px;
            background: var(--area-color-light, var(--color-primary-hover));
        }

        .area-name {
            font-family: var(--font-accent);
            font-size: 1rem;
            color: var(--color-text);
            line-height: 1.3;
            margin-bottom: 6px;
        }

        .area-desc {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            line-height: 1.4;
            margin-bottom: 12px;
            font-family: var(--font-mono);
        }

        .stats {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .stat {
            font-family: var(--font-mono);
            font-size: 0.7rem;
            color: var(--color-text-muted);
        }

        .stat strong {
            font-family: var(--font-display);
            font-size: 1rem;
            color: var(--color-text);
            display: block;
            line-height: 1;
        }

        .flag {
            font-size: 0.65rem;
            font-family: var(--font-mono);
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 1px;
            letter-spacing: 0.05em;
        }

        .flag-overdue {
            background: rgba(var(--color-danger-rgb), 0.12);
            color: var(--color-danger);
            border: 1px solid rgba(var(--color-danger-rgb), 0.3);
        }

        .flag-critical {
            background: rgba(139, 0, 0, 0.1);
            color: var(--color-danger-dark);
            border: 1px solid rgba(139, 0, 0, 0.3);
            animation: pulse-flag 2s ease-in-out infinite;
        }

        @keyframes pulse-flag {
            0%,
            100% {
                opacity: 1;
            }
            50% {
                opacity: 0.6;
            }
        }

        .flag-complete {
            background: rgba(46, 94, 46, 0.1);
            color: #2e5e2e;
            border: 1px solid rgba(46, 94, 46, 0.3);
        }

        .enter-arrow {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-family: var(--font-display);
            font-size: 1rem;
            color: var(--area-color, var(--color-primary));
            opacity: 0.4;
            transition:
                opacity 0.15s,
                transform 0.15s;
        }

        .card:hover .enter-arrow {
            opacity: 0.8;
            transform: translateY(-50%) translateX(3px);
        }
    `,

    render({ inputs, dispatch, events }) {
        const skin = getActiveSkin();
        const { area, tasks } = inputs;

        const color = AREA_COLORS[area.colorKey] ?? "var(--color-primary)";
        const visibleTasks = tasks.filter(isTaskVisible);
        const overdueTasks = visibleTasks.filter(isTaskOverdue);
        const criticalSnooze = tasks.filter(
            (t) => t.snoozeCount >= SNOOZE_CRITICAL && t.completedAt === null,
        );
        const completedCount = tasks.filter(
            (t) => t.completedAt !== null,
        ).length;
        const totalCount = tasks.length;
        const taskItems = tasks.filter((t) => t.kind === "task");
        const allDone =
            taskItems.length > 0 &&
            taskItems.every((t) => t.completedAt !== null);

        return html`
            <div
                class="card"
                style="--area-color:${color}"
                @click=${() => dispatch(new events.selected(area.id))}
                role="button"
                tabindex="0"
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                        dispatch(new events.selected(area.id));
                    }
                }}
            >
                <div class="area-name">${area.name}</div>

                ${area.description
                    ? html`<div class="area-desc">${area.description}</div>`
                    : html``}

                <div class="stats">
                    <div class="stat">
                        <strong>${visibleTasks.length}</strong>
                        ${skin.areaCard.pendingLabel}
                    </div>
                    <div class="stat">
                        <strong>${completedCount}</strong>
                        ${skin.areaCard.clearedLabel}
                    </div>

                    ${overdueTasks.length > 0
                        ? html`<span class="flag flag-overdue">
                              ${skin.areaCard.overdueFlag(overdueTasks.length)}
                          </span>`
                        : html``}
                    ${criticalSnooze.length > 0
                        ? html`<span class="flag flag-critical">
                              ${skin.areaCard.watchingFlag}
                          </span>`
                        : html``}
                    ${allDone
                        ? html`<span class="flag flag-complete"
                              >${skin.areaCard.allClearedFlag}</span
                          >`
                        : html``}
                </div>

                <span class="enter-arrow">→</span>
            </div>
        `;
    },
});
