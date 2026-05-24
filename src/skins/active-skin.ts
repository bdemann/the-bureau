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

export function setActiveSkin(skin: Skin): void {
    _activeSkin = skin;
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
