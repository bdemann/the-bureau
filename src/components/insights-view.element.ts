import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {Project, Task} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// InsightsViewElement
// Intelligence Report: missed tasks, snooze/skip patterns, completion stats,
// and per-operation aggregates.
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

export const InsightsViewElement = defineElement<{
    tasks: ReadonlyArray<Task>;
    projects: ReadonlyArray<Project>;
}>()({
    tagName: 'insights-view',

    events: {
        /** Permanently delete a missed task (truly past). */
        missedTaskDismissed: defineElementEvent<string>(),
        /** Revive a missed task back to active (clears missedAt). */
        missedTaskRevived:   defineElementEvent<string>(),
    },

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
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

        .section {
            margin-bottom: 28px;
        }

        .section-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            border-bottom: 1px solid rgba(0,0,0,0.15);
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

        .section-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.95rem;
            letter-spacing: 0.18em;
            color: #1B2A4A;
            flex: 1;
        }

        .section-title.danger { color: #C41E3A; }

        .section-count {
            font-family: 'Courier Prime', monospace;
            font-size: 0.65rem;
            color: #6B6B6B;
        }

        .section-empty {
            font-family: 'Special Elite', serif;
            font-size: 0.82rem;
            color: #6B6B6B;
            text-align: center;
            padding: 14px;
            background: rgba(255,253,247,0.6);
            border: 1px dashed rgba(0,0,0,0.12);
        }

        .insight-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 6px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
        }

        .insight-row:last-child { border-bottom: none; }

        .insight-meta {
            flex: 1;
            min-width: 0;
        }

        .insight-title {
            font-family: 'Special Elite', serif;
            font-size: 0.85rem;
            color: #1B2A4A;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .insight-sub {
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            color: #6B6B6B;
            margin-top: 1px;
        }

        .badge {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.85rem;
            letter-spacing: 0.05em;
            min-width: 32px;
            text-align: center;
            padding: 2px 6px;
            border-radius: 2px;
            flex-shrink: 0;
        }

        .badge-miss  { background: #C41E3A; color: #fff; }
        .badge-snooze { background: #E8821A; color: #fff; }
        .badge-skip  { background: #B8860B; color: #fff; }
        .badge-done  { background: #2E6B3E; color: #fff; }
        .badge-neutral { background: #1B2A4A; color: #F5EFE0; }

        /* Operations overview table */
        .ops-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'Courier Prime', monospace;
            font-size: 0.68rem;
        }

        .ops-table th {
            text-align: left;
            color: #6B6B6B;
            letter-spacing: 0.08em;
            padding: 4px 6px;
            border-bottom: 1px solid rgba(0,0,0,0.15);
        }

        .ops-table th:not(:first-child) { text-align: center; }

        .ops-table td {
            padding: 6px 6px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            color: #1B2A4A;
        }

        .ops-table td:not(:first-child) { text-align: center; }

        .ops-table tr:last-child td { border-bottom: none; }

        .ops-name {
            font-family: 'Special Elite', serif;
            font-size: 0.78rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 130px;
        }

        .zero { color: #CCCCCC; }

        .streak-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .streak-row:last-child { border-bottom: none; }
        .streak-title {
            font-family: 'Special Elite', serif;
            font-size: 0.82rem;
            color: #1B2A4A;
            flex: 1;
        }
        .streak-current {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
            color: #2E6B3E;
        }
        .streak-max {
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            color: #6B6B6B;
        }

        .missed-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
        }

        .action-btn {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.68rem;
            letter-spacing: 0.12em;
            border: none;
            padding: 3px 8px;
            cursor: pointer;
            transition: opacity 0.15s;
        }
        .action-btn:hover { opacity: 0.8; }

        .btn-dismiss {
            background: rgba(0,0,0,0.08);
            color: #6B6B6B;
        }

        .btn-revive {
            background: #1B2A4A;
            color: #F5EFE0;
        }
    `,

    render({inputs, dispatch, events}) {
        const {tasks, projects} = inputs;
        const projectsById = new Map(projects.map(p => [p.id, p]));

        // ── Missed tasks ─────────────────────────────────────────────────────
        // One-time hard-date tasks that auto-expired (missedAt set)
        const hardMissed = tasks
            .filter(t => t.missedAt !== null)
            .sort((a, b) => (b.missedAt ?? 0) - (a.missedAt ?? 0));

        // Recurring tasks with any missed periods (totalMisses > 0)
        const recurringMissed = tasks
            .filter(t => t.recurrence !== null && t.totalMisses > 0)
            .sort((a, b) => b.totalMisses - a.totalMisses)
            .slice(0, 10);

        // ── Most snoozed ─────────────────────────────────────────────────────
        const mostSnoozed = tasks
            .filter(t => t.totalSnoozes > 0)
            .sort((a, b) => b.totalSnoozes - a.totalSnoozes)
            .slice(0, 8);

        // ── Most skipped ─────────────────────────────────────────────────────
        const mostSkipped = tasks
            .filter(t => t.totalSkips > 0)
            .sort((a, b) => b.totalSkips - a.totalSkips)
            .slice(0, 8);

        // ── Top completions ──────────────────────────────────────────────────
        const topCompleted = tasks
            .filter(t => t.totalCompletions > 0)
            .sort((a, b) => b.totalCompletions - a.totalCompletions)
            .slice(0, 8);

        // ── Best streaks ─────────────────────────────────────────────────────
        const topStreaks = tasks
            .filter(t => t.maxTaskCompletionStreak > 1)
            .sort((a, b) => b.maxTaskCompletionStreak - a.maxTaskCompletionStreak)
            .slice(0, 5);

        // ── Operations overview ───────────────────────────────────────────────
        interface OpsRow {
            project: Project;
            misses: number;
            snoozes: number;
            skips: number;
            completions: number;
        }
        const opsRows: OpsRow[] = projects.map(p => {
            const pts = tasks.filter(t => t.projectId === p.id);
            return {
                project: p,
                misses:      pts.reduce((s, t) => s + t.totalMisses, 0),
                snoozes:     pts.reduce((s, t) => s + t.totalSnoozes, 0),
                skips:       pts.reduce((s, t) => s + t.totalSkips, 0),
                completions: pts.reduce((s, t) => s + t.totalCompletions, 0),
            };
        }).sort((a, b) => b.misses - a.misses || b.snoozes - a.snoozes);

        function projectName(task: Task): string {
            if (!task.projectId) return 'Unassigned';
            return projectsById.get(task.projectId)?.name ?? 'Unknown';
        }

        const renderMissedRow = (task: Task) => html`
            <div class="insight-row">
                <span class="badge badge-miss">${task.totalMisses > 1 ? task.totalMisses : ''} MISS</span>
                <div class="insight-meta">
                    <div class="insight-title">${task.title}</div>
                    <div class="insight-sub">
                        ${task.missedAt !== null
                            ? `Expired ${fmtDate(task.missedAt)}`
                            : `${task.totalMisses} missed period${task.totalMisses !== 1 ? 's' : ''}`}
                        · ${projectName(task)}
                    </div>
                </div>
                ${task.missedAt !== null ? html`
                    <div class="missed-actions">
                        <button
                            class="action-btn btn-revive"
                            title="Restore to active — clear missed status"
                            @click=${() => dispatch(new events.missedTaskRevived(task.id))}
                        >Revive</button>
                        <button
                            class="action-btn btn-dismiss"
                            title="Permanently delete this directive"
                            @click=${() => dispatch(new events.missedTaskDismissed(task.id))}
                        >Dismiss</button>
                    </div>
                ` : html``}
            </div>
        `;

        const renderSnoozeRow = (task: Task) => html`
            <div class="insight-row">
                <span class="badge badge-snooze">${task.totalSnoozes}</span>
                <div class="insight-meta">
                    <div class="insight-title">${task.title}</div>
                    <div class="insight-sub">${projectName(task)}</div>
                </div>
            </div>
        `;

        const renderSkipRow = (task: Task) => html`
            <div class="insight-row">
                <span class="badge badge-skip">${task.totalSkips}</span>
                <div class="insight-meta">
                    <div class="insight-title">${task.title}</div>
                    <div class="insight-sub">${projectName(task)}</div>
                </div>
            </div>
        `;

        const renderCompletionRow = (task: Task) => html`
            <div class="insight-row">
                <span class="badge badge-done">${task.totalCompletions}</span>
                <div class="insight-meta">
                    <div class="insight-title">${task.title}</div>
                    <div class="insight-sub">${projectName(task)}</div>
                </div>
            </div>
        `;

        const num = (n: number) => html`<span class="${n === 0 ? 'zero' : ''}">${n}</span>`;

        return html`
            <div class="page-title">Intelligence Report</div>
            <div class="page-subtitle">Behavioral patterns, compliance gaps, and field performance.</div>

            <!-- Missed directives -->
            <section class="section">
                <div class="section-header">
                    <span class="section-title danger">MISSED DIRECTIVES</span>
                    <span class="section-count">${hardMissed.length + recurringMissed.length}</span>
                </div>
                ${hardMissed.length === 0 && recurringMissed.length === 0
                    ? html`<div class="section-empty">No missed directives on record. Exemplary.</div>`
                    : html`
                        ${hardMissed.map(renderMissedRow)}
                        ${recurringMissed.map(renderMissedRow)}
                      `}
            </section>

            <!-- Most snoozed -->
            <section class="section">
                <div class="section-header">
                    <span class="section-title">MOST SNOOZED</span>
                    <span class="section-count">${mostSnoozed.length}</span>
                </div>
                ${mostSnoozed.length === 0
                    ? html`<div class="section-empty">No snooze history. Vigilant.</div>`
                    : mostSnoozed.map(renderSnoozeRow)}
            </section>

            <!-- Most skipped -->
            <section class="section">
                <div class="section-header">
                    <span class="section-title">MOST SKIPPED</span>
                    <span class="section-count">${mostSkipped.length}</span>
                </div>
                ${mostSkipped.length === 0
                    ? html`<div class="section-empty">No skip history on record.</div>`
                    : mostSkipped.map(renderSkipRow)}
            </section>

            <!-- Top completions -->
            <section class="section">
                <div class="section-header">
                    <span class="section-title">TOP COMPLETIONS</span>
                    <span class="section-count">${topCompleted.length}</span>
                </div>
                ${topCompleted.length === 0
                    ? html`<div class="section-empty">No completions recorded yet.</div>`
                    : topCompleted.map(renderCompletionRow)}
            </section>

            <!-- Best streaks -->
            ${topStreaks.length > 0 ? html`
                <section class="section">
                    <div class="section-header">
                        <span class="section-title">BEST STREAKS</span>
                        <span class="section-count">${topStreaks.length}</span>
                    </div>
                    ${topStreaks.map(task => html`
                        <div class="streak-row">
                            <div class="streak-title">${task.title}</div>
                            <span class="streak-current">${task.taskCompletionStreak}✓</span>
                            <span class="streak-max">best: ${task.maxTaskCompletionStreak}</span>
                        </div>
                    `)}
                </section>
            ` : html``}

            <!-- Operations overview -->
            ${opsRows.length > 0 ? html`
                <section class="section">
                    <div class="section-header">
                        <span class="section-title">OPERATIONS OVERVIEW</span>
                    </div>
                    <table class="ops-table">
                        <thead>
                            <tr>
                                <th>Operation</th>
                                <th>Miss</th>
                                <th>Snooze</th>
                                <th>Skip</th>
                                <th>Done</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${opsRows.map(row => html`
                                <tr>
                                    <td><div class="ops-name">${row.project.name}</div></td>
                                    <td>${num(row.misses)}</td>
                                    <td>${num(row.snoozes)}</td>
                                    <td>${num(row.skips)}</td>
                                    <td>${num(row.completions)}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </section>
            ` : html``}
        `;
    },
});
