import {css, defineElement, defineElementEvent, html} from 'element-vir';
import {getRank, rankColor} from '../data/ranks.js';
import {getActiveSkin, getRankLabel} from '../skins/active-skin.js';
import {ALL_SKINS} from '../skins/all-skins.js';

// ─────────────────────────────────────────────────────────────────────────────
// BureauHeaderElement
// Top bar: CLEAR logotype, patriot score, back button, hamburger menu.
// The hamburger menu owns: Operations navigation, Report a Neighbor.
// ─────────────────────────────────────────────────────────────────────────────

const CLEAR_URL = 'https://clear.bureauofcivicresponsibility.org';

export const BureauHeaderElement = defineElement<{
    patriotScore: number;
    streak: number;
    onBack: (() => void) | null;
    projectName: string | null;
    /** Id of the currently active skin — drives the skin picker selection state. */
    activeSkinId: string;
}>()({
    tagName: 'bureau-header',

    events: {
        /** Fired when the user taps Insights in the hamburger menu. */
        insightsRequested: defineElementEvent<void>(),
        /** Fired when the user selects a different skin from the picker. */
        skinChangeRequested: defineElementEvent<string>(),
    },

    state: () => ({
        menuOpen: false,
    }),

    styles: css`
        :host {
            display: block;
        }

        header {
            background: var(--color-primary);
            color: var(--color-surface);
            padding: 0 16px;
            padding-top: env(safe-area-inset-top, 0px);
            position: relative;
            overflow: hidden;
        }

        /* Subtle diagonal stripe decoration */
        header::before {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
                -55deg,
                transparent,
                transparent 12px,
                rgba(255, 255, 255, 0.02) 12px,
                rgba(255, 255, 255, 0.02) 14px
            );
            pointer-events: none;
        }

        .header-top {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 0 4px;
            position: relative;
        }

        .back-btn {
            background: none;
            border: 1px solid rgba(245, 239, 224, 0.4);
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            padding: 0 12px;
            min-height: 44px;
            min-width: 44px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            flex-shrink: 0;
        }

        .back-btn:hover {
            background: rgba(245, 239, 224, 0.1);
            border-color: rgba(245, 239, 224, 0.8);
        }

        .wordmark {
            font-family: var(--font-display);
            font-size: 1.5rem;
            letter-spacing: 0.2em;
            color: var(--color-surface);
            line-height: 1;
            flex: 1;
            text-align: center;
        }

        .wordmark .sub {
            display: block;
            font-family: var(--font-accent);
            font-size: 0.45rem;
            letter-spacing: 0.3em;
            color: var(--color-warning);
            margin-top: 1px;
        }

        .score-block {
            flex-shrink: 0;
            text-align: right;
        }

        .score-number {
            font-family: var(--font-display);
            font-size: 1.3rem;
            line-height: 1;
            color: var(--score-color, var(--color-surface));
        }

        .score-label {
            font-size: 0.5rem;
            letter-spacing: 0.15em;
            color: rgba(245, 239, 224, 0.5);
            text-transform: uppercase;
            display: block;
        }

        /* ── Hamburger button ── */
        .hamburger-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            min-width: 44px;
            min-height: 44px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex-shrink: 0;
            align-self: center;
        }

        .hamburger-line {
            display: block;
            width: 20px;
            height: 2px;
            background: var(--color-surface);
            transition: background 0.15s;
        }

        .hamburger-btn:hover .hamburger-line {
            background: var(--color-warning);
        }

        /* ── Slide-in menu panel ── */
        .menu-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 400;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .menu-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 260px;
            background: var(--color-primary);
            border-left: 2px solid var(--color-warning);
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            animation: panel-in 0.2s ease-out;
        }

        @keyframes panel-in {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
        }

        .menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 16px 12px;
            border-bottom: 1px solid rgba(184, 134, 11, 0.3);
        }

        .menu-title {
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.3em;
            color: var(--color-warning);
        }

        .menu-close {
            background: none;
            border: none;
            color: rgba(245, 239, 224, 0.6);
            font-size: 1.3rem;
            line-height: 1;
            cursor: pointer;
            padding: 0 2px;
            transition: color 0.15s;
        }

        .menu-close:hover {
            color: var(--color-surface);
        }

        .menu-section {
            padding: 12px 16px 4px;
        }

        .menu-section-label {
            font-family: var(--font-mono);
            font-size: 0.58rem;
            letter-spacing: 0.2em;
            color: rgba(245, 239, 224, 0.35);
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .menu-item {
            display: block;
            width: 100%;
            background: none;
            border: none;
            border-bottom: 1px solid rgba(245, 239, 224, 0.08);
            color: var(--color-surface);
            font-family: var(--font-display);
            font-size: 1.05rem;
            letter-spacing: 0.2em;
            text-align: left;
            padding: 13px 0 12px;
            cursor: pointer;
            transition: color 0.15s;
        }

        .menu-item:hover {
            color: var(--color-warning);
        }

        .menu-item-sub {
            display: block;
            font-family: var(--font-mono);
            font-size: 0.58rem;
            letter-spacing: 0.1em;
            color: rgba(245, 239, 224, 0.4);
            margin-top: 2px;
            font-weight: normal;
        }

        .menu-copied {
            font-family: var(--font-mono);
            font-size: 0.62rem;
            color: var(--color-warning);
            padding: 4px 0 8px;
            letter-spacing: 0.08em;
        }

        /* ── Skin picker ── */
        .skin-picker {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 4px 0 8px;
        }

        .skin-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            background: none;
            border: 1px solid rgba(245, 239, 224, 0.15);
            color: rgba(245, 239, 224, 0.7);
            font-family: var(--font-mono);
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            text-align: left;
            padding: 9px 12px;
            cursor: pointer;
            transition: border-color 0.15s, color 0.15s, background 0.15s;
        }

        .skin-btn:hover {
            border-color: rgba(245, 239, 224, 0.4);
            color: var(--color-surface);
        }

        .skin-btn.active {
            border-color: var(--color-warning);
            color: var(--color-surface);
            background: rgba(245, 239, 224, 0.06);
        }

        .skin-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1.5px solid currentColor;
            flex-shrink: 0;
        }

        .skin-btn.active .skin-dot {
            background: var(--color-warning);
            border-color: var(--color-warning);
        }

        /* ── Breadcrumb / score bar ── */
        .breadcrumb {
            padding: 0 0 8px;
            font-size: 0.7rem;
            letter-spacing: 0.1em;
            color: rgba(245, 239, 224, 0.55);
            font-family: var(--font-mono);
            position: relative;
        }

        .breadcrumb .project-name {
            color: var(--color-warning);
        }

        .score-bar {
            height: 3px;
            background: rgba(255,255,255,0.1);
            position: relative;
        }

        .score-bar-fill {
            height: 100%;
            background: var(--score-bar-color, var(--color-warning));
            transition: width 0.4s ease;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {patriotScore, streak, onBack, projectName, activeSkinId} = inputs;
        const skin = getActiveSkin();

        const rank = streak === 0 ? 'suspected_communist' : getRank(patriotScore);
        const scoreColor = rankColor(rank);

        let barColor = 'var(--color-warning)';
        if (patriotScore < 40)       { barColor = 'var(--color-danger)'; }
        else if (patriotScore < 70)  { barColor = '#F5A623'; }
        else if (patriotScore >= 130){ barColor = '#FFD700'; }

        const barWidth = Math.min(100, Math.max(0, (patriotScore / 200) * 100));

        function openMenu(): void {
            updateState({menuOpen: true});
        }

        function closeMenu(): void {
            updateState({menuOpen: false});
        }

        function onInsights(): void {
            closeMenu();
            dispatch(new events.insightsRequested());
        }

        async function onReportNeighbor(): Promise<void> {
            closeMenu();
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: skin.identity.shareTitle,
                        text:  skin.identity.sharePitch,
                        url:   CLEAR_URL,
                    });
                } catch {
                    // User cancelled — no action.
                }
            } else {
                await navigator.clipboard.writeText(CLEAR_URL);
            }
        }

        return html`
            <header style="--score-color:${scoreColor};--score-bar-color:${barColor}">
                <div class="header-top">
                    ${onBack
                        ? html`
                            <button class="back-btn" @click=${onBack}>← BACK</button>
                          `
                        : html`<div style="width:56px"></div>`}

                    <div class="wordmark">
                        ${skin.identity.appShort}
                        <span class="sub">${skin.identity.appTagline}</span>
                    </div>

                    <div class="score-block" title="${skin.identity.scoreName}">
                        <span class="score-number">${Math.round(patriotScore)}</span>
                        <span class="score-label">
                            ${streak > 0 ? `🔥 ${streak}d · ` : `${streak}d · `}${getRankLabel(rank).toUpperCase()}
                        </span>
                    </div>

                    <button class="hamburger-btn" title="Menu" @click=${openMenu}>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>

                ${projectName
                    ? html`
                        <div class="breadcrumb">
                            ${skin.nav.areasBreadcrumb} &rsaquo;
                            <span class="project-name">${projectName.toUpperCase()}</span>
                        </div>
                      `
                    : html``}

                <div class="score-bar">
                    <div class="score-bar-fill" style="width:${barWidth}%"></div>
                </div>
            </header>

            ${state.menuOpen ? html`
                <div
                    class="menu-overlay"
                    @click=${(e: Event) => { if (e.target === e.currentTarget) closeMenu(); }}
                >
                    <div class="menu-panel">
                        <div class="menu-header">
                            <span class="menu-title">${skin.menu.menuTitle}</span>
                            <button class="menu-close" @click=${closeMenu}>×</button>
                        </div>

                        <div class="menu-section">
                            <div class="menu-section-label">${skin.menu.insightsSectionLabel}</div>
                            <button class="menu-item" @click=${onInsights}>
                                Insights
                                <span class="menu-item-sub">Missed tasks, completions, patterns</span>
                            </button>
                        </div>

                        <div class="menu-section">
                            <div class="menu-section-label">${skin.menu.shareSectionLabel}</div>
                            <button class="menu-item" @click=${onReportNeighbor}>
                                ${skin.menu.shareItemLabel}
                                <span class="menu-item-sub">${skin.menu.shareItemSub}</span>
                            </button>
                        </div>

                        <div class="menu-section">
                            <div class="menu-section-label">Appearance</div>
                            <div class="skin-picker">
                                ${ALL_SKINS.map(s => html`
                                    <button
                                        class=${'skin-btn' + (s.id === activeSkinId ? ' active' : '')}
                                        @click=${() => {
                                            dispatch(new events.skinChangeRequested(s.id));
                                            closeMenu();
                                        }}
                                    >
                                        <span class="skin-dot"></span>
                                        ${s.displayName}
                                    </button>
                                `)}
                            </div>
                        </div>
                    </div>
                </div>
            ` : html``}
        `;
    },
});
