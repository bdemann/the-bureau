// ─────────────────────────────────────────────────────────────────────────────
// Export / import — pure functions + browser download helper.
// No I/O except triggerDownload (DOM) and parseImport (JSON.parse).
// ─────────────────────────────────────────────────────────────────────────────

import type {AppState, Task} from './types.js';
import {getDailyBand} from './urgency.js';
import {getTodayString} from './storage.js';

// ── CSV export ───────────────────────────────────────────────────────────────

const CSV_HEADERS = [
    'id', 'kind', 'title', 'area',
    'tier', 'windowType',
    'cadence', 'scheduleMode',
    'timeOfDay',
    'suggestedDate', 'windowDeadline', 'leadTimeDays',
    'snoozable', 'snoozeCount', 'skipStreak',
    'totalMisses', 'totalSnoozes', 'totalSkips',
    'completionStreak', 'currentBand', 'paused',
] as const;

export function buildCsvExport(state: AppState): string {
    const areaMap = new Map(state.areas.map(a => [a.id, a.name]));
    const today = new Date();

    const tasks = state.commitments.filter(
        (c): c is Task => c.kind === 'routine' || c.kind === 'task',
    );

    const rows = tasks.map(t => {
        const paused =
            t.pausedIndefinitely ? 'indefinite'
            : t.pausedUntil      ? `until ${fmtDate(t.pausedUntil)}`
            :                      'no';

        return [
            t.id,
            t.kind,
            escapeCsv(t.title),
            escapeCsv(t.areaId ? (areaMap.get(t.areaId) ?? '') : ''),
            t.consequenceTier,
            t.windowType,
            t.recurrence?.cadence ?? 'one-time',
            t.recurrence?.scheduleMode ?? '',
            t.timeOfDay,
            fmtDate(t.suggestedDate),
            fmtDate(t.windowDeadline),
            fmtLeadTime(t.leadTimeDays),
            t.disableSnooze ? 'disabled' : 'yes',
            t.snoozeCount,
            t.skipStreak,
            t.totalMisses,
            t.totalSnoozes,
            t.totalSkips,
            t.taskCompletionStreak,
            getDailyBand(t, today),
            paused,
        ].join(',');
    });

    return [CSV_HEADERS.join(','), ...rows].join('\n');
}

function fmtDate(ms: number | null | undefined): string {
    if (ms == null) return '';
    return new Date(ms).toISOString().slice(0, 10);
}

function fmtLeadTime(lt: number | null | undefined): string {
    if (lt === undefined) return 'default';
    if (lt === null)      return 'none';
    return String(lt);
}

function escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

// ── JSON export ──────────────────────────────────────────────────────────────

export function buildJsonExport(state: AppState): string {
    return JSON.stringify(state, null, 2);
}

// ── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse a raw JSON string and return the AppState if it looks valid.
 * Returns null on parse failure or if the object lacks a schemaVersion.
 * Caller is responsible for running migrateState() on the result.
 */
export function parseImport(raw: string): AppState | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('schemaVersion' in parsed)
        ) return null;
        return parsed as AppState;
    } catch {
        return null;
    }
}

// ── Browser download helper ──────────────────────────────────────────────────

export function triggerDownload(
    content: string,
    filename: string,
    mimeType: string,
): void {
    const blob = new Blob([content], {type: mimeType});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function csvFilename(): string {
    return `bcr-clear-tasks-${getTodayString()}.csv`;
}

export function jsonFilename(): string {
    return `bcr-clear-backup-${getTodayString()}.json`;
}
