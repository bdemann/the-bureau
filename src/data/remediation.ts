// ─────────────────────────────────────────────────────────────────────────────
// Remediation logic
//
// When a commitment with a skip streak is completed for the first time after
// that streak, it enters a "remediation" phase.  The agent must demonstrate
// consecutive commitment before the record is cleared.
//
// Snooze count is tracked separately (drives the snooze indicator) but does
// NOT trigger remediation.  Completing a task always resets snooze count.
//
// Key rules
// ─────────
// 1. On completion when skipStreak ≥ threshold and NOT yet in remediation:
//    remediationCount = min(REMEDIATION_CAP, skipStreak).
//    skipStreak is preserved — NOT reset until remediation completes.
//
// 2. On completion while already in remediation:
//    remediationCount = max(0, remediationCount - 1).
//    When it hits 0 the task is fully cleared: skipStreak resets.
//
// 3. On skip while in remediation:
//    Streak increments normally (+1). remediationCount → 0.
//
// 4. Snoozed tasks: snoozeCount increments; remediation is unaffected.
// ─────────────────────────────────────────────────────────────────────────────

import {REMEDIATION_CAP, SKIP_ESCALATION_THRESHOLD} from './scoring.js';

export interface RemediationOnCompleteResult {
    /** New skipStreak value (0 once remediation clears). */
    skipStreak: number;
    /** New snoozeCount value — always 0 on completion. */
    snoozeCount: number;
    /** Updated remediation counter. */
    remediationCount: number;
}

/**
 * Compute the new remediation/streak state after a task is **completed**.
 *
 * @param skipStreak     - current skip streak
 * @param snoozeCount    - current snooze count (always cleared on completion)
 * @param remediationCount - current remediation count
 */
export function computeRemediationOnComplete(
    skipStreak: number,
    snoozeCount: number,
    remediationCount: number,
): RemediationOnCompleteResult {
    if (remediationCount > 0) {
        // Already in remediation — make progress. skipStreak only clears when done.
        const newCount = Math.max(0, remediationCount - 1);
        return {
            skipStreak: newCount === 0 ? 0 : skipStreak,
            snoozeCount: 0,
            remediationCount: newCount,
        };
    }

    // Grace period: fewer than SKIP_ESCALATION_THRESHOLD skips don't trigger
    // remediation — completing the task clears the record without penalty.
    if (skipStreak >= SKIP_ESCALATION_THRESHOLD) {
        // First completion after a skip streak — enter remediation. skipStreak preserved.
        return {
            skipStreak,
            snoozeCount: 0,
            remediationCount: Math.min(REMEDIATION_CAP, skipStreak),
        };
    }

    // Under the threshold — reset cleanly, no remediation.
    return {skipStreak: 0, snoozeCount: 0, remediationCount: 0};
}

export interface RemediationOnSkipResult {
    /** New skipStreak value. */
    skipStreak: number;
    /** remediationCount cleared now that a skip streak takes over. */
    remediationCount: number;
}

/**
 * Compute the new state after a task is **skipped**.
 */
export function computeRemediationOnSkip(
    currentSkipStreak: number,
    remediationCount: number,
): RemediationOnSkipResult {
    return {
        skipStreak: currentSkipStreak + 1,
        remediationCount: 0,
    };
}

export interface RemediationOnSnoozeResult {
    /** New snoozeCount — increments each time the task is snoozed. */
    snoozeCount: number;
}

/**
 * Compute the new state after a task is **snoozed**.
 *
 * Snoozed tasks only increment the snooze count; remediation is unaffected.
 */
export function computeRemediationOnSnooze(
    currentSnoozeCount: number,
): RemediationOnSnoozeResult {
    return {
        snoozeCount: currentSnoozeCount + 1,
    };
}

// ── Visual severity ───────────────────────────────────────────────────────────

export type RemediationSeverity = 'none' | 'low' | 'medium' | 'high';

/**
 * Visual severity based on how many completions are still needed.
 * 0    → none  (fully cleared)
 * 1–2  → low   (almost there)
 * 3–4  → medium
 * 5+   → high  (long way to go)
 */
export function getRemediationSeverity(remediationCount: number): RemediationSeverity {
    if (remediationCount === 0) return 'none';
    if (remediationCount <= 2)  return 'low';
    if (remediationCount <= 4)  return 'medium';
    return 'high';
}
