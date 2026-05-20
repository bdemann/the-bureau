import {assert} from '@augment-vir/assert';
import {describe, test} from 'node:test';
import {
    countActiveTasks,
    missPenalty,
    skipPenalty,
    snoozePenalty,
    taskScaleMultiplier,
    tierCompletionReward,
} from './scoring.js';
import type {Task} from './types.js';

// Minimal task stub for tests.
function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: 'test',
        projectId: null,
        title: 'Test',
        description: '',
        timeOfDay: 'anytime',
        kind: 'task',
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
        completedAt: null,
        createdAt: Date.now(),
        dueDate: null,
        ...overrides,
    };
}

describe('penalty ordering: miss > skip > snooze (first snooze)', () => {
    test('tier 1', () => {
        assert.isAbove(missPenalty(1), skipPenalty(1));
        assert.isAbove(skipPenalty(1), snoozePenalty(1));
    });
    test('tier 2', () => {
        assert.isAbove(missPenalty(2), skipPenalty(2));
        assert.isAbove(skipPenalty(2), snoozePenalty(2));
    });
    test('tier 3', () => {
        assert.isAbove(missPenalty(3), skipPenalty(3));
        assert.isAbove(skipPenalty(3), snoozePenalty(3));
    });
    test('tier 4', () => {
        assert.isAbove(missPenalty(4), skipPenalty(4));
        assert.isAbove(skipPenalty(4), snoozePenalty(4));
    });
});

describe('penalty ordering: higher tier = higher values', () => {
    test('completion reward', () => {
        assert.isAbove(tierCompletionReward(1), tierCompletionReward(2));
        assert.isAbove(tierCompletionReward(2), tierCompletionReward(3));
        assert.isAbove(tierCompletionReward(3), tierCompletionReward(4));
    });
    test('miss penalty', () => {
        assert.isAbove(missPenalty(1), missPenalty(2));
        assert.isAbove(missPenalty(2), missPenalty(3));
        assert.isAbove(missPenalty(3), missPenalty(4));
    });
    test('skip penalty', () => {
        assert.isAbove(skipPenalty(1), skipPenalty(2));
        assert.isAbove(skipPenalty(2), skipPenalty(3));
        assert.isAbove(skipPenalty(3), skipPenalty(4));
    });
    test('snooze penalty', () => {
        assert.isAbove(snoozePenalty(1), snoozePenalty(2));
        assert.isAbove(snoozePenalty(2), snoozePenalty(3));
        assert.isAbove(snoozePenalty(3), snoozePenalty(4));
    });
});

describe('taskScaleMultiplier', () => {
    test('1.0 at reference count (10)', () => {
        assert.strictEquals(taskScaleMultiplier(10), 1);
    });
    test('> 1 with fewer than 10 tasks', () => {
        assert.isAbove(taskScaleMultiplier(5), 1);
        assert.isAbove(taskScaleMultiplier(1), 1);
    });
    test('< 1 with more than 10 tasks', () => {
        assert.isBelow(taskScaleMultiplier(20), 1);
    });
    test('total daily impact is constant regardless of task count', () => {
        // N tasks × base × (10/N) = 10 × base, independent of N.
        const base = tierCompletionReward(3);
        const impact5  = 5  * base * taskScaleMultiplier(5);
        const impact10 = 10 * base * taskScaleMultiplier(10);
        const impact20 = 20 * base * taskScaleMultiplier(20);
        assert.strictEquals(Math.round(impact5 * 100), Math.round(impact10 * 100));
        assert.strictEquals(Math.round(impact10 * 100), Math.round(impact20 * 100));
    });
    test('floors at 1 task (no divide-by-zero)', () => {
        assert.strictEquals(taskScaleMultiplier(0), taskScaleMultiplier(1));
    });
});

describe('countActiveTasks', () => {
    test('counts incomplete non-missed non-paused tasks', () => {
        const tasks = [
            makeTask({id: 'a'}),
            makeTask({id: 'b'}),
        ];
        assert.strictEquals(countActiveTasks(tasks), 2);
    });
    test('excludes completed tasks', () => {
        const tasks = [
            makeTask({id: 'a', completedAt: Date.now()}),
            makeTask({id: 'b'}),
        ];
        assert.strictEquals(countActiveTasks(tasks), 1);
    });
    test('excludes missed tasks', () => {
        const tasks = [
            makeTask({id: 'a', missedAt: Date.now()}),
            makeTask({id: 'b'}),
        ];
        assert.strictEquals(countActiveTasks(tasks), 1);
    });
    test('excludes indefinitely paused tasks', () => {
        const tasks = [
            makeTask({id: 'a', pausedIndefinitely: true}),
            makeTask({id: 'b'}),
        ];
        assert.strictEquals(countActiveTasks(tasks), 1);
    });
    test('excludes timed-paused tasks', () => {
        const tasks = [
            makeTask({id: 'a', pausedUntil: Date.now() + 86_400_000}),
            makeTask({id: 'b'}),
        ];
        assert.strictEquals(countActiveTasks(tasks), 1);
    });
    test('minimum return value is 1', () => {
        assert.strictEquals(countActiveTasks([]), 1);
        assert.strictEquals(countActiveTasks([makeTask({completedAt: Date.now()})]), 1);
    });
});
