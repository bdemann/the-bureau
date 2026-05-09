import {defineElement, defineElementEvent, css, html} from 'element-vir';
import type {DialogueEntry} from '../data/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CharacterDialogueElement
// Renders a memo-style speech bubble from either Director Briggs or Agent Whitaker.
// Briggs   = red/double-border, official notice aesthetic.
// Whitaker = blue/single-border, internal memo aesthetic.
// ─────────────────────────────────────────────────────────────────────────────

export const CharacterDialogueElement = defineElement<{
    dialogue: DialogueEntry;
}>()({
    tagName: 'character-dialogue',

    events: {
        dismissed: defineElementEvent<void>(),
    },

    styles: css`
        :host {
            display: block;
            font-family: 'Courier Prime', 'Courier New', monospace;
        }

        .memo {
            margin: 0 12px 12px;
            border: 2px solid;
            position: relative;
            animation: memo-in 0.2s ease-out;
        }

        @keyframes memo-in {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Director Briggs: red, double border ── */
        .memo.director {
            border-color: #8B0000;
            background: #FFF8F8;
            outline: 2px solid #8B0000;
            outline-offset: 3px;
        }

        .memo.director .memo-header {
            background: #8B0000;
            color: #F5EFE0;
        }

        .memo.director .from-label {
            color: #FFB3B3;
        }

        /* ── Agent Whitaker: navy, single border ── */
        .memo.agent {
            border-color: #1B2A4A;
            background: #F5F8FF;
        }

        .memo.agent .memo-header {
            background: #1B2A4A;
            color: #F5EFE0;
        }

        .memo.agent .from-label {
            color: #9BB8D8;
        }

        .memo-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            padding: 6px 10px 5px;
        }

        .memo-type {
            font-family: 'Bebas Neue', 'Special Elite', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.15em;
        }

        .from-label {
            font-size: 0.65rem;
            letter-spacing: 0.05em;
        }

        .dismiss-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px 6px;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.1em;
            opacity: 0.7;
            transition: opacity 0.15s;
        }

        .memo.director .dismiss-btn {
            color: #FFB3B3;
        }
        .memo.agent .dismiss-btn {
            color: #9BB8D8;
        }

        .dismiss-btn:hover {
            opacity: 1;
        }

        .memo-body {
            padding: 12px 14px 14px;
            font-size: 0.9rem;
            line-height: 1.55;
            font-style: italic;
        }

        .memo.director .memo-body {
            color: #3A0000;
        }

        .memo.agent .memo-body {
            color: #0A1A30;
        }

        .character-name {
            display: block;
            font-style: normal;
            font-weight: 700;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            margin-top: 8px;
            text-align: right;
        }

        .memo.director .character-name { color: #8B0000; }
        .memo.agent .character-name { color: #1B2A4A; }
    `,

    render({inputs, dispatch, events}) {
        const {dialogue} = inputs;
        const isDirector = dialogue.character === 'director';

        return html`
            <div class="memo ${dialogue.character}">
                <div class="memo-header">
                    <span class="memo-type">
                        ${isDirector ? 'OFFICIAL NOTICE' : 'INTERNAL MEMO'}
                    </span>
                    <span class="from-label">
                        ${isDirector
                            ? 'DIR. R.H. BRIGGS'
                            : 'AGENT H. WHITAKER'}
                    </span>
                    <button
                        class="dismiss-btn"
                        title="Dismiss"
                        @click=${() => dispatch(new events.dismissed())}
                    >
                        [CLOSE]
                    </button>
                </div>
                <div class="memo-body">
                    "${dialogue.message}"
                    <span class="character-name">
                        — ${isDirector
                            ? 'Director R. Harlan Briggs'
                            : 'Agent Henry "Hal" Whitaker'}
                    </span>
                </div>
            </div>
        `;
    },
});
