import type {Skin} from './skins/types.js';

const DARK_MODE_KEY = 'bureau-dark-mode';

// Tracks which skin-specific dark vars were applied so they can be cleaned up
// when dark mode is toggled off or the skin changes.
let _appliedSkinDarkVarNames: string[] = [];

// Dark-mode overrides applied on top of whatever skin is active.
//
// Palette philosophy: "classified document by lamplight."
// Inspired by benjamindemann.com's warm dark theme (#2e2b26 bg, #ccae99 text)
// and VS Code Dark+'s layered neutral darks with desaturated-but-readable accents.
// Never pure black, never pure white — warm temperature throughout.
//
// IMPORTANT: only the canvas (surfaces, text, chrome, borders) is overridden here.
// Accent/semantic colors (warning, danger, success, snooze) are intentionally left
// to the active skin so each skin stays visually distinct in dark mode.
// Primary is overridden because all skins use near-black primaries that would be
// invisible as text on dark surfaces.
const DARK_MODE_CSS_VARS: Record<string, string> = {
    // Surfaces — warm dark browns (like aged paper in dim light)
    '--color-surface':       '#1E1B17',
    '--color-card':          '#28241F',
    '--color-input-bg':      '#302C26',

    // Text — warm cream, NOT cold gray or pure white
    '--color-text':          '#D4CABC',
    '--color-text-muted':    '#8A8076',
    '--color-text-faint':    '#524C46',

    // Primary — warm tan/amber; all skins use near-black primaries that are
    // invisible on dark surfaces, so we lift it to a readable warm tone.
    '--color-primary':       '#A08060',
    '--color-primary-hover': '#B89C78',
    '--color-primary-rgb':   '160, 128, 96',

    // Chrome — header/nav bar matches primary so the whole UI stays warm.
    // Text flips to dark to stay readable on tan.
    '--color-chrome':            '#A08060',
    '--color-chrome-text':       '#1E1B17',
    '--color-chrome-text-rgb':   '30, 27, 23',

    // Borders & tints — switch to white-channel so they're visible on dark backgrounds
    '--color-surface-tint':  'rgba(255, 255, 255, 0.05)',
    '--color-border-subtle': 'rgba(255, 255, 255, 0.09)',
    '--color-border':        'rgba(255, 255, 255, 0.13)',
    '--color-border-strong': 'rgba(255, 255, 255, 0.20)',
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
export function applyDarkMode(enabled: boolean, skin?: Skin): void {
    const root = document.documentElement;
    if (enabled) {
        for (const [name, value] of Object.entries(DARK_MODE_CSS_VARS)) {
            root.style.setProperty(name, value);
        }
        // Remove any previously applied skin dark vars before applying new ones.
        for (const name of _appliedSkinDarkVarNames) {
            root.style.removeProperty(name);
        }
        _appliedSkinDarkVarNames = [];
        if (skin?.darkCssVars) {
            for (const [name, value] of Object.entries(skin.darkCssVars)) {
                root.style.setProperty(name, value);
                _appliedSkinDarkVarNames.push(name);
            }
        }
    } else {
        for (const name of Object.keys(DARK_MODE_CSS_VARS)) {
            root.style.removeProperty(name);
        }
        for (const name of _appliedSkinDarkVarNames) {
            root.style.removeProperty(name);
        }
        _appliedSkinDarkVarNames = [];
    }
}
