import {css, defineElement, defineElementEvent, html} from 'element-vir';
import type {AppView} from '../data/types.js';
import {getActiveSkin} from '../skins/active-skin.js';

// ─────────────────────────────────────────────────────────────────────────────
// BureauBottomNavElement
// Persistent fixed bottom tab bar for primary view navigation.
// Covers: Daily · Areas · Ideas · Goals
// Secondary navigation (Insights, Report a Neighbor) stays in the hamburger.
// ─────────────────────────────────────────────────────────────────────────────

interface NavTab {
    label: string;
    icon: string;
    view: AppView;
}

// Icons and target views are skin-agnostic; labels are resolved in render().
const TAB_BASES: ReadonlyArray<{icon: string; view: AppView; navKey: keyof ReturnType<typeof getActiveSkin>['nav']}> = [
    {icon: '◈', view: 'daily',      navKey: 'daily'},
    {icon: '⊟', view: 'operations', navKey: 'areas'},
    {icon: '◇', view: 'ideas',      navKey: 'ideas'},
    {icon: '▲', view: 'goals',      navKey: 'goals'},
];

export const BureauBottomNavElement = defineElement<{
    currentView: AppView;
    /** True when a goal detail is open — keeps the Goals tab highlighted. */
    goalDetailActive: boolean;
}>()({
    tagName: 'bureau-bottom-nav',

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
            background: var(--color-primary);
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
            content: '';
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 2px;
            background: var(--color-warning);
        }

        .tab-icon {
            font-size: 1.35rem;
            line-height: 1;
        }

        .tab-label {
            font-family: var(--font-display);
            font-size: 0.68rem;
            letter-spacing: 0.15em;
            line-height: 1;
        }
    `,

    render({inputs, dispatch, events}) {
        const {currentView, goalDetailActive} = inputs;
        const nav = getActiveSkin().nav;
        const TABS: ReadonlyArray<NavTab> = TAB_BASES.map(t => ({...t, label: nav[t.navKey]}));

        function isActive(tab: NavTab): boolean {
            // Project detail → Areas tab stays lit
            if (tab.view === 'operations' && currentView === 'project') return true;
            // Goal detail → Goals tab stays lit
            if (tab.view === 'goals' && goalDetailActive) return true;
            return currentView === tab.view;
        }

        return html`
            <nav>
                ${TABS.map(tab => html`
                    <button
                        class=${`tab${isActive(tab) ? ' active' : ''}`}
                        aria-label=${tab.label}
                        @click=${() => dispatch(new events.viewChangeRequested(tab.view))}
                    >
                        <span class="tab-icon" aria-hidden="true">${tab.icon}</span>
                        <span class="tab-label">${tab.label}</span>
                    </button>
                `)}
            </nav>
        `;
    },
});
