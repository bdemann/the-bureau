import {bcrSkin} from './bcr.skin.js';
import {vanillaSkin} from './vanilla.skin.js';
import {freemasonSkin} from './freemason.skin.js';
import {dresdenSkin} from './dresden.skin.js';
import type {Skin} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// ALL_SKINS — ordered list of every available skin.
// Add new skins here to make them appear in the skin picker.
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_SKINS: ReadonlyArray<Skin> = [
    bcrSkin,
    vanillaSkin,
    freemasonSkin,
    dresdenSkin,
];

export const DEFAULT_SKIN_ID = bcrSkin.id;

/** Load the saved skin id from localStorage; falls back to BCR. */
export function loadSkinId(): string {
    try {
        return localStorage.getItem('bureau-skin-id') ?? DEFAULT_SKIN_ID;
    } catch {
        return DEFAULT_SKIN_ID;
    }
}

/** Save the chosen skin id to localStorage. */
export function saveSkinId(id: string): void {
    try {
        localStorage.setItem('bureau-skin-id', id);
    } catch {
        // Storage unavailable — ignore.
    }
}

/** Look up a skin by id; returns BCR if not found. */
export function getSkinById(id: string): Skin {
    return ALL_SKINS.find(s => s.id === id) ?? bcrSkin;
}
