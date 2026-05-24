import type {Skin} from './types.js';
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
