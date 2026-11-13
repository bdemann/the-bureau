import { css, defineElement, html } from "element-vir";
import { AboutPage } from "@bdemann/app-kit/ui";
import { fetchLatestCommit } from "../data/version-info.js";
import { kitThemeVars } from "./kit-theme.js";

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

            ${kitThemeVars}
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
