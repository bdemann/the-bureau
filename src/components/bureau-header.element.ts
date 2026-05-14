import {css, defineElement, defineElementEvent, html} from 'element-vir';
import {getRank, rankColor, rankLabel} from '../data/ranks.js';

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
}>()({
    tagName: 'bureau-header',

    events: {
        homeRequested:       defineElementEvent<void>(),
        operationsRequested: defineElementEvent<void>(),
    },

    state: () => ({
        menuOpen:     false,
        reportCopied: false,
    }),

    styles: css`
        :host {
            display: block;
        }

        header {
            background: #1B2A4A;
            color: #F5EFE0;
            padding: 0 16px;
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
            color: #F5EFE0;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            padding: 3px 8px;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            flex-shrink: 0;
        }

        .back-btn:hover {
            background: rgba(245, 239, 224, 0.1);
            border-color: rgba(245, 239, 224, 0.8);
        }

        .wordmark {
            font-family: 'Bebas Neue', 'Special Elite', sans-serif;
            font-size: 1.5rem;
            letter-spacing: 0.2em;
            color: #F5EFE0;
            line-height: 1;
            flex: 1;
            text-align: center;
        }

        .wordmark .sub {
            display: block;
            font-family: 'Special Elite', serif;
            font-size: 0.45rem;
            letter-spacing: 0.3em;
            color: #B8860B;
            margin-top: 1px;
        }

        .score-block {
            flex-shrink: 0;
            text-align: right;
        }

        .score-number {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.3rem;
            line-height: 1;
            color: var(--score-color, #F5EFE0);
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
            padding: 4px 2px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex-shrink: 0;
            align-self: center;
        }

        .hamburger-line {
            display: block;
            width: 20px;
            height: 2px;
            background: #F5EFE0;
            transition: background 0.15s;
        }

        .hamburger-btn:hover .hamburger-line {
            background: #B8860B;
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
            background: #1B2A4A;
            border-left: 2px solid #B8860B;
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
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.3em;
            color: #B8860B;
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
            color: #F5EFE0;
        }

        .menu-section {
            padding: 12px 16px 4px;
        }

        .menu-section-label {
            font-family: 'Courier Prime', monospace;
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
            color: #F5EFE0;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.05rem;
            letter-spacing: 0.2em;
            text-align: left;
            padding: 13px 0 12px;
            cursor: pointer;
            transition: color 0.15s;
        }

        .menu-item:hover {
            color: #B8860B;
        }

        .menu-item-sub {
            display: block;
            font-family: 'Courier Prime', monospace;
            font-size: 0.58rem;
            letter-spacing: 0.1em;
            color: rgba(245, 239, 224, 0.4);
            margin-top: 2px;
            font-weight: normal;
        }

        .menu-copied {
            font-family: 'Courier Prime', monospace;
            font-size: 0.62rem;
            color: #B8860B;
            padding: 4px 0 8px;
            letter-spacing: 0.08em;
        }

        /* ── Breadcrumb / score bar ── */
        .breadcrumb {
            padding: 0 0 8px;
            font-size: 0.7rem;
            letter-spacing: 0.1em;
            color: rgba(245, 239, 224, 0.55);
            font-family: 'Courier Prime', monospace;
            position: relative;
        }

        .breadcrumb .project-name {
            color: #B8860B;
        }

        .score-bar {
            height: 3px;
            background: rgba(255,255,255,0.1);
            position: relative;
        }

        .score-bar-fill {
            height: 100%;
            background: var(--score-bar-color, #B8860B);
            transition: width 0.4s ease;
        }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        const {patriotScore, streak, onBack, projectName} = inputs;

        const rank = getRank(patriotScore);
        const scoreColor = rankColor(rank);

        let barColor = '#B8860B';
        if (patriotScore < 40)       { barColor = '#C41E3A'; }
        else if (patriotScore < 70)  { barColor = '#F5A623'; }
        else if (patriotScore >= 130){ barColor = '#FFD700'; }

        const barWidth = Math.min(100, Math.max(0, (patriotScore / 200) * 100));

        function openMenu(): void {
            updateState({menuOpen: true});
        }

        function closeMenu(): void {
            updateState({menuOpen: false});
        }

        function onHome(): void {
            closeMenu();
            dispatch(new events.homeRequested());
        }

        function onOperations(): void {
            closeMenu();
            dispatch(new events.operationsRequested());
        }

        async function onReportNeighbor(): Promise<void> {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'CLEAR — Civic Engagement Tracking System',
                        text: 'A neighbor has flagged you for potential civic disengagement. Install CLEAR — the BCR\'s official self-monitoring application — to verify your compliance record and demonstrate to the BCR that your patriotism is beyond question.',
                        url: CLEAR_URL,
                    });
                } catch {
                    // User cancelled — no action.
                }
            } else {
                await navigator.clipboard.writeText(CLEAR_URL);
                updateState({reportCopied: true});
                setTimeout(() => updateState({reportCopied: false}), 3000);
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
                        CLEAR
                        <span class="sub">BUREAU OF CIVIC RESPONSIBILITY</span>
                    </div>

                    <div class="score-block" title="Patriot Score">
                        <span class="score-number">${Math.round(patriotScore)}</span>
                        <span class="score-label">
                            ${streak > 0 ? `🔥 ${streak}d · ` : ''}${rankLabel(rank).toUpperCase()}
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
                            OPERATIONS &rsaquo;
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
                            <span class="menu-title">Bureau Menu</span>
                            <button class="menu-close" @click=${closeMenu}>×</button>
                        </div>

                        <div class="menu-section">
                            <div class="menu-section-label">Navigate</div>
                            <button class="menu-item" @click=${onHome}>
                                Daily
                                <span class="menu-item-sub">Today's tasks by urgency</span>
                            </button>
                            <button class="menu-item" @click=${onOperations}>
                                Operations
                                <span class="menu-item-sub">Browse projects &amp; task lists</span>
                            </button>
                        </div>

                        <div class="menu-section">
                            <div class="menu-section-label">Community Duty</div>
                            <button class="menu-item" @click=${onReportNeighbor}>
                                Report a Neighbor
                                <span class="menu-item-sub">Refer a civic non-compliant to CLEAR</span>
                            </button>
                            ${state.reportCopied
                                ? html`<div class="menu-copied">Link copied to clipboard.</div>`
                                : html``}
                        </div>
                    </div>
                </div>
            ` : html``}
        `;
    },
});
