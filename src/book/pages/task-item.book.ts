import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {TaskItemElement} from '../../components/task-item.element.js';
import type {ItemKind, Task} from '../../data/types.js';

const NOW = Date.now();
const DAY = 86_400_000;

function makeTask(overrides: Partial<Task> & {title: string}): Task {
    return {
        id: Math.random().toString(36).slice(2),
        projectId: 'p1',
        description: '',
        timeOfDay: 'anytime',
        kind: 'task' as ItemKind,
        consequenceTier: 2,
        windowType: 'flexible',
        suggestedDate: null,
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: null,
        currentPeriodStart: null,
        completionsThisPeriod: 0,
        totalCompletions: 0,
        progressCount: 0,
        snoozeCount: 0,
        snoozedUntil: null,
        completedAt: null,
        createdAt: NOW - DAY,
        dueDate: null,
        ...overrides,
    };
}

export const taskItemPage = defineBookPage({
    parent: undefined,
    title: 'Task Item',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Tier 1 — hard consequence (red)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({title: 'File quarterly tax return', consequenceTier: 1, windowType: 'hard', suggestedDate: NOW + DAY * 3}),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Tier 2 — soft consequence (orange)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({title: 'Schedule dentist appointment', consequenceTier: 2}),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Tier 3 — quality (gold)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({title: 'Read one chapter of current book', consequenceTier: 3}),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Tier 4 — aspirational (green)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({title: 'Learn 10 new vocabulary words', consequenceTier: 4}),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Overdue hard-date task',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Pay electric bill',
                            consequenceTier: 1,
                            windowType: 'hard',
                            suggestedDate: NOW - DAY * 2,
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Snoozed once (warning)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Call insurance company',
                            snoozeCount: 1,
                            snoozedUntil: NOW + DAY,
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Snoozed 3× (danger)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Fix garage door sensor',
                            snoozeCount: 4,
                            snoozedUntil: NOW + DAY,
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Snoozed 6× (critical — UNDER REVIEW)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Submit FEMA flood zone paperwork',
                            consequenceTier: 1,
                            snoozeCount: 6,
                            snoozedUntil: NOW + DAY,
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'With description',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Replace smoke detector batteries',
                            description: 'Master bedroom, hallway, and kitchen units all need new AA batteries.',
                            consequenceTier: 2,
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'With project tag',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({title: 'Trim hedges', consequenceTier: 3}),
                        projectName: 'Homeowner',
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Recurring weekly — progress chip + skip button',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Gym session',
                            consequenceTier: 3,
                            completionsThisPeriod: 1,
                            recurrence: {
                                cadence: 'weekly',
                                frequencyPerPeriod: 3,
                                scheduleMode: 'fixed',
                                endMode: 'never',
                                hardDayOfMonth: undefined,
                                ordinalWeek: undefined,
                            },
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Recurring daily — skip button, no window label',
            render() {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Morning pages',
                            consequenceTier: 3,
                            suggestedDate: todayStart.getTime(),
                            windowDeadline: todayEnd.getTime(),
                            recurrence: {
                                cadence: 'daily',
                                frequencyPerPeriod: 1,
                                scheduleMode: 'fixed',
                                endMode: 'never',
                                hardDayOfMonth: undefined,
                                ordinalWeek: undefined,
                            },
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
        defineExample({
            title: 'Cannot snooze (hard-date due today)',
            render() {
                return html`
                    <${TaskItemElement.assign({
                        task: makeTask({
                            title: 'Renew vehicle registration',
                            consequenceTier: 1,
                            windowType: 'hard',
                            suggestedDate: NOW - (NOW % DAY),
                        }),
                    })}></${TaskItemElement}>
                `;
            },
        });
    },
});
