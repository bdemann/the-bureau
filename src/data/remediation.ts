// ─────────────────────────────────────────────────────────────────────────────
// Remediation logic
//
// When a commitment with a skip or snooze streak is completed for the first
// time after that streak, it enters a "remediation" phase.  The agent must
// demonstrate consecutive commitment before the record is cleared.
//
// Key rules
// ─────────
// 1. On completion when a streak/snooze is present and NOT yet in remediation:
//    remediationCount = max(skipStreak, snoozeCount).
//    Also resets skipStreak → 0 and snoozeCount → 0 (the task was done).
//
// 2. On completion while already in remediation:
//    remediationCount = max(0, remediationCount - 1).
//    When it hits 0 the task is fully cleared.
//
// 3. On skip/snooze while in remediation:
//    The *new* streak starts at remediationCount (not at 1).
//    remediationCount is then set to 0 (the streak itself will track things now).
// ─────────────────────────────────────────────────────────────────────────────

export interface RemediationOnCompleteResult {
    /** New skipStreak value (0 once a completion is recorded). */
    skipStreak: number;
    /** New snoozeCount value (0 once a completion is recorded). */
    snoozeCount: number;
    /** Updated remediation counter. */
    remediationCount: number;
}

/**
 * Compute the new remediation/streak state after a task is **completed**.
 *
 * @param skipStreak     - current skip streak
 * @param snoozeCount    - current snooze count
 * @param remediationCount - current remediation count
 */
export function computeRemediationOnComplete(
    skipStreak: number,
    snoozeCount: number,
    remediationCount: number,
): RemediationOnCompleteResult {
    const hasStreak = skipStreak > 0 || snoozeCount > 0;

    if (remediationCount > 0) {
        // Already in remediation — make progress.
        return {
            skipStreak: 0,
            snoozeCount: 0,
            remediationCount: Math.max(0, remediationCount - 1),
        };
    }

    if (hasStreak) {
        // First completion after a streak — enter remediation.
        const newRemediation = Math.max(skipStreak, snoozeCount);
        return {
            skipStreak: 0,
            snoozeCount: 0,
            remediationCount: newRemediation,
        };
    }

    // No streak, not in remediation — nothing to do.
    return {skipStreak, snoozeCount, remediationCount: 0};
}

export interface RemediationOnSkipResult {
    /** New skipStreak — starts at remediationCount if was in remediation. */
    skipStreak: number;
    /** remediationCount cleared now that a skip streak takes over. */
    remediationCount: number;
}

/**
 * Compute the new state after a task is **skipped**.
 *
 * If the task was in remediation, the new skip streak starts at the current
 * remediation level instead of 1.
 */
export function computeRemediationOnSkip(
    currentSkipStreak: number,
    remediationCount: number,
): RemediationOnSkipResult {
    if (remediationCount > 0) {
        // Start the skip streak from the remediation level (not from 1).
        return {
            skipStreak: remediationCount,
            remediationCount: 0,
        };
    }
    return {
        skipStreak: currentSkipStreak + 1,
        remediationCount: 0,
    };
}

export interface RemediationOnSnoozeResult {
    /** New snoozeCount — starts at remediationCount if was in remediation. */
    snoozeCount: number;
    /** remediationCount cleared now that a snooze streak takes over. */
    remediationCount: number;
}

/**
 * Compute the new state after a task is **snoozed**.
 *
 * If the task was in remediation, the new snooze count starts at the current
 * remediation level instead of 1.
 */
export function computeRemediationOnSnooze(
    currentSnoozeCount: number,
    remediationCount: number,
): RemediationOnSnoozeResult {
    if (remediationCount > 0) {
        // Start the snooze count from the remediation level (not from 1).
        return {
            snoozeCount: remediationCount,
            remediationCount: 0,
        };
    }
    return {
        snoozeCount: currentSnoozeCount + 1,
        remediationCount: 0,
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
