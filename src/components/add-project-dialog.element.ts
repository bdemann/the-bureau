import {defineElement, defineElementEvent, css, html} from 'element-vir';
import type {Project, ProjectColor} from '../data/types.js';
import {generateId} from '../data/storage.js';

// ─────────────────────────────────────────────────────────────────────────────
// AddProjectDialogElement
// Modal for creating a new project / "operation".
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_OPTIONS: {key: ProjectColor; label: string; swatch: string}[] = [
    {key: 'red',   label: 'Crimson', swatch: '#C41E3A'},
    {key: 'navy',  label: 'Navy',    swatch: '#1B2A4A'},
    {key: 'gold',  label: 'Gold',    swatch: '#B8860B'},
    {key: 'olive', label: 'Olive',   swatch: '#4A5E2A'},
    {key: 'slate', label: 'Slate',   swatch: '#4A5568'},
];

export const AddProjectDialogElement = defineElement<{
    open: boolean;
}>()({
    tagName: 'add-project-dialog',

    events: {
        projectSubmitted: defineElementEvent<Project>(),
        cancelled:        defineElementEvent<void>(),
    },

    state: () => ({
        name: '',
        description: '',
        colorKey: 'navy' as ProjectColor,
    }),

    styles: css`
        :host { display: block; }

        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(27, 42, 74, 0.65);
            z-index: 200;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            animation: overlay-in 0.15s ease-out;
        }

        @keyframes overlay-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        :host *, :host *::before, :host *::after { box-sizing: border-box; }

        .sheet {
            background: #F5EFE0;
            width: 100%;
            max-width: 600px;
            border-top: 4px solid #B8860B;
            padding: 20px 20px 32px;
            animation: sheet-in 0.2s ease-out;
        }

        @keyframes sheet-in {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }

        .sheet-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.1rem;
            letter-spacing: 0.2em;
            color: #1B2A4A;
            border-bottom: 1px solid rgba(0,0,0,0.15);
            padding-bottom: 8px;
            margin-bottom: 16px;
        }

        .field { margin-bottom: 14px; }

        label {
            display: block;
            font-size: 0.65rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #6B6B6B;
            margin-bottom: 4px;
            font-family: 'Courier Prime', monospace;
        }

        input[type="text"], textarea {
            width: 100%;
            background: #FFFDF7;
            border: 1px solid rgba(0,0,0,0.25);
            border-bottom: 2px solid rgba(0,0,0,0.3);
            padding: 8px 10px;
            font-family: 'Courier Prime', 'Courier New', monospace;
            font-size: 0.9rem;
            color: #2C2C2C;
            border-radius: 1px;
            outline: none;
            transition: border-color 0.15s;
        }
        input:focus, textarea:focus { border-color: #1B2A4A; }

        textarea { resize: none; height: 60px; }

        .color-grid {
            display: flex;
            gap: 10px;
        }

        .color-option { display: none; }

        .color-swatch {
            display: block;
            width: 36px;
            height: 36px;
            border-radius: 2px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: border-color 0.15s, transform 0.1s;
        }

        .color-swatch.selected {
            border-color: #2C2C2C;
            transform: scale(1.1);
        }

        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .btn-submit {
            flex: 1;
            background: #1B2A4A;
            color: #F5EFE0;
            border: none;
            padding: 12px;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 0.95rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            transition: background 0.15s;
        }
        .btn-submit:hover { background: #2A3F6F; }
        .btn-submit:disabled { opacity: 0.4; cursor: default; }

        .btn-cancel {
            background: none;
            border: 1px solid rgba(0,0,0,0.3);
            padding: 12px 16px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.8rem;
            color: #6B6B6B;
            cursor: pointer;
            transition: border-color 0.15s;
        }
        .btn-cancel:hover { border-color: #2C2C2C; color: #2C2C2C; }
    `,

    render({inputs, state, updateState, dispatch, events}) {
        if (!inputs.open) return html``;

        const canSubmit = state.name.trim().length > 0;

        function submit(): void {
            if (!canSubmit) return;
            const project: Project = {
                id: generateId(),
                name: state.name.trim(),
                description: state.description.trim(),
                colorKey: state.colorKey,
                createdAt: Date.now(),
            };
            dispatch(new events.projectSubmitted(project));
            updateState({name: '', description: '', colorKey: 'navy'});
        }

        return html`
            <div class="overlay" @click=${(e: Event) => {
                if (e.target === e.currentTarget) dispatch(new events.cancelled());
            }}>
                <div class="sheet">
                    <div class="sheet-title">OPEN NEW OPERATION</div>

                    <div class="field">
                        <label>Operation Name *</label>
                        <input
                            type="text"
                            .value=${state.name}
                            placeholder="Name this project / operation."
                            @input=${(e: Event) =>
                                updateState({name: (e.target as HTMLInputElement).value})}
                            @keydown=${(e: KeyboardEvent) => {
                                if (e.key === 'Enter') submit();
                            }}
                        />
                    </div>

                    <div class="field">
                        <label>Briefing (optional)</label>
                        <textarea
                            .value=${state.description}
                            placeholder="What is this project about?"
                            @input=${(e: Event) =>
                                updateState({description: (e.target as HTMLTextAreaElement).value})}
                        ></textarea>
                    </div>

                    <div class="field">
                        <label>Designation Color</label>
                        <div class="color-grid">
                            ${COLOR_OPTIONS.map(
                                opt => html`
                                    <div>
                                        <input
                                            type="radio"
                                            class="color-option"
                                            name="color"
                                            id="c-${opt.key}"
                                            .checked=${state.colorKey === opt.key}
                                            @change=${() => updateState({colorKey: opt.key})}
                                        />
                                        <label
                                            for="c-${opt.key}"
                                            class="color-swatch ${state.colorKey === opt.key ? 'selected' : ''}"
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
                            Cancel
                        </button>
                        <button
                            class="btn-submit"
                            ?disabled=${!canSubmit}
                            @click=${submit}
                        >
                            OPEN OPERATION
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
});
