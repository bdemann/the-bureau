const DARK_MODE_KEY = 'bureau-dark-mode';

// Dark-mode overrides applied on top of whatever skin is active.
// Colors are tuned to preserve the cold-war bureaucratic feel on dark backgrounds.
const DARK_MODE_CSS_VARS: Record<string, string> = {
    '--color-primary':       '#8BAACC',
    '--color-primary-hover': '#A8C4E0',
    '--color-primary-rgb':   '139, 170, 204',
    '--color-surface':       '#131A24',
    '--color-card':          '#1C2636',
    '--color-input-bg':      '#212F42',
    '--color-text':          '#E4DDD0',
    '--color-text-muted':    '#9A968E',
    '--color-text-faint':    '#5E5B56',
    '--color-danger':        '#E0445A',
    '--color-danger-dark':   '#C41E3A',
    '--color-danger-rgb':    '224, 68, 90',
    '--color-warning':       '#C89A14',
    '--color-success':       '#3E9142',
    '--color-success-dark':  '#2E7D32',
    '--color-snooze':        '#E8821A',
};

export function loadDarkMode(): boolean {
    try {
        return localStorage.getItem(DARK_MODE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function saveDarkMode(enabled: boolean): void {
    try {
        localStorage.setItem(DARK_MODE_KEY, String(enabled));
    } catch {
        // Storage unavailable — ignore.
    }
}

/** Apply or remove dark-mode CSS var overrides on :root. Call after setActiveSkin. */
export function applyDarkMode(enabled: boolean): void {
    const root = document.documentElement;
    if (enabled) {
        for (const [name, value] of Object.entries(DARK_MODE_CSS_VARS)) {
            root.style.setProperty(name, value);
        }
    } else {
        for (const name of Object.keys(DARK_MODE_CSS_VARS)) {
            root.style.removeProperty(name);
        }
    }
}
