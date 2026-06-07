import { css, defineElement, defineElementEvent, html } from "element-vir";
import { getActiveSkin } from "../skins/active-skin.js";
import { ALL_SKINS } from "../skins/all-skins.js";
import { DEFAULT_TIME_SETTINGS, type TimeSettings } from "../data/types.js";

export const PreferencesViewElement = defineElement<{
    activeSkinId: string;
    timeSettings: TimeSettings;
    darkMode: boolean;
}>()({
    tagName: "preferences-view",

    events: {
        skinChangeRequested: defineElementEvent<string>(),
        timeSettingsChanged: defineElementEvent<TimeSettings>(),
        darkModeChanged: defineElementEvent<boolean>(),
    },

    styles: css`
        :host {
            display: block;
            padding: 16px 16px 80px;
        }

        .page-title {
            font-family: var(--font-display);
            font-size: 1.4rem;
            letter-spacing: 0.25em;
            color: var(--color-primary);
            margin-bottom: 4px;
        }

        .page-subtitle {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
            margin-bottom: 24px;
        }

        .section {
            margin-bottom: 28px;
        }

        .section-label {
            font-family: var(--font-mono);
            font-size: 0.62rem;
            letter-spacing: 0.2em;
            color: var(--color-text-muted);
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        /* ── Skin picker ── */
        .skin-picker {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .skin-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            background: none;
            border: 1px solid rgba(0, 0, 0, 0.15);
            color: var(--color-text-muted);
            font-family: var(--font-mono);
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            text-align: left;
            padding: 9px 12px;
            cursor: pointer;
            transition:
                border-color 0.15s,
                color 0.15s,
                background 0.15s;
        }

        .skin-btn:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
        }

        .skin-btn.active {
            border-color: var(--color-warning);
            color: var(--color-primary);
            background: rgba(184, 134, 11, 0.06);
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

        /* ── Dark mode toggle ── */
        .dark-mode-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0;
        }

        .dark-mode-label {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            letter-spacing: 0.1em;
            color: var(--color-text-muted);
        }

        .toggle {
            position: relative;
            width: 40px;
            height: 22px;
            flex-shrink: 0;
        }

        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
            position: absolute;
        }

        .toggle-track {
            position: absolute;
            inset: 0;
            border-radius: 11px;
            background: rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s;
        }

        .toggle input:checked + .toggle-track {
            background: var(--color-primary);
            border-color: var(--color-primary);
        }

        .toggle-track::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: white;
            transition: transform 0.2s;
        }

        .toggle input:checked + .toggle-track::after {
            transform: translateX(18px);
        }

        /* ── Time-settings grid ── */
        .time-settings-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 6px 8px;
            align-items: center;
        }

        .time-setting-label {
            font-family: var(--font-mono);
            font-size: 0.65rem;
            letter-spacing: 0.08em;
            color: var(--color-primary);
        }

        .time-setting-select {
            background: transparent;
            border: 1px solid rgba(0, 0, 0, 0.2);
            color: var(--color-primary);
            font-family: var(--font-mono);
            font-size: 0.65rem;
            padding: 4px 8px;
            cursor: pointer;
            min-width: 80px;
        }

        .time-setting-select:focus {
            outline: 1px solid var(--color-warning);
            border-color: var(--color-warning);
        }
    `,

    render({ inputs, dispatch, events }) {
        const { activeSkinId, timeSettings, darkMode } = inputs;
        const skin = getActiveSkin();

        return html`
            <h1 class="page-title">PREFERENCES</h1>
            <p class="page-subtitle">Appearance · Schedule</p>

            <div class="section">
                <div class="section-label">${skin.menu.appearanceLabel}</div>

                <div class="dark-mode-row">
                    <span class="dark-mode-label">Dark mode</span>
                    <label class="toggle">
                        <input
                            type="checkbox"
                            ?checked=${darkMode}
                            @change=${(e: Event) =>
                                dispatch(
                                    new events.darkModeChanged(
                                        (e.target as HTMLInputElement).checked,
                                    ),
                                )}
                        />
                        <span class="toggle-track"></span>
                    </label>
                </div>

                <div class="skin-picker">
                    ${ALL_SKINS.map(
                        (s) => html`
                            <button
                                class=${"skin-btn" +
                                    (s.id === activeSkinId ? " active" : "")}
                                @click=${() =>
                                    dispatch(
                                        new events.skinChangeRequested(s.id),
                                    )}
                            >
                                <span class="skin-dot"></span>
                                ${s.displayName}
                            </button>
                        `,
                    )}
                </div>
            </div>

            <div class="section">
                <div class="section-label">SCHEDULE</div>
                <div class="time-settings-grid">
                    ${(
                        [
                            ["Morning", "morningStart"],
                            ["Afternoon", "afternoonStart"],
                            ["Evening", "eveningStart"],
                            ["Bedtime", "bedtimeStart"],
                            ["Day resets", "dayResetHour"],
                        ] as [string, keyof typeof DEFAULT_TIME_SETTINGS][]
                    ).map(
                        ([label, key]) => html`
                            <span class="time-setting-label">${label}</span>
                            <select
                                class="time-setting-select"
                                @change=${(e: Event) => {
                                    const val = parseInt(
                                        (e.target as HTMLSelectElement).value,
                                        10,
                                    );
                                    dispatch(
                                        new events.timeSettingsChanged({
                                            ...timeSettings,
                                            [key]: val,
                                        }),
                                    );
                                }}
                            >
                                ${Array.from(
                                    { length: 24 },
                                    (_, h) => html`
                                        <option
                                            value=${h}
                                            ?selected=${timeSettings[key] === h}
                                        >
                                            ${h === 0
                                                ? "12 AM"
                                                : h < 12
                                                  ? `${h} AM`
                                                  : h === 12
                                                    ? "12 PM"
                                                    : `${h - 12} PM`}
                                        </option>
                                    `,
                                )}
                            </select>
                        `,
                    )}
                </div>
            </div>
        `;
    },
});
