import {defineElement, css, html} from 'element-vir';
import {getSkipSeverity} from '../data/types.js';
import {getActiveSkin} from '../skins/active-skin.js';

// ─────────────────────────────────────────────────────────────────────────────
// SkipIndicatorElement
// Visual signal for consecutive skips on a task. Escalates in severity and
// language with each successive skip streak. Resets to none on completion.
// ─────────────────────────────────────────────────────────────────────────────

export const SkipIndicatorElement = defineElement<{
    skipStreak: number;
}>()({
    tagName: 'skip-indicator',

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
            background: rgba(107, 107, 107, 0.1);
            color: #4A4A4A;
            border: 1px solid rgba(107, 107, 107, 0.35);
        }

        .badge.caution {
            background: rgba(74, 94, 42, 0.12);
            color: #3A4E1A;
            border: 1px solid rgba(74, 94, 42, 0.35);
        }

        .badge.danger {
            background: rgba(74, 58, 26, 0.14);
            color: #3A2E0A;
            border: 1px solid rgba(74, 58, 26, 0.4);
        }

        .badge.critical {
            background: rgba(27, 42, 74, 0.12);
            color: #1B2A4A;
            border: 1px solid #1B2A4A;
            animation: pulse-slate 2s ease-in-out infinite;
        }

        @keyframes pulse-slate {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.55; }
        }

        .stamp {
            display: inline-block;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            color: #1B2A4A;
            border: 2px solid #1B2A4A;
            padding: 1px 6px;
            transform: rotate(-1.5deg);
            opacity: 0.7;
        }

        .skip-icon {
            font-size: 0.7em;
            opacity: 0.8;
        }
    `,

    render({inputs}) {
        const {skipStreak} = inputs;
        const severity = getSkipSeverity(skipStreak);
        const skin = getActiveSkin();

        if (severity === 'none') return html``;

        if (severity === 'critical') {
            return html`<span class="stamp">${skin.streaks.skipCritical(skipStreak)}</span>`;
        }

        const labels: Record<string, string> = {
            warning: skin.streaks.skipWarning(skipStreak),
            caution: skin.streaks.skipCaution(skipStreak),
            danger:  skin.streaks.skipDanger(skipStreak),
        };

        return html`
            <span class="badge ${severity}">
                <span class="skip-icon">↷</span>
                ${labels[severity] ?? skin.streaks.skipWarning(skipStreak)}
            </span>
        `;
    },
});
