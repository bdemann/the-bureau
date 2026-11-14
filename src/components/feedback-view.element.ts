import { css, defineElement, html } from "element-vir";
import { FeedbackPage } from "@bdemann/app-kit/ui";
import type { AppState } from "../data/types.js";
import {
    buildFeedbackDiagnostics,
    FEEDBACK_DIAGNOSTICS_NOTE,
} from "../data/feedback-diagnostics.js";
import { kitThemeVars } from "./kit-theme.js";

type SendResult = { ok: true } | { ok: false; message: string };

const NETWORK_FAILURE = "Could not reach the server. Check your connection and try again.";
const GENERIC_FAILURE = "Could not send that right now. Please try again later.";

/** POSTs the draft to the Netlify function and maps the response to the kit's result shape. */
async function postFeedback(draft: unknown): Promise<SendResult> {
    try {
        const response = await fetch("/api/feedback", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(draft),
        });
        if (response.ok) return { ok: true };
        let message = GENERIC_FAILURE;
        try {
            const body = (await response.json()) as { error?: unknown };
            if (typeof body.error === "string" && body.error.trim() !== "") message = body.error;
        } catch {
            /* non-JSON error body: keep the generic message */
        }
        return { ok: false, message };
    } catch {
        return { ok: false, message: NETWORK_FAILURE };
    }
}

/**
 * Hosts the shared app-kit Feedback page. Files a GitHub issue through the
 * /api/feedback Netlify function; diagnostics are counts and environment facts
 * only (see src/data/feedback-diagnostics.ts).
 */
export const FeedbackViewElement = defineElement<{
    app: Pick<AppState, "schemaVersion" | "areas" | "commitments">;
    skinId: string;
    darkMode: boolean;
}>()({
    tagName: "feedback-view",

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
            color: var(--color-text);
            ${kitThemeVars}
        }
    `,

    render({ inputs }) {
        // Skins keep their own (often deep) red in dark mode, which is unreadable
        // as text on the dark surface. Lift it toward the cream text color there.
        const errorOverride = inputs.darkMode
            ? "--kit-error: color-mix(in srgb, var(--color-danger) 40%, var(--color-text));"
            : "";
        return html`
            <div style=${errorOverride}>
            <${FeedbackPage.assign({
                send: (draft) => postFeedback(draft),
                draftStorageKey: "bureau.feedbackDraft",
                contactFields: true,
                contactStorageKey: "bureau.feedbackContact",
                honeypot: true,
                diagnostics: {
                    note: FEEDBACK_DIAGNOSTICS_NOTE,
                    collect: () => ({
                        info: buildFeedbackDiagnostics(
                            inputs.app,
                            {
                                version: __APP_VERSION__,
                                commit: __APP_COMMIT__,
                                buildTime: __APP_BUILD_TIME__,
                            },
                            {
                                skinId: inputs.skinId,
                                darkMode: inputs.darkMode,
                                userAgent: navigator.userAgent,
                                standalone:
                                    window.matchMedia("(display-mode: standalone)").matches ||
                                    (navigator as { standalone?: boolean }).standalone === true,
                            },
                        ),
                        log: "",
                    }),
                },
            })}></${FeedbackPage}>
            </div>
        `;
    },
});
