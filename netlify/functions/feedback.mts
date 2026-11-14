import type { Config } from "@netlify/functions";
import { handleFeedbackRequest } from "@bdemann/app-kit/server";

// Public endpoint (CLEAR has no sign-in), protected by the kit's honeypot.
// Files a GitHub issue on bdemann/the-bureau. Needs GITHUB_FEEDBACK_TOKEN
// (fine-grained, Issues: read and write on this repo only) in the Netlify env.
export default (request: Request) =>
    handleFeedbackRequest(request, {
        token: process.env["GITHUB_FEEDBACK_TOKEN"],
        repo: "bdemann/the-bureau",
        appName: "BCR Clear",
        labels: { base: ["feedback"], byKind: { idea: ["enhancement"], problem: ["bug"] } },
        commit: process.env["COMMIT_REF"] ?? "dev",
        submittedAt: new Date().toISOString(),
        fetchFunction: fetch,
    });

export const config: Config = { path: "/api/feedback" };
