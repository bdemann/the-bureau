import {defineElementNoInputs, css, html} from 'element-vir';
import type {DailyBand, RecurrenceConfig, Task} from '../data/types.js';
import {getDailyBand} from '../data/urgency.js';
import {getCurrentPeriod} from '../data/recurrence.js';

// ─────────────────────────────────────────────────────────────────────────────
// UrgencyTestElement
// Hidden dev page (gated by ?dev=urgency) that renders a colour-coded grid:
//   rows = synthetic test tasks
//   cols = simulated "today" values (today + N days, N = -2..30)
// Each cell shows the daily-band the urgency engine assigns.
//
// Use this to verify urgency.ts behaviour at a glance after edits.
// ─────────────────────────────────────────────────────────────────────────────

export const UrgencyTestElement = defineElementNoInputs({
    tagName: 'urgency-test',

    styles: css`
        :host {
            display: block;
            padding: 16px;
            font-family: 'Courier Prime', 'Courier New', monospace;
            color: #2C2C2C;
        }
        h1 {
            font-family: 'Bebas Neue', sans-serif;
            letter-spacing: 0.1em;
            font-size: 1.4rem;
            margin: 0 0 4px;
        }
        p.lede {
            margin: 0 0 16px;
            font-size: 0.85rem;
            color: #6B6B6B;
        }
        .legend {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
            font-size: 0.7rem;
        }
        .swatch {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .swatch span.box {
            display: inline-block;
            width: 14px; height: 14px;
            border: 1px solid rgba(0,0,0,0.2);
        }
        table {
            border-collapse: collapse;
            font-size: 0.65rem;
            margin-bottom: 32px;
        }
        th, td {
            border: 1px solid rgba(0,0,0,0.1);
            padding: 4px 6px;
            text-align: center;
            min-width: 22px;
        }
        th.label, td.label {
            text-align: left;
            min-width: 280px;
            background: #F5EFE0;
            font-family: 'Special Elite', serif;
            font-weight: normal;
        }
        td.label small {
            display: block;
            color: #6B6B6B;
            font-size: 0.6rem;
            margin-top: 2px;
        }
        th { background: #F5EFE0; font-weight: 700; }
        th.day-header { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }

        .band-mandatory { background: #C41E3A; color: white; }
        .band-suggested { background: #E8821A; color: white; }
        .band-radar     { background: #F5D67A; color: #5A4500; }
        .band-backlog   { background: #E8E2D2; color: #5A5A5A; }
        .band-hidden    { background: #FAFAFA; color: #BBB; }
    `,

    render() {
        const today = startOfToday();
        const offsets = range(-2, 30); // -2 .. +30

        const cases = buildCases(today);

        return html`
            <h1>URGENCY GRID</h1>
            <p class="lede">
                Each row simulates one task. Each column simulates the value of "today"
                for that scenario. Cells show the daily-band the engine assigns.
                Verify boundaries and edge cases before shipping.
            </p>

            <div class="legend">
                <span class="swatch"><span class="box band-mandatory"></span>MANDATORY</span>
                <span class="swatch"><span class="box band-suggested"></span>SUGGESTED</span>
                <span class="swatch"><span class="box band-radar"></span>RADAR</span>
                <span class="swatch"><span class="box band-backlog"></span>BACKLOG</span>
                <span class="swatch"><span class="box band-hidden"></span>HIDDEN</span>
            </div>

            ${cases.map(group => html`
                <h2 style="font-family:'Bebas Neue';margin:24px 0 6px;letter-spacing:0.08em;">
                    ${group.title}
                </h2>
                <table>
                    <thead>
                        <tr>
                            <th class="label">Scenario</th>
                            ${offsets.map(d => html`
                                <th class="day-header">${formatOffset(d)}</th>
                            `)}
                        </tr>
                    </thead>
                    <tbody>
                        ${group.cases.map(c => html`
                            <tr>
                                <td class="label">
                                    ${c.name}
                                    ${c.note ? html`<small>${c.note}</small>` : html``}
                                </td>
                                ${offsets.map(d => {
                                    const simToday = addDays(today, d);
                                    const band = getDailyBand(c.task, simToday);
                                    return html`
                                        <td class="band-${band}" title="${band}">
                                            ${bandGlyph(band)}
                                        </td>
                                    `;
                                })}
                            </tr>
                        `)}
                    </tbody>
                </table>
            `)}
        `;
    },
});

// ── Test scenario factory ───────────────────────────────────────────────────

interface TestCase {
    name: string;
    note?: string;
    task: Task;
}

interface CaseGroup {
    title: string;
    cases: TestCase[];
}

function buildCases(today: Date): CaseGroup[] {
    return [
        {
            title: '1. Hard-date tasks (no recurrence)',
            cases: [
                {
                    name: 'Tier 1 hard-date due in 14d',
                    note: 'expect BACKLOG → RADAR (3d out) → MANDATORY (day-of)',
                    task: hardDate({tier: 1, dueOffset: 14, today}),
                },
                {
                    name: 'Tier 3 hard-date due in 1d',
                    note: 'expect RADAR → MANDATORY tomorrow',
                    task: hardDate({tier: 3, dueOffset: 1, today}),
                },
                {
                    name: 'Tier 4 hard-date due in 7d',
                    note: 'expect BACKLOG → RADAR (last 3) → MANDATORY',
                    task: hardDate({tier: 4, dueOffset: 7, today}),
                },
            ],
        },
        {
            title: '2. Flexible window tasks',
            cases: [
                {
                    name: 'Tier 2 monthly window, suggested = day 0, deadline = +28d',
                    note: 'past suggested → SUGGESTED; <50% w/ tier ≤ 2 → RADAR; <25% → RADAR',
                    task: flexWindow({
                        tier: 2,
                        suggestedOffset: 0,
                        deadlineOffset: 28,
                        windowLengthDays: 28,
                        today,
                    }),
                },
                {
                    name: 'Tier 3 monthly window, suggested in 14d, deadline +28d',
                    note: 'BACKLOG → SUGGESTED at day 14 → RADAR (<25%) → MANDATORY (deadline)',
                    task: flexWindow({
                        tier: 3,
                        suggestedOffset: 14,
                        deadlineOffset: 28,
                        windowLengthDays: 28,
                        today,
                    }),
                },
                {
                    name: 'Tier 4 yearly window, suggested in 7d, deadline +30d',
                    note: 'tier 4 doesn’t escalate from snooze; baseline only',
                    task: flexWindow({
                        tier: 4,
                        suggestedOffset: 7,
                        deadlineOffset: 30,
                        windowLengthDays: 30,
                        today,
                    }),
                },
            ],
        },
        {
            title: '3. Daily / multiple-per-day',
            cases: [
                {
                    name: 'Daily task',
                    note: 'always MANDATORY when not yet completed',
                    task: recurringTask({
                        tier: 2,
                        cadence: 'daily',
                        frequencyPerPeriod: 1,
                        scheduleMode: 'fixed',
                        today,
                    }),
                },
                {
                    name: '3× per day',
                    note: 'always MANDATORY until 3 done',
                    task: recurringTask({
                        tier: 1,
                        cadence: 'multiple_per_day',
                        frequencyPerPeriod: 3,
                        scheduleMode: 'fixed',
                        today,
                    }),
                },
            ],
        },
        {
            title: '4. Multiple-per-period (ratio band)',
            cases: [
                {
                    name: '3× per week, 0 done, fresh week',
                    note: 'ratio = 3/daysLeft; expect MANDATORY late week',
                    task: multiPerPeriod({
                        tier: 2,
                        cadence: 'multiple_per_week',
                        frequencyPerPeriod: 3,
                        completionsThisPeriod: 0,
                        today,
                    }),
                },
                {
                    name: '3× per week, 2 done, fresh week',
                    note: 'remaining=1; lower ratio',
                    task: multiPerPeriod({
                        tier: 2,
                        cadence: 'multiple_per_week',
                        frequencyPerPeriod: 3,
                        completionsThisPeriod: 2,
                        today,
                    }),
                },
                {
                    name: '2× per month, 0 done',
                    note: 'long horizon — expect mostly BACKLOG → RADAR late month',
                    task: multiPerPeriod({
                        tier: 3,
                        cadence: 'multiple_per_month',
                        frequencyPerPeriod: 2,
                        completionsThisPeriod: 0,
                        today,
                    }),
                },
            ],
        },
        {
            title: '5. Snooze escalation (no other urgency signal)',
            cases: [
                {
                    name: 'Tier 1 hard-date 30d out, snooze=1',
                    note: 'tier 1 + 1 snooze ⇒ at minimum RADAR',
                    task: hardDate({tier: 1, dueOffset: 30, today, snoozeCount: 1}),
                },
                {
                    name: 'Tier 1 hard-date 30d out, snooze=3',
                    note: 'tier 1 + 3 snoozes ⇒ at minimum SUGGESTED',
                    task: hardDate({tier: 1, dueOffset: 30, today, snoozeCount: 3}),
                },
                {
                    name: 'Tier 1 hard-date 30d out, snooze=5',
                    note: 'tier 1 + 5 snoozes ⇒ MANDATORY regardless of date',
                    task: hardDate({tier: 1, dueOffset: 30, today, snoozeCount: 5}),
                },
                {
                    name: 'Tier 4 hard-date 30d out, snooze=10',
                    note: 'tier 4 never escalates from snooze',
                    task: hardDate({tier: 4, dueOffset: 30, today, snoozeCount: 10}),
                },
            ],
        },
        {
            title: '6. Completion / snooze hides task',
            cases: [
                {
                    name: 'Hard-date completed today',
                    note: 'expect HIDDEN every day',
                    task: hardDate({tier: 2, dueOffset: 5, today, completedAt: today}),
                },
                {
                    name: 'Hard-date snoozed for 3 days',
                    note: 'expect HIDDEN until snooze expires',
                    task: hardDate({tier: 2, dueOffset: 10, today, snoozedUntil: addDays(today, 3)}),
                },
            ],
        },
    ];
}

// ── Task builders ───────────────────────────────────────────────────────────

interface HardDateOpts {
    tier: 1 | 2 | 3 | 4;
    dueOffset: number;
    today: Date;
    snoozeCount?: number;
    snoozedUntil?: Date | null;
    completedAt?: Date | null;
}

function hardDate(o: HardDateOpts): Task {
    return baseTask({
        consequenceTier: o.tier,
        windowType: 'hard',
        suggestedDate: addDays(o.today, o.dueOffset).getTime(),
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: null,
        snoozeCount: o.snoozeCount ?? 0,
        snoozedUntil: o.snoozedUntil ? o.snoozedUntil.getTime() : null,
        completedAt: o.completedAt ? o.completedAt.getTime() : null,
    });
}

interface FlexWindowOpts {
    tier: 1 | 2 | 3 | 4;
    suggestedOffset: number;
    deadlineOffset: number;
    windowLengthDays: number;
    today: Date;
    snoozeCount?: number;
}

function flexWindow(o: FlexWindowOpts): Task {
    return baseTask({
        consequenceTier: o.tier,
        windowType: 'flexible',
        suggestedDate: addDays(o.today, o.suggestedOffset).getTime(),
        windowDeadline: addDays(o.today, o.deadlineOffset).getTime(),
        windowLengthDays: o.windowLengthDays,
        recurrence: null,
        snoozeCount: o.snoozeCount ?? 0,
    });
}

interface RecurringOpts {
    tier: 1 | 2 | 3 | 4;
    cadence: RecurrenceConfig['cadence'];
    frequencyPerPeriod: number;
    scheduleMode: RecurrenceConfig['scheduleMode'];
    today: Date;
}

function recurringTask(o: RecurringOpts): Task {
    const period = getCurrentPeriod(o.cadence, o.today);
    return baseTask({
        consequenceTier: o.tier,
        windowType: 'flexible',
        suggestedDate: period.start,
        windowDeadline: period.end,
        windowLengthDays: period.lengthDays,
        recurrence: {
            cadence: o.cadence,
            frequencyPerPeriod: o.frequencyPerPeriod,
            scheduleMode: o.scheduleMode,
        },
        currentPeriodStart: period.start,
        completionsThisPeriod: 0,
    });
}

interface MultiPerPeriodOpts {
    tier: 1 | 2 | 3 | 4;
    cadence: 'multiple_per_day' | 'multiple_per_week' | 'multiple_per_month'
        | 'multiple_per_quarter' | 'multiple_per_year';
    frequencyPerPeriod: number;
    completionsThisPeriod: number;
    today: Date;
}

function multiPerPeriod(o: MultiPerPeriodOpts): Task {
    const period = getCurrentPeriod(o.cadence, o.today);
    return baseTask({
        consequenceTier: o.tier,
        windowType: 'flexible',
        suggestedDate: period.start,
        windowDeadline: period.end,
        windowLengthDays: period.lengthDays,
        recurrence: {
            cadence: o.cadence,
            frequencyPerPeriod: o.frequencyPerPeriod,
            scheduleMode: 'fixed',
        },
        currentPeriodStart: period.start,
        completionsThisPeriod: o.completionsThisPeriod,
    });
}

function baseTask(overrides: Partial<Task>): Task {
    return {
        id: 'test',
        projectId: 'test',
        title: 'test',
        description: '',
        consequenceTier: 3,
        windowType: 'flexible',
        suggestedDate: null,
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: null,
        currentPeriodStart: null,
        completionsThisPeriod: 0,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        createdAt: Date.now(),
        priority: 'medium',
        dueDate: null,
        ...overrides,
    } as Task;
}

// ── Date helpers ────────────────────────────────────────────────────────────

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function range(start: number, end: number): number[] {
    const r: number[] = [];
    for (let i = start; i <= end; i++) r.push(i);
    return r;
}

function formatOffset(d: number): string {
    if (d === 0) return 'TODAY';
    if (d > 0) return `+${d}`;
    return `${d}`;
}

function bandGlyph(band: DailyBand): string {
    switch (band) {
        case 'mandatory': return 'M';
        case 'suggested': return 'S';
        case 'radar':     return 'R';
        case 'backlog':   return '·';
        case 'hidden':    return '–';
    }
}
