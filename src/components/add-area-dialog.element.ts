import { defineElement, defineElementEvent, css, html } from "element-vir";
import type { Area, AreaColor } from "../data/types.js";
import { generateId } from "../data/storage.js";
import { getActiveSkin } from "../skins/active-skin.js";

// ─────────────────────────────────────────────────────────────────────────────
// AddAreaDialogElement
// Modal for creating a new area.
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_OPTIONS: { key: AreaColor; label: string; swatch: string }[] = [
    { key: "red", label: "Crimson", swatch: "var(--color-danger)" },
    { key: "navy", label: "Navy", swatch: "var(--color-primary)" },
    { key: "gold", label: "Gold", swatch: "var(--color-warning)" },
    { key: "olive", label: "Olive", swatch: "#4A5E2A" },
    { key: "slate", label: "Slate", swatch: "#4A5568" },
];

export const AddAreaDialogElement = defineElement<{
    open: boolean;
    /** Re-render trigger — changes when the active skin changes. */
    activeSkinId: string;
}>()({
    tagName: "add-area-dialog",

    events: {
        areaSubmitted: defineElementEvent<Area>(),
        cancelled: defineElementEvent<void>(),
    },

    state: () => ({
        name: "",
        description: "",
        colorKey: "navy" as AreaColor,
    }),

    styles: css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(var(--color-primary-rgb), 0.65);
            z-index: 200;
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

        :host *,
        :host *::before,
        :host *::after {
            box-sizing: border-box;
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
            margin-bottom: 16px;
        }

        .field {
            margin-bottom: 14px;
        }

        label {
            display: block;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 4px;
            font-family: var(--font-mono);
        }

        input[type="text"],
        textarea {
            width: 100%;
            background: var(--color-input-bg);
            border: 1px solid var(--color-border-strong);
            border-bottom: 2px solid var(--color-border-strong);
            padding: 8px 10px;
            font-family: var(--font-mono);
            font-size: 0.9rem;
            color: var(--color-text);
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input:focus,
        textarea:focus {
            border-color: var(--color-primary);
        }

        textarea {
            resize: none;
            height: 60px;
        }

        .color-grid {
            display: flex;
            gap: 10px;
        }

        .color-option {
            display: none;
        }

        .color-swatch {
            display: block;
            width: 36px;
            height: 36px;
            border-radius: 2px;
            cursor: pointer;
            border: 3px solid transparent;
            transition:
                border-color 0.15s,
                transform 0.1s;
        }

        .color-swatch.selected {
            border-color: var(--color-text);
            transform: scale(1.1);
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .btn-submit {
            flex: 1;
            background: var(--color-primary);
            color: var(--color-surface);
            border: none;
            padding: 12px;
            font-family: var(--font-display);
            font-size: 0.95rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s;
        }
        .btn-submit:hover {
            background: var(--color-primary-hover);
        }
        .btn-submit:disabled {
            opacity: 0.4;
            cursor: default;
        }

        .btn-cancel {
            background: none;
            border: 1px solid var(--color-border-strong);
            padding: 12px 16px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-text-muted);
            cursor: pointer;
            transition: border-color 0.15s;
        }
        .btn-cancel:hover {
            border-color: var(--color-text);
            color: var(--color-text);
        }
    `,

    render({ inputs, state, updateState, dispatch, events }) {
        if (!inputs.open) return html``;

        const skin = getActiveSkin();
        const s = skin.areaEdit;
        const canSubmit = state.name.trim().length > 0;

        function submit(): void {
            if (!canSubmit) return;
            const area: Area = {
                id: generateId(),
                name: state.name.trim(),
                description: state.description.trim(),
                colorKey: state.colorKey,
                createdAt: Date.now(),
            };
            dispatch(new events.areaSubmitted(area));
            updateState({ name: "", description: "", colorKey: "navy" });
        }

        return html`
            <div
                class="overlay"
                @click=${(e: Event) => {
                    if (e.target === e.currentTarget)
                        dispatch(new events.cancelled());
                }}
            >
                <div class="sheet">
                    <div class="sheet-title">${s.createDialogTitle}</div>

                    <div class="field">
                        <label>${s.nameLabel} *</label>
                        <input
                            type="text"
                            .value=${state.name}
                            placeholder=${s.namePlaceholder}
                            @input=${(e: Event) =>
                                updateState({
                                    name: (e.target as HTMLInputElement).value,
                                })}
                            @keydown=${(e: KeyboardEvent) => {
                                if (e.key === "Enter") submit();
                            }}
                        />
                    </div>

                    <div class="field">
                        <label>${s.briefingOptionalLabel}</label>
                        <textarea
                            .value=${state.description}
                            placeholder=${s.briefingPlaceholder}
                            @input=${(e: Event) =>
                                updateState({
                                    description: (
                                        e.target as HTMLTextAreaElement
                                    ).value,
                                })}
                        ></textarea>
                    </div>

                    <div class="field">
                        <label>${s.colorLabel}</label>
                        <div class="color-grid">
                            ${COLOR_OPTIONS.map(
                                (opt) => html`
                                    <div>
                                        <input
                                            type="radio"
                                            class="color-option"
                                            name="color"
                                            id="c-${opt.key}"
                                            .checked=${state.colorKey ===
                                            opt.key}
                                            @change=${() =>
                                                updateState({
                                                    colorKey: opt.key,
                                                })}
                                        />
                                        <label
                                            for="c-${opt.key}"
                                            class="color-swatch ${state.colorKey ===
                                            opt.key
                                                ? "selected"
                                                : ""}"
                                            style="background:${opt.swatch}"
                                            title="${opt.label}"
                                        ></label>
                                    </div>
                                `,
                            )}
                        </div>
                    </div>

                    <div class="actions">
                        <button
                            class="btn-cancel"
                            @click=${() => dispatch(new events.cancelled())}
                        >
                            ${s.cancelBtn}
                        </button>
                        <button
                            class="btn-submit"
                            ?disabled=${!canSubmit}
                            @click=${submit}
                        >
                            ${s.createBtn}
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
});
