// ─────────────────────────────────────────────────────────────────────────────
// Helpers for the "latest deployed commit" check on the About page.
// The build emits /version.json ({"commit": "<sha>"}); the app fetches it with
// no-store and compares it to the commit it was built from.
// ─────────────────────────────────────────────────────────────────────────────

/** Pulls the commit out of a parsed version.json, or undefined if it is not a usable one. */
export function parseLatestCommit(json: unknown): string | undefined {
    if (typeof json !== "object" || json === null) return undefined;
    const commit = (json as { commit?: unknown }).commit;
    if (typeof commit !== "string") return undefined;
    const trimmed = commit.trim();
    return trimmed === "" ? undefined : trimmed;
}

/**
 * Fetches /version.json bypassing every cache and returns the deployed commit.
 * Resolves undefined on any failure (offline, 404, HTML fallback from a dev
 * server, malformed JSON) so the About page shows "could not tell".
 */
export async function fetchLatestCommit(
    fetchFn: typeof fetch = fetch,
): Promise<string | undefined> {
    try {
        const response = await fetchFn("/version.json", { cache: "no-store" });
        if (!response.ok) return undefined;
        return parseLatestCommit(await response.json());
    } catch {
        return undefined;
    }
}
