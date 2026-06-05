import { html } from "element-vir";
import { defineBookPage } from "element-book";
import { AreaCardElement } from "../../components/area-card.element.js";
import type { ItemKind, Area, Task } from "../../data/types.js";

const NOW = Date.now();
const DAY = 86_400_000;

function makeArea(overrides: Partial<Area> & { name: string }): Area {
    return {
        id: Math.random().toString(36).slice(2),
        description: "",
        colorKey: "navy",
        createdAt: NOW - DAY * 30,
        ...overrides,
    };
}

function makeTask(
    areaId: string,
    overrides: Partial<Task> & { title: string },
): Task {
    return {
        id: Math.random().toString(36).slice(2),
        areaId,
        description: "",
        timeOfDay: "anytime",
        kind: "task" as ItemKind,
        consequenceTier: 2,
        deadlineType: "flexible", isMilestone: false,
        suggestedDate: null,
        windowDeadline: null,
        windowLengthDays: null,
        recurrence: null,
        currentPeriodStart: null,
        completionsThisPeriod: 0,
        totalCompletions: 0,
        progressCount: 0,
        pausedUntil: null,
        pausedIndefinitely: false,
        snoozeCount: 0,
        snoozedUntil: null,
        totalSnoozes: 0,
        totalSkips: 0,
        totalMisses: 0,
        missedAt: null,
        taskCompletionStreak: 0,
        maxTaskCompletionStreak: 0,
        skipStreak: 0,
        remediationCount: 0,
        completedAt: null,
        createdAt: NOW - DAY,
        dueDate: null,
        ...overrides,
    };
}

export const areaCardPage = defineBookPage({
    parent: undefined,
    title: "Area Card",
    defineExamples({ defineExample }) {
        defineExample({
            title: "Navy — mixed tasks",
            render() {
                const p = makeArea({
                    name: "Homeowner",
                    colorKey: "navy",
                    description: "Property maintenance and upkeep",
                });
                return html`
                    <div style="max-width:380px">
                        <${AreaCardElement.assign({
                            activeSkinId: 'bcr',
                            area: p,
                            tasks: [
                                makeTask(p.id, { title: "Fix leaking faucet" }),
                                makeTask(p.id, { title: "Clean gutters" }),
                                makeTask(p.id, {
                                    title: "Mow lawn",
                                    completedAt: NOW - 3600_000,
                                }),
                            ],
                        })}></${AreaCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: "Red — with overdue task",
            render() {
                const p = makeArea({
                    name: "Finances",
                    colorKey: "red",
                    description: "Bills, taxes, and investments",
                });
                return html`
                    <div style="max-width:380px">
                        <${AreaCardElement.assign({
                            activeSkinId: 'bcr',
                            area: p,
                            tasks: [
                                makeTask(p.id, {
                                    title: "Pay credit card",
                                    consequenceTier: 1,
                                    deadlineType: "rigid", isMilestone: false,
                                    suggestedDate: NOW - DAY * 2,
                                }),
                                makeTask(p.id, {
                                    title: "Review budget",
                                    consequenceTier: 3,
                                }),
                            ],
                        })}></${AreaCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: "Gold — all cleared",
            render() {
                const p = makeArea({ name: "Health", colorKey: "gold" });
                return html`
                    <div style="max-width:380px">
                        <${AreaCardElement.assign({
                            activeSkinId: 'bcr',
                            area: p,
                            tasks: [
                                makeTask(p.id, {
                                    title: "Morning run",
                                    completedAt: NOW - 7200_000,
                                }),
                                makeTask(p.id, {
                                    title: "Take vitamins",
                                    completedAt: NOW - 3600_000,
                                }),
                                makeTask(p.id, {
                                    title: "Drink 8 glasses of water",
                                    completedAt: NOW - 1800_000,
                                }),
                            ],
                        })}></${AreaCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: "Olive — no tasks yet",
            render() {
                const p = makeArea({
                    name: "Self-Development",
                    colorKey: "olive",
                    description: "Reading, learning, and growth",
                });
                return html`
                    <div style="max-width:380px">
                        <${AreaCardElement.assign({
                            activeSkinId: 'bcr',
                            area: p,
                            tasks: [],
                        })}></${AreaCardElement}>
                    </div>
                `;
            },
        });
        defineExample({
            title: "Slate — critically snoozed task",
            render() {
                const p = makeArea({ name: "Vehicle", colorKey: "slate" });
                return html`
                    <div style="max-width:380px">
                        <${AreaCardElement.assign({
                            activeSkinId: 'bcr',
                            area: p,
                            tasks: [
                                makeTask(p.id, {
                                    title: "Oil change",
                                    snoozeCount: 6,
                                    snoozedUntil: NOW + DAY,
                                }),
                                makeTask(p.id, { title: "Rotate tires" }),
                            ],
                        })}></${AreaCardElement}>
                    </div>
                `;
            },
        });
    },
});
