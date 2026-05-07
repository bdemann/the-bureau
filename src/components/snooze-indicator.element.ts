import {defineElement, css, html} from 'element-vir';
import {getSnoozeSeverity} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// SnoozeIndicatorElement
// Visual signal for how badly a task has been snoozed.
// The worse it gets, the more alarming it looks — culminating in
// the "UNDER REVIEW" stamp when Briggs gets personally involved.
// ─────────────────────────────────────────────────────────────────────────────

export const SnoozeIndicatorElement = defineElement<{
    snoozeCount: number;
}>()({
    tagName: 'snooze-indicator',

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

        .badge.warning {
            background: rgba(245, 166, 35, 0.18);
            color: #9E6200;
            border: 1px solid rgba(245, 166, 35, 0.5);
        }

        .badge.caution {
            background: rgba(232, 130, 26, 0.2);
            color: #7A3C00;
            border: 1px solid rgba(232, 130, 26, 0.5);
        }

        .badge.danger {
            background: rgba(196, 30, 58, 0.15);
            color: #8B0000;
            border: 1px solid rgba(196, 30, 58, 0.4);
        }

        .badge.critical {
            background: rgba(139, 0, 0, 0.12);
            color: #8B0000;
            border: 1px solid #8B0000;
            animation: pulse-red 1.8s ease-in-out infinite;
        }

        @keyframes pulse-red {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.6; }
        }

        /* UNDER REVIEW stamp — shown at critical level */
        .stamp {
            display: inline-block;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: #8B0000;
            border: 2px solid #8B0000;
            padding: 1px 6px;
            transform: rotate(-1.5deg);
            opacity: 0.75;
        }

        .snooze-icon {
            font-size: 0.7em;
            opacity: 0.8;
        }
    `,

    render({inputs}) {
        const {snoozeCount} = inputs;
        const severity = getSnoozeSeverity(snoozeCount);

        if (severity === 'none') {
            return html``;
        }

        if (severity === 'critical') {
            return html`
                <span class="stamp">UNDER REVIEW ×${snoozeCount}</span>
            `;
        }

        const labels: Record<string, string> = {
            warning: `Snoozed ×${snoozeCount}`,
            caution: `Snoozed ×${snoozeCount} — Noted`,
            danger: `FLAGGED — Snoozed ×${snoozeCount}`,
        };

        return html`
            <span class="badge ${severity}">
                <span class="snooze-icon">⏱</span>
                ${labels[severity] ?? `Snoozed ×${snoozeCount}`}
            </span>
        `;
    },
});
