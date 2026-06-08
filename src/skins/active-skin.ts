import type {Skin} from './types.js';
import type {Rank} from '../data/ranks.js';
import {bcrSkin} from './bcr.skin.js';

// ─────────────────────────────────────────────────────────────────────────────
// Active skin singleton
//
// Components call getActiveSkin() inside their render() to read strings.
// The skin is set once at startup (bureau-app.element.ts calls setActiveSkin).
// A full re-render is triggered automatically because bureau-app passes the
// skin id as an input to its children — changing the skin will cause all
// descendants to re-render with fresh strings.
//
// This intentionally avoids prop-drilling a Skin object into every component.
// Swap to a proper context provider later if the architecture demands it.
// ─────────────────────────────────────────────────────────────────────────────

let _activeSkin: Skin = bcrSkin;

export function getActiveSkin(): Skin {
    return _activeSkin;
}

/**
 * Swap the active skin and apply its CSS custom-property overrides to :root.
 * CSS custom properties pierce shadow DOM, so all components update immediately.
 *
 * Skins that want BCR's base look set cssVars to undefined — no overrides applied.
 * To switch back to BCR, call setActiveSkin(bcrSkin) which clears any prior overrides.
 */
export function setActiveSkin(skin: Skin): void {
    _activeSkin = skin;
    applyCssVars(skin.cssVars);
}

/**
 * The set of CSS variable names managed by the skin system.
 * When a skin without an override for a variable is activated, its :root value
 * is explicitly reset to the BCR default so previous skin values don't bleed through.
 */
const SKIN_CSS_VAR_NAMES: ReadonlyArray<string> = [
    '--color-primary',
    '--color-primary-hover',
    '--color-primary-rgb',
    '--color-surface',
    '--color-card',
    '--color-input-bg',
    '--color-text',
    '--color-text-muted',
    '--color-text-faint',
    '--color-danger',
    '--color-danger-dark',
    '--color-danger-rgb',
    '--color-warning',
    '--color-success',
    '--color-success-dark',
    '--color-snooze',
    '--font-display',
    '--font-mono',
    '--font-accent',
    '--color-chrome',
    '--color-chrome-text',
    '--color-surface-tint',
    '--color-border-subtle',
    '--color-border',
    '--color-border-strong',
];

function applyCssVars(cssVars: Record<string, string> | undefined): void {
    const root = document.documentElement;
    // Remove any previously-applied overrides so stale values don't carry over.
    for (const name of SKIN_CSS_VAR_NAMES) {
        root.style.removeProperty(name);
    }
    if (!cssVars) return;
    for (const [name, value] of Object.entries(cssVars)) {
        root.style.setProperty(name, value);
    }
}

/** Maps a Rank value to the active skin's display label. */
export function getRankLabel(rank: Rank): string {
    const r = _activeSkin.ranks;
    switch (rank) {
        case 'suspected_communist': return r.level0;
        case 'disengaged_citizen':  return r.level1;
        case 'citizen':             return r.level2;
        case 'loyal_citizen':       return r.level3;
        case 'patriot':             return r.level4;
    }
}
