import type { AppState, CommitmentKind } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic lines attached to a feedback report (opt-in, previewed by the
// person before sending). PRIVACY: counts and environment facts only. Nothing
// the person wrote (commitment, area, goal or idea titles, descriptions,
// notes) may ever appear here, so this function reads only array lengths and
// each commitment's `kind` discriminator, never any text field.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedbackBuildInfo {
    version: string;
    commit: string;
    buildTime: string;
}

export interface FeedbackEnvironment {
    skinId: string;
    darkMode: boolean;
    userAgent: string;
    standalone: boolean;
}

export const FEEDBACK_DIAGNOSTICS_NOTE =
    "Counts and device details only; none of your task, area, goal or idea text is included.";

const KIND_ORDER: ReadonlyArray<CommitmentKind> = ["task", "routine", "goal", "idea"];

/** Builds the `info` block (one `Label: value` per line). The log is always empty: CLEAR keeps none. */
export function buildFeedbackDiagnostics(
    state: Pick<AppState, "schemaVersion" | "areas" | "commitments">,
    build: FeedbackBuildInfo,
    env: FeedbackEnvironment,
): string {
    const counts: Record<CommitmentKind, number> = { task: 0, routine: 0, goal: 0, idea: 0 };
    for (const commitment of state.commitments) {
        counts[commitment.kind] += 1;
    }
    const lines = [
        `App version: ${build.version}`,
        `Commit: ${build.commit}`,
        `Built: ${build.buildTime}`,
        `Skin: ${env.skinId}`,
        `Dark mode: ${env.darkMode ? "on" : "off"}`,
        `Schema version: ${state.schemaVersion}`,
        `Areas: ${state.areas.length}`,
        ...KIND_ORDER.map((kind) => `Commitments (${kind}): ${counts[kind]}`),
        `Display mode: ${env.standalone ? "standalone" : "browser"}`,
        `User agent: ${env.userAgent}`,
    ];
    return lines.join("\n");
}
