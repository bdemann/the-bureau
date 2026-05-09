import {defineElement, css, html} from 'element-vir';

// ─────────────────────────────────────────────────────────────────────────────
// BureauHeaderElement
// Top bar: B.C.R. logotype, patriot score, optional back button.
// ─────────────────────────────────────────────────────────────────────────────

export const BureauHeaderElement = defineElement<{
    patriotScore: number;
    streak: number;
    onBack: (() => void) | null;
    projectName: string | null;
}>()({
    tagName: 'bureau-header',

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

    render({inputs}) {
        const {patriotScore, streak, onBack, projectName} = inputs;

        // Score color: red when low, gold when ok, bright gold when high
        let scoreColor = '#F5EFE0';
        let barColor = '#B8860B';
        if (patriotScore < 40) { scoreColor = '#FF6B6B'; barColor = '#C41E3A'; }
        else if (patriotScore < 70) { scoreColor = '#F5A623'; barColor = '#F5A623'; }
        else if (patriotScore >= 130) { scoreColor = '#FFD700'; barColor = '#FFD700'; }

        const barWidth = Math.min(100, Math.max(0, (patriotScore / 200) * 100));

        return html`
            <header style="--score-color:${scoreColor};--score-bar-color:${barColor}">
                <div class="header-top">
                    ${onBack
                        ? html`
                            <button class="back-btn" @click=${onBack}>
                                ← BACK
                            </button>
                        `
                        : html`<div style="width:56px"></div>`}

                    <div class="wordmark">
                        B.C.R.
                        <span class="sub">BUREAU OF CIVIC RESPONSIBILITY</span>
                    </div>

                    <div class="score-block" title="Patriot Score">
                        <span class="score-number">${Math.round(patriotScore)}</span>
                        <span class="score-label">
                            ${streak > 1 ? `🔥 ${streak}d · ` : ''}SCORE
                        </span>
                    </div>
                </div>

                ${projectName
                    ? html`
                        <div class="breadcrumb">
                            DASHBOARD &rsaquo;
                            <span class="project-name">${projectName.toUpperCase()}</span>
                        </div>
                    `
                    : html``}

                <div class="score-bar">
                    <div class="score-bar-fill" style="width:${barWidth}%"></div>
                </div>
            </header>
        `;
    },
});
