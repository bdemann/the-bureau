import { css, defineElement, defineElementEvent, html } from "element-vir";
import type { AppView } from "../data/types.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// BureauBottomNavElement
// Persistent fixed bottom tab bar for primary view navigation.
// Covers: Daily · Areas · Ideas · Goals
// Secondary navigation (Insights, Report a Neighbor) stays in the hamburger.
// ─────────────────────────────────────────────────────────────────────────────

// Material Symbols — outlined style, 24×24 viewBox.
const ICON_PATHS = {
    // calendar_today: grid lines + date squares
    daily:  'M20 3h-1V1h-2v2H7V1H5v2H4C2.9 4 2 4.9 2 6v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 18H4V8h16v13zM4 6V5h16v1H4zM9 10h2v2H9v-2zm0 4h2v2H9v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z',
    // apps: 3×3 square grid
    areas:  'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
    // lightbulb: bulb with base
    ideas:  'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    // flag: pennant on a pole
    goals:  'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
} as const;

interface NavTab {
    label: string;
    svgPath: string;
    view: AppView;
    navKey: keyof ReturnType<typeof getActiveSkin>["nav"];
}

// Icons and target views are skin-agnostic; labels are resolved in render().
const TAB_BASES: ReadonlyArray<{
    svgPath: string;
    view: AppView;
    navKey: keyof ReturnType<typeof getActiveSkin>["nav"];
}> = [
    { svgPath: ICON_PATHS.daily,  view: "daily", navKey: "daily" },
    { svgPath: ICON_PATHS.areas,  view: "areas", navKey: "areas" },
    { svgPath: ICON_PATHS.ideas,  view: "ideas", navKey: "ideas" },
    { svgPath: ICON_PATHS.goals,  view: "goals", navKey: "goals" },
];

export const BureauBottomNavElement = defineElement<{
    currentView: AppView;
    /** True when a goal detail is open — keeps the Goals tab highlighted. */
    goalDetailActive: boolean;
    /** Passed from bureau-app so this element re-renders when the skin changes. */
    activeSkinId: string;
}>()({
    tagName: "bureau-bottom-nav",

    events: {
        viewChangeRequested: defineElementEvent<AppView>(),
    },

    styles: css`
        :host {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 200;
        }

        nav {
            max-width: 640px;
            margin: 0 auto;
            background: var(--color-chrome);
            border-top: 2px solid rgba(184, 134, 11, 0.5);
            display: flex;
            align-items: stretch;
            /* Push content above the iOS home indicator */
            padding-bottom: env(safe-area-inset-bottom, 0px);
            /* Subtle diagonal stripe decoration matching the header */
            background-image: repeating-linear-gradient(
                -55deg,
                transparent,
                transparent 12px,
                rgba(255, 255, 255, 0.015) 12px,
                rgba(255, 255, 255, 0.015) 14px
            );
        }

        .tab {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 10px 4px 8px;
            min-height: 64px;
            background: none;
            border: none;
            cursor: pointer;
            color: rgba(245, 239, 224, 0.42);
            transition: color 0.15s;
            position: relative;
            -webkit-tap-highlight-color: transparent;
        }

        .tab:hover {
            color: rgba(245, 239, 224, 0.75);
        }

        .tab.active {
            color: var(--color-warning);
        }

        /* Amber indicator bar at the top of the active tab */
        .tab.active::before {
            content: "";
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 2px;
            background: var(--color-warning);
        }

        .tab-icon svg {
            width: 22px;
            height: 22px;
            display: block;
            fill: currentColor;
        }

        .tab-label {
            font-family: var(--font-display);
            font-size: 0.68rem;
            letter-spacing: 0.15em;
            line-height: 1;
        }
    `,

    render({ inputs, dispatch, events }) {
        const { currentView, goalDetailActive } = inputs;
        const nav = getActiveSkin().nav;
        const TABS: ReadonlyArray<NavTab> = TAB_BASES.map((t) => ({
            ...t,
            label: nav[t.navKey],
        }));

        function isActive(tab: NavTab): boolean {
            // Area detail → Areas tab stays lit
            if (tab.view === "areas" && currentView === "area") return true;
            // Goal detail → Goals tab stays lit
            if (tab.view === "goals" && goalDetailActive) return true;
            return currentView === tab.view;
        }

        return html`
            <nav>
                ${TABS.map(
                    (tab) => html`
                        <button
                            class=${`tab${isActive(tab) ? " active" : ""}`}
                            aria-label=${tab.label}
                            @click=${() =>
                                dispatch(
                                    new events.viewChangeRequested(tab.view),
                                )}
                        >
                            <span class="tab-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d=${tab.svgPath} />
                                </svg>
                            </span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `,
                )}
            </nav>
        `;
    },
});
