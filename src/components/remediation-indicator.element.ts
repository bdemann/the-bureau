import {defineElement, css, html} from 'element-vir';
import {getRemediationSeverity} from '../data/remediation.js';
import {getActiveSkin} from '../skins/active-skin.js';

// ─────────────────────────────────────────────────────────────────────────────
// RemediationIndicatorElement
// Visual signal that a commitment is in a recovery phase after a skip/snooze
// streak.  Escalates in urgency the more completions are still needed.
// Disappears once remediationCount reaches 0.
// ─────────────────────────────────────────────────────────────────────────────

export const RemediationIndicatorElement = defineElement<{
    remediationCount: number;
}>()({
    tagName: 'remediation-indicator',

    styles: css`
        :host {
            display: block;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            padding: 2px 6px;
            border-radius: 2px;
            text-transform: uppercase;
        }

        /* low: muted teal — encouraging, "almost there" */
        .badge.low {
            background: rgba(30, 90, 90, 0.1);
            color: #1A5050;
            border: 1px solid rgba(30, 90, 90, 0.3);
        }

        /* medium: amber — you're working on it */
        .badge.medium {
            background: rgba(184, 134, 11, 0.12);
            color: #6B4A00;
            border: 1px solid rgba(184, 134, 11, 0.4);
        }

        /* high: deeper amber/rust — needs sustained effort */
        .badge.high {
            background: rgba(160, 80, 20, 0.14);
            color: #7A3800;
            border: 1px solid rgba(160, 80, 20, 0.4);
            animation: pulse-amber 2.5s ease-in-out infinite;
        }

        @keyframes pulse-amber {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.6; }
        }

        .icon {
            font-size: 0.7em;
            opacity: 0.85;
        }
    `,

    render({inputs}) {
        const {remediationCount} = inputs;
        const severity = getRemediationSeverity(remediationCount);
        const skin = getActiveSkin();

        if (severity === 'none') return html``;

        const labels: Record<string, string> = {
            low:    skin.streaks.remediationLow(remediationCount),
            medium: skin.streaks.remediationMedium(remediationCount),
            high:   skin.streaks.remediationHigh(remediationCount),
        };

        return html`
            <span class="badge ${severity}">
                <span class="icon">↺</span>
                ${labels[severity] ?? skin.streaks.remediationLow(remediationCount)}
            </span>
        `;
    },
});
