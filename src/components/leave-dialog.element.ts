import { css, defineElement, defineElementEvent, html } from "element-vir";
import {
    LEAVE_PRESETS_DAYS,
    type LeaveSpan,
    formatLeaveDay,
    isPresetAvailable,
    leaveDaysRemaining,
    leaveReturnDay,
} from "../data/leave.js";
import { getActiveSkin } from "../skins/active-skin.js";
import { pushModalHistoryGuard, releaseModalHistoryGuard } from "../modal-history-guard.js";

// ─────────────────────────────────────────────────────────────────────────────
// LeaveDialogElement
// Small modal for Authorized Leave: the presets, the return date each gives,
// and the remaining rolling allowance. Tapping a preset starts leave today.
// ─────────────────────────────────────────────────────────────────────────────

const GUARD_OWNER = "leave-dialog";

export const LeaveDialogElement = defineElement<{
    open: boolean;
    /** The current app day (YYYY-MM-DD, respecting the day-reset hour). */
    today: string;
    leaveHistory: ReadonlyArray<LeaveSpan>;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "leave-dialog",

    events: {
        /** Payload is the number of days to take, starting today. */
        leaveStarted: defineElementEvent<number>(),
        cancelled: defineElementEvent<unknown>(),
    },

    state: () => ({
        wasOpen: false,
    }),

    styles: css`
        :host {
            display: block;
        }

        :host *,
        :host *::before,
        :host *::after {
            box-sizing: border-box;
        }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(var(--color-primary-rgb), 0.65);
            z-index: 400; /* above the bottom nav (200), like add-task-dialog */
            display: flex;
            align-items: flex-end;
            justify-content: center;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        .sheet {
            background: var(--color-surface);
            width: 100%;
            max-width: 600px;
            border-top: 4px solid var(--color-warning);
            padding: 20px 20px 32px;
            animation: sheet-in 0.2s ease-out;
        }

        @keyframes sheet-in {
            from {
                transform: translateY(40px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .sheet-title {
            font-family: var(--font-display);
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: var(--color-primary);
            border-bottom: 1px solid var(--color-border);
            padding-bottom: 8px;
            margin-bottom: 12px;
        }

        .intro {
            font-family: var(--font-accent);
            font-size: 0.9rem;
            color: var(--color-text);
            margin: 0 0 14px;
        }

        .presets {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 14px;
        }

        .preset {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-height: 52px;
            padding: 8px 14px;
            background: var(--color-input-bg);
            color: var(--color-text);
            border: 1px solid var(--color-border-strong);
            border-left: 4px solid var(--color-warning);
            font-family: var(--font-display);
            letter-spacing: 0.12em;
            font-size: 1rem;
            text-align: left;
            cursor: pointer;
        }

        .preset:hover:not([disabled]) {
            border-color: var(--color-primary);
            background: var(--color-surface);
        }

        .preset[disabled] {
            cursor: not-allowed;
            opacity: 0.55;
            border-left-color: var(--color-border-strong);
        }

        .preset-sub {
            font-family: var(--font-mono);
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            color: var(--color-text-muted);
            text-align: right;
        }

        .allowance {
            font-family: var(--font-mono);
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            color: var(--color-text-muted);
            margin-bottom: 16px;
        }

        .actions {
            display: flex;
            justify-content: flex-end;
        }

        .btn-cancel {
            min-height: 44px;
            min-width: 44px;
            padding: 0 18px;
            background: none;
            color: var(--color-text);
            border: 1px solid var(--color-border-strong);
            font-family: var(--font-display);
            letter-spacing: 0.12em;
            font-size: 0.85rem;
            cursor: pointer;
        }

        .btn-cancel:hover {
            border-color: var(--color-primary);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        if (!inputs.open) {
            releaseModalHistoryGuard(GUARD_OWNER);
            if (state.wasOpen) updateState({ wasOpen: false });
            return html``;
        }
        // First render since opening: back closes this dialog instead of leaving the app.
        if (!state.wasOpen) {
            pushModalHistoryGuard(
                () => dispatch(new events.cancelled({ detail: undefined })),
                GUARD_OWNER,
            );
            updateState({ wasOpen: true });
        }

        const s = getActiveSkin().leave;
        const { today, leaveHistory } = inputs;
        const remaining = leaveDaysRemaining(leaveHistory, today);

        return html`
            <div
                class="overlay"
                @click=${(e: Event) => {
                    if (e.target === e.currentTarget)
                        dispatch(new events.cancelled({ detail: undefined }));
                }}
            >
                <div class="sheet" role="dialog" aria-label=${s.dialogTitle}>
                    <div class="sheet-title">${s.dialogTitle}</div>
                    <p class="intro">${s.dialogIntro}</p>

                    <div class="presets">
                        ${LEAVE_PRESETS_DAYS.map((days) => {
                            const available = isPresetAvailable(days, leaveHistory, today);
                            return html`
                                <button
                                    class="preset"
                                    data-days=${days}
                                    ?disabled=${!available}
                                    @click=${() =>
                                        dispatch(
                                            new events.leaveStarted({ detail: days }),
                                        )}
                                >
                                    <span>${s.presetLabel(days)}</span>
                                    <span class="preset-sub">
                                        ${available
                                            ? s.returnLine(
                                                  formatLeaveDay(leaveReturnDay(today, days)),
                                              )
                                            : s.unavailableLabel(remaining)}
                                    </span>
                                </button>
                            `;
                        })}
                    </div>

                    <div class="allowance">${s.allowanceLine(remaining)}</div>

                    <div class="actions">
                        <button
                            class="btn-cancel"
                            @click=${() =>
                                dispatch(new events.cancelled({ detail: undefined }))}
                        >
                            ${s.cancelBtn}
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
});
