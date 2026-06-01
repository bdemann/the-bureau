import { defaultSkin } from "./default.skin.js";
import type { Skin } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Vanilla — plain-English skin with no thematic flavour.
// Inherits everything from defaultSkin; the two are intentionally identical
// so that defaultSkin always reflects the neutral baseline.
// ─────────────────────────────────────────────────────────────────────────────

export const vanillaSkin: Skin = {
    ...defaultSkin,
};
