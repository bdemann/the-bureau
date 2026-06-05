// ─────────────────────────────────────────────────────────────────────────────
// Export / import — pure functions + browser download helper.
// No I/O except triggerDownload (DOM) and parseImport (JSON.parse).
// ─────────────────────────────────────────────────────────────────────────────

import type {AnyCommitment, AppState, Goal, Idea, RecurrenceConfig, Task} from './types.js';
import {getDailyBand} from './urgency.js';
import {getTodayString} from './storage.js';

// ── CSV export ───────────────────────────────────────────────────────────────

const CSV_HEADERS = [
    'id', 'kind', 'title', 'area',
    'tier', 'deadlineType', 'isMilestone',
    'cadence', 'scheduleMode', 'anchorDays',
    'timeOfDay',
    'suggestedDate', 'windowDeadline', 'leadTimeDays',
    'snoozeCount', 'skipStreak',
    'totalMisses', 'totalSnoozes', 'totalSkips',
    'completionStreak', 'currentBand', 'paused', 'notes',
] as const;

export function buildCsvExport(state: AppState): string {
    const areaMap = new Map(state.areas.map(a => [a.id, a.name]));
    const today   = new Date();

    const rows = state.commitments.map(c => commitmentRow(c, areaMap, today));
    return [CSV_HEADERS.join(','), ...rows].join('\n');
}

function commitmentRow(
    c: AnyCommitment,
    areaMap: Map<string, string>,
    today: Date,
): string {
    const area = escapeCsv(c.areaId ? (areaMap.get(c.areaId) ?? '') : '');

    if (c.kind === 'goal') {
        return [
            c.id, 'goal', escapeCsv(c.title), area,
            '', '', '', '', '', '',  // tier, deadlineType, isMilestone, cadence, scheduleMode, anchorDays
            '',                   // timeOfDay
            fmtDate(c.targetDate), '', '',  // suggestedDate (target), windowDeadline, leadTime
            '', '',               // snoozeCount, skipStreak
            '', '', '',           // totalMisses, totalSnoozes, totalSkips
            '', '', '',           // completionStreak, currentBand, paused
            escapeCsv(c.status),  // notes = goal status
        ].join(',');
    }

    if (c.kind === 'idea') {
        return [
            c.id, 'idea', escapeCsv(c.title), area,
            '', '', '', '', '', '',
            '',
            '', '', '',
            '', '',
            '', '', '',
            '', '', '', '',
        ].join(',');
    }

    // task or routine
    const t = c as Task;
    const paused =
        t.pausedIndefinitely ? 'indefinite'
        : t.pausedUntil      ? `until ${fmtDate(t.pausedUntil)}`
        :                      'no';

    return [
        t.id,
        t.kind,
        escapeCsv(t.title),
        area,
        t.consequenceTier,
        t.deadlineType,
        t.isMilestone,
        t.recurrence?.cadence ?? 'one-time',
        t.recurrence?.scheduleMode ?? '',
        escapeCsv(fmtAnchor(t.recurrence ?? null)),
        t.timeOfDay,
        fmtDate(t.suggestedDate),
        fmtDate(t.windowDeadline),
        fmtLeadTime(t.leadTimeDays),
        t.snoozeCount,
        t.skipStreak,
        t.totalMisses,
        t.totalSnoozes,
        t.totalSkips,
        t.taskCompletionStreak,
        getDailyBand(t, today),
        paused,
        '',  // notes (reserved)
    ].join(',');
}

// ── Anchor day formatting ────────────────────────────────────────────────────

const DAY_ABBR  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MON_ABBR  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const ORD_LABEL: Record<number, string> = {
    1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', [-1]: 'last',
};

function fmtAnchor(cfg: RecurrenceConfig | null): string {
    if (!cfg) return '';

    switch (cfg.cadence) {
        case 'weekly': {
            const days = cfg.hardDaysOfWeek
                ?? (cfg.hardDayOfWeek !== undefined ? [cfg.hardDayOfWeek] : null);
            return days ? days.map(d => DAY_ABBR[d]).join(',') : '';
        }

        case 'monthly':
        case 'quarterly': {
            // Ordinal weekday ("3rd Mon")
            if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
                const ord = ORD_LABEL[cfg.ordinalWeek] ?? String(cfg.ordinalWeek);
                const day = DAY_ABBR[cfg.hardDayOfWeek];
                if (cfg.cadence === 'quarterly' && cfg.hardMonthOfQuarter !== undefined) {
                    return `m${cfg.hardMonthOfQuarter + 1} ${ord} ${day}`;
                }
                return `${ord} ${day}`;
            }
            // Multi-day of month ("dom:1,15")
            if (cfg.hardDaysOfMonth && cfg.hardDaysOfMonth.length > 0) {
                const prefix = cfg.cadence === 'quarterly' && cfg.hardMonthOfQuarter !== undefined
                    ? `m${cfg.hardMonthOfQuarter + 1} ` : '';
                return `${prefix}dom:${cfg.hardDaysOfMonth.join(',')}`;
            }
            // Single day of month
            if (cfg.hardDayOfMonth !== undefined) {
                const prefix = cfg.cadence === 'quarterly' && cfg.hardMonthOfQuarter !== undefined
                    ? `m${cfg.hardMonthOfQuarter + 1} ` : '';
                return `${prefix}dom:${cfg.hardDayOfMonth}`;
            }
            return '';
        }

        case 'annually': {
            const mon = cfg.hardMonthOfYear !== undefined ? MON_ABBR[cfg.hardMonthOfYear] : null;
            if (cfg.ordinalWeek !== undefined && cfg.hardDayOfWeek !== undefined) {
                const ord = ORD_LABEL[cfg.ordinalWeek] ?? String(cfg.ordinalWeek);
                const day = DAY_ABBR[cfg.hardDayOfWeek];
                return mon ? `${mon} ${ord} ${day}` : `${ord} ${day}`;
            }
            if (mon && cfg.hardDayOfMonth !== undefined) return `${mon} ${cfg.hardDayOfMonth}`;
            return mon ?? '';
        }

        default:
            return '';
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    return `bcr-clear-export-${getTodayString()}.csv`;
}

export function jsonFilename(): string {
    return `bcr-clear-backup-${getTodayString()}.json`;
}
