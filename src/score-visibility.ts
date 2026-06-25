const HIDE_SCORE_KEY = 'bureau-hide-score';

/**
 * Cosmetic preference: when true, the patriot score (number, rank/streak label,
 * and progress bar) is hidden from the header. The score is still calculated,
 * stored, and reported — only the on-screen display changes.
 */
export function loadHideScore(): boolean {
    try {
        return localStorage.getItem(HIDE_SCORE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function saveHideScore(enabled: boolean): void {
    try {
        localStorage.setItem(HIDE_SCORE_KEY, String(enabled));
    } catch {
        // Storage unavailable — ignore.
    }
}
