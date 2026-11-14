import { css } from "element-vir";

/**
 * Maps the app-kit's --kit-* custom properties onto CLEAR's --color-* variables
 * so kit pages (About, Feedback) follow the active skin and dark mode. Include
 * inside a kit-hosting element's `:host` rule.
 */
export const kitThemeVars = css`
    /* Buttons / accents: the chrome pair is always a readable fg/bg
       combination in every skin, light and dark. */
    --kit-accent: var(--color-chrome);
    --kit-on-accent: var(--color-chrome-text);
    --kit-text: var(--color-text);
    --kit-muted-text: var(--color-text-muted);
    --kit-surface: var(--color-surface);
    --kit-field: var(--color-input-bg);
    --kit-border: var(--color-border-strong);
    --kit-focus: var(--color-primary);
    --kit-error: var(--color-danger);
`;
