// Shared fixtures for unit tests. Build a Task in one line via makeTask({...}).

import type {RecurrenceConfig, Task} from './types.js';

export function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: 'task-id',
        projectId: 'proj-id',
        title: 'Test task',
        description: '',
        timeOfDay: 'anytime',
        consequenceTier: 3,
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
        createdAt: 0,
        priority: 'medium',
        dueDate: null,
        ...overrides,
    };
}

export function makeRecurrence(overrides: Partial<RecurrenceConfig> = {}): RecurrenceConfig {
    return {
        cadence: 'weekly',
        frequencyPerPeriod: 1,
        scheduleMode: 'fixed',
        endMode: 'never',
        ...overrides,
    };
}

/** Build a Date at local midnight from a YYYY-MM-DD string. Tests read clearer this way. */
export function date(yyyyMmDd: string): Date {
    return new Date(yyyyMmDd + 'T00:00:00');
}
