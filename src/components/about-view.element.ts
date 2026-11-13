import { css, defineElement, html } from "element-vir";
import { AboutPage } from "@bdemann/app-kit/ui";
import { fetchLatestCommit } from "../data/version-info.js";

const REPO_URL = "https://github.com/bdemann/the-bureau";

/**
 * Hosts the shared app-kit About page. The kit colors itself with --kit-*
 * custom properties; they are mapped here to CLEAR's --color-* variables so the
 * page follows the active skin and dark mode.
 */
export const AboutViewElement = defineElement<{
    appName: string;
}>()({
    tagName: "about-view",

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
            color: var(--color-text);

            /* Buttons / accents: the chrome pair is always a readable fg/bg
               combination in every skin, light and dark. */
            --kit-accent: var(--color-chrome);
            --kit-on-accent: var(--color-chrome-text);
            --kit-text: var(--color-text);
            --kit-muted-text: var(--color-text-muted);
            --kit-surface: var(--color-surface);
            /* Not used by About; set now so the Feedback page inherits it. */
            --kit-field: var(--color-input-bg);
            --kit-border: var(--color-border-strong);
            --kit-focus: var(--color-primary);
            --kit-error: var(--color-danger);
        }
    `,

    render({ inputs }) {
        return html`
            <${AboutPage.assign({
                appName: inputs.appName,
                logoUrl: "/icon-192.png",
                repoUrl: REPO_URL,
                buildInfo: {
                    version: __APP_VERSION__,
                    commit: __APP_COMMIT__,
                    buildTime: __APP_BUILD_TIME__,
                },
                fetchLatestCommit: () => fetchLatestCommit(),
                links: [],
            })}></${AboutPage}>
        `;
    },
});
