/**
 * Makes the browser/hardware back button close a modal instead of leaving
 * the page — the fix for "the back button exits the whole app while I'm
 * just trying to close a dialog."
 *
 * The trick: push a throwaway history entry when the modal opens, so Back's
 * default action is to pop it (a `popstate` event) rather than navigate away.
 * Call `pushModalHistoryGuard` once when a modal opens and
 * `releaseModalHistoryGuard` once it's confirmed closed by ANY means (Cancel,
 * Save, Delete, backdrop click, or the back button itself) — both are no-ops
 * if already in the matching state, so a component can call them
 * unconditionally on every "just opened" / "now closed" render transition
 * without tracking which path triggered the close.
 *
 * Only one modal guard is tracked at a time — fine as long as this app never
 * has two independently back-closable modals open simultaneously. If that
 * changes, this needs a stack instead of a single slot.
 */

let activePopStateHandler: (() => void) | null = null;

export function pushModalHistoryGuard(onBack: () => void): void {
    if (activePopStateHandler !== null) return;
    history.pushState({ modalGuard: true }, "");
    activePopStateHandler = () => {
        window.removeEventListener("popstate", activePopStateHandler!);
        activePopStateHandler = null;
        onBack();
    };
    window.addEventListener("popstate", activePopStateHandler);
}

export function releaseModalHistoryGuard(): void {
    if (activePopStateHandler === null) return;
    window.removeEventListener("popstate", activePopStateHandler);
    activePopStateHandler = null;
    history.back();
}
