import {defineElement, defineElementEvent, css, html} from 'element-vir';
import type {Project, Task} from '../data/types.js';
import {isTaskOverdue, isTaskVisible} from '../data/storage.js';
import {SNOOZE_CRITICAL} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// ProjectCardElement
// Dashboard summary card for a project / operation.
// Shows task counts, overdue flags, and critical snooze alerts.
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_COLORS: Record<string, string> = {
    red:   '#C41E3A',
    navy:  '#1B2A4A',
    gold:  '#B8860B',
    olive: '#4A5E2A',
    slate: '#4A5568',
};

export const ProjectCardElement = defineElement<{
    project: Project;
    tasks: Task[];
}>()({
    tagName: 'project-card',

    events: {
        selected: defineElementEvent<string>(), // project id
    },

    styles: css`
        :host {
            display: block;
        }

        .card {
            background: #F5EFE0;
            border: 1px solid rgba(0,0,0,0.12);
            border-top: 5px solid var(--project-color, #1B2A4A);
            padding: 14px 16px 16px;
            cursor: pointer;
            transition: transform 0.12s, box-shadow 0.12s;
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .card:active {
            transform: translateY(0);
        }

        /* Folder tab decoration */
        .card::before {
            content: '';
            position: absolute;
            top: -5px;
            right: 20px;
            width: 40px;
            height: 5px;
            background: var(--project-color-light, #2A3F6F);
        }

        .project-name {
            font-family: 'Special Elite', serif;
            font-size: 1rem;
            color: #2C2C2C;
            line-height: 1.3;
            margin-bottom: 6px;
        }

        .project-desc {
            font-size: 0.75rem;
            color: #6B6B6B;
            line-height: 1.4;
            margin-bottom: 12px;
            font-family: 'Courier Prime', monospace;
        }

        .stats {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .stat {
            font-family: 'Courier Prime', monospace;
            font-size: 0.7rem;
            color: #6B6B6B;
        }

        .stat strong {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            color: #2C2C2C;
            display: block;
            line-height: 1;
        }

        .flag {
            font-size: 0.65rem;
            font-family: 'Courier Prime', monospace;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 1px;
            letter-spacing: 0.05em;
        }

        .flag-overdue {
            background: rgba(196, 30, 58, 0.12);
            color: #C41E3A;
            border: 1px solid rgba(196, 30, 58, 0.3);
        }

        .flag-critical {
            background: rgba(139, 0, 0, 0.1);
            color: #8B0000;
            border: 1px solid rgba(139, 0, 0, 0.3);
            animation: pulse-flag 2s ease-in-out infinite;
        }

        @keyframes pulse-flag {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.6; }
        }

        .flag-complete {
            background: rgba(46, 94, 46, 0.1);
            color: #2E5E2E;
            border: 1px solid rgba(46, 94, 46, 0.3);
        }

        .enter-arrow {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1rem;
            color: var(--project-color, #1B2A4A);
            opacity: 0.4;
            transition: opacity 0.15s, transform 0.15s;
        }

        .card:hover .enter-arrow {
            opacity: 0.8;
            transform: translateY(-50%) translateX(3px);
        }
    `,

    render({inputs, dispatch, events}) {
        const {project, tasks} = inputs;

        const color = PROJECT_COLORS[project.colorKey] ?? '#1B2A4A';
        const visibleTasks = tasks.filter(isTaskVisible);
        const overdueTasks = visibleTasks.filter(isTaskOverdue);
        const criticalSnooze = tasks.filter(
            t => t.snoozeCount >= SNOOZE_CRITICAL && t.completedAt === null,
        );
        const completedCount = tasks.filter(t => t.completedAt !== null).length;
        const totalCount = tasks.length;
        // An operation with routines is an ongoing commitment — it's never "cleared".
        const hasRoutines = tasks.some(t => t.kind === 'routine');
        const allDone = !hasRoutines && totalCount > 0 && completedCount === totalCount;

        return html`
            <div
                class="card"
                style="--project-color:${color}"
                @click=${() => dispatch(new events.selected(project.id))}
                role="button"
                tabindex="0"
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        dispatch(new events.selected(project.id));
                    }
                }}
            >
                <div class="project-name">${project.name}</div>

                ${project.description
                    ? html`<div class="project-desc">${project.description}</div>`
                    : html``}

                <div class="stats">
                    <div class="stat">
                        <strong>${visibleTasks.length}</strong>
                        pending
                    </div>
                    <div class="stat">
                        <strong>${completedCount}</strong>
                        cleared
                    </div>

                    ${overdueTasks.length > 0
                        ? html`<span class="flag flag-overdue">
                            ⚠ ${overdueTasks.length} overdue
                          </span>`
                        : html``}

                    ${criticalSnooze.length > 0
                        ? html`<span class="flag flag-critical">
                            ★ BRIGGS WATCHING
                          </span>`
                        : html``}

                    ${allDone
                        ? html`<span class="flag flag-complete">✓ CLEARED</span>`
                        : html``}
                </div>

                <span class="enter-arrow">→</span>
            </div>
        `;
    },
});
