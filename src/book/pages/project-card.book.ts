import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {ProjectCardElement} from '../../components/project-card.element.js';
import type {Project, Task} from '../../data/types.js';

const NOW = Date.now();
const DAY = 86_400_000;

function makeProject(overrides: Partial<Project> & {name: string}): Project {
    return {
        id: Math.random().toString(36).slice(2),
        description: '',
        colorKey: 'navy',
        createdAt: NOW - DAY * 30,
        ...overrides,
    };
}

function makeTask(projectId: string, overrides: Partial<Task> & {title: string}): Task {
    return {
        id: Math.random().toString(36).slice(2),
        projectId,
        description: '',
        consequenceTier: 2,
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
        createdAt: NOW - DAY,
        priority: 'medium',
        dueDate: null,
        ...overrides,
    };
}

export const projectCardPage = defineBookPage({
    parent: undefined,
    title: 'Project Card',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Navy — mixed tasks',
            render() {
                const p = makeProject({name: 'Homeowner', colorKey: 'navy', description: 'Property maintenance and upkeep'});
                return html`
                    <div style="max-width:380px">
                        <${ProjectCardElement.assign({
                            project: p,
                            tasks: [
                                makeTask(p.id, {title: 'Fix leaking faucet'}),
                                makeTask(p.id, {title: 'Clean gutters'}),
                                makeTask(p.id, {title: 'Mow lawn', completedAt: NOW - 3600_000}),
                            ],
                        })}></${ProjectCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: 'Red — with overdue task',
            render() {
                const p = makeProject({name: 'Finances', colorKey: 'red', description: 'Bills, taxes, and investments'});
                return html`
                    <div style="max-width:380px">
                        <${ProjectCardElement.assign({
                            project: p,
                            tasks: [
                                makeTask(p.id, {title: 'Pay credit card', consequenceTier: 1, windowType: 'hard', suggestedDate: NOW - DAY * 2}),
                                makeTask(p.id, {title: 'Review budget', consequenceTier: 3}),
                            ],
                        })}></${ProjectCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: 'Gold — all cleared',
            render() {
                const p = makeProject({name: 'Health', colorKey: 'gold'});
                return html`
                    <div style="max-width:380px">
                        <${ProjectCardElement.assign({
                            project: p,
                            tasks: [
                                makeTask(p.id, {title: 'Morning run', completedAt: NOW - 7200_000}),
                                makeTask(p.id, {title: 'Take vitamins', completedAt: NOW - 3600_000}),
                                makeTask(p.id, {title: 'Drink 8 glasses of water', completedAt: NOW - 1800_000}),
                            ],
                        })}></${ProjectCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: 'Olive — no tasks yet',
            render() {
                const p = makeProject({name: 'Self-Development', colorKey: 'olive', description: 'Reading, learning, and growth'});
                return html`
                    <div style="max-width:380px">
                        <${ProjectCardElement.assign({
                            project: p,
                            tasks: [],
                        })}></${ProjectCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: 'Slate — critically snoozed task',
            render() {
                const p = makeProject({name: 'Vehicle', colorKey: 'slate'});
                return html`
                    <div style="max-width:380px">
                        <${ProjectCardElement.assign({
                            project: p,
                            tasks: [
                                makeTask(p.id, {title: 'Oil change', snoozeCount: 6, snoozedUntil: NOW + DAY}),
                                makeTask(p.id, {title: 'Rotate tires'}),
                            ],
                        })}></${ProjectCardElement}>
                    </div>
                `;
            },
        });
    },
});
