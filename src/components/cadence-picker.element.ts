import { css, defineElement, defineElementEvent, html } from 'element-vir';
import { ViraButton, ViraColorVariant, ViraEmphasis, ViraSize } from 'vira';
import type { RecurrenceCadence, RecurrenceConfig, ScheduleMode } from '../data/types.js';

// ── Public types ─────────────────────────────────────────────────────────────

/**
 * All cadence sub-fields as a flat object — the form state that drives the
 * picker.  Parents hold this, pass it in, and receive updated copies back via
 * cadenceChange events.  Convert to/from RecurrenceConfig with the helpers
 * below.
 */
export interface CadenceConfig {
    cadence: RecurrenceCadence;
    scheduleMode: ScheduleMode;
    /** Weekly: which days of the week are selected (0 = Sun … 6 = Sat). */
    daysOfWeek: ReadonlySet<number>;
    /** Monthly / quarterly anchor type. */
    monthAnchorMode: 'dom' | 'ordinal';
    /** Yearly anchor type. */
    yearAnchorMode: 'dom' | 'ordinal';
    /** Monthly / quarterly: selected day(s) of the month (1–31). */
    daysOfMonth: ReadonlySet<number>;
    /** Yearly: day of the month (1–31). */
    dayOfMonth: number;
    /** Monthly ordinal: which occurrence (1st / 2nd / … / Last). */
    ordinalWeek: 1 | 2 | 3 | 4 | 5 | -1;
    /** Monthly ordinal: which weekday (0 = Sun … 6 = Sat). */
    dayOfWeek: number;
    /** Quarterly: which month within the quarter (0 = first, 1 = second, 2 = third). */
    quarterMonth: 0 | 1 | 2;
    /** Yearly: which month (0 = Jan … 11 = Dec). */
    annualMonth: number;
}

/** Sensible defaults for a brand-new cadence config. */
export function defaultCadenceConfig(
    cadence: RecurrenceCadence = 'weekly',
): CadenceConfig {
    const today = new Date();
    return {
        cadence,
        scheduleMode: cadence === 'daily' || cadence === 'multiple_per_day' ? 'rolling' : 'fixed',
        daysOfWeek: new Set([today.getDay()]),
        monthAnchorMode: 'dom',
        yearAnchorMode: 'dom',
        daysOfMonth: new Set([today.getDate()]),
        dayOfMonth: today.getDate(),
        ordinalWeek: 1,
        dayOfWeek: today.getDay(),
        quarterMonth: 0,
        annualMonth: today.getMonth(),
    };
}

/** Reconstruct a CadenceConfig from a persisted RecurrenceConfig (edit mode). */
export function cadenceConfigFromRecurrence(cfg: RecurrenceConfig): CadenceConfig {
    const base = defaultCadenceConfig(cfg.cadence);
    const rawDaysOfWeek = cfg.hardDaysOfWeek
        ?? (cfg.hardDayOfWeek !== undefined ? [cfg.hardDayOfWeek] : null);
    return {
        ...base,
        cadence: cfg.cadence,
        scheduleMode: cfg.scheduleMode,
        daysOfWeek: new Set(rawDaysOfWeek ?? [base.daysOfWeek.values().next().value ?? 1]),
        monthAnchorMode: (cfg.cadence === 'monthly' || cfg.cadence === 'quarterly') && cfg.ordinalWeek !== undefined ? 'ordinal' : 'dom',
        yearAnchorMode: cfg.cadence === 'yearly' && cfg.ordinalWeek !== undefined ? 'ordinal' : 'dom',
        daysOfMonth: new Set(
            cfg.hardDaysOfMonth
                ?? (cfg.hardDayOfMonth !== undefined ? [cfg.hardDayOfMonth] : [1]),
        ),
        dayOfMonth: cfg.hardDayOfMonth ?? cfg.hardDaysOfMonth?.[0] ?? base.dayOfMonth,
        ordinalWeek: cfg.ordinalWeek ?? 1,
        dayOfWeek: cfg.hardDayOfWeek ?? base.dayOfWeek,
        quarterMonth: cfg.hardMonthOfQuarter ?? 0,
        annualMonth: cfg.hardMonthOfYear ?? base.annualMonth,
    };
}

/**
 * Build the anchor fields for a RecurrenceConfig from a CadenceConfig.
 * Callers add endMode, endAfterCount, endAfterDate, startDate, etc.
 */
export function buildRecurrenceAnchors(config: CadenceConfig): Partial<RecurrenceConfig> {
    switch (config.cadence) {
        case 'weekly': {
            return {
                hardDaysOfWeek: [...config.daysOfWeek].sort((a, b) => a - b),
            };
        }
        case 'monthly': {
            if (config.monthAnchorMode === 'ordinal') {
                return { hardDayOfWeek: config.dayOfWeek, ordinalWeek: config.ordinalWeek };
            }
            const sorted = [...config.daysOfMonth].sort((a, b) => a - b);
            return sorted.length > 1
                ? { hardDaysOfMonth: sorted }
                : { hardDayOfMonth: sorted[0] ?? 1 };
        }
        case 'quarterly': {
            const sorted = [...config.daysOfMonth].sort((a, b) => a - b);
            return sorted.length > 1
                ? { hardMonthOfQuarter: config.quarterMonth, hardDaysOfMonth: sorted }
                : { hardMonthOfQuarter: config.quarterMonth, hardDayOfMonth: sorted[0] ?? 1 };
        }
        case 'yearly': {
            if (config.yearAnchorMode === 'ordinal') {
                return {
                    hardMonthOfYear: config.annualMonth,
                    hardDayOfWeek: config.dayOfWeek,
                    ordinalWeek: config.ordinalWeek,
                };
            }
            return {
                hardMonthOfYear: config.annualMonth,
                hardDayOfMonth: config.dayOfMonth,
            };
        }
        default:
            return {};
    }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CADENCE_BUTTONS: ReadonlyArray<{ value: RecurrenceCadence; label: string }> = [
    { value: 'daily',     label: 'Daily' },
    { value: 'weekly',    label: 'Weekly' },
    { value: 'monthly',   label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly',    label: 'Annually' },
];

const DAY_LABELS: ReadonlyArray<{ value: number; label: string }> = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

const DOM_RANGE: ReadonlyArray<number> = Array.from({ length: 31 }, (_, i) => i + 1);

const QUARTER_MONTH_LABELS: ReadonlyArray<{ value: 0 | 1 | 2; label: string }> = [
    { value: 0, label: '1st month' },
    { value: 1, label: '2nd month' },
    { value: 2, label: '3rd month' },
];

const MONTH_LABELS: ReadonlyArray<{ value: number; label: string }> = [
    { value: 0,  label: 'Jan' }, { value: 1,  label: 'Feb' },
    { value: 2,  label: 'Mar' }, { value: 3,  label: 'Apr' },
    { value: 4,  label: 'May' }, { value: 5,  label: 'Jun' },
    { value: 6,  label: 'Jul' }, { value: 7,  label: 'Aug' },
    { value: 8,  label: 'Sep' }, { value: 9,  label: 'Oct' },
    { value: 10, label: 'Nov' }, { value: 11, label: 'Dec' },
];

const ORDINAL_VALUES: ReadonlyArray<1 | 2 | 3 | 4 | 5 | -1> = [1, 2, 3, 4, 5, -1];

// ── Helper functions ──────────────────────────────────────────────────────────

function ordinalSuffix(n: number): string {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n}st`;
    if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
    return `${n}th`;
}

function formatSelectedDays(days: ReadonlySet<number>): string {
    const sorted = [...days].sort((a, b) => a - b);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (sorted.length === 0) return 'No days selected.';
    if (sorted.length === 7) return 'Every day.';
    if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6))
        return 'Every weekday (Mon–Fri).';
    if (sorted.length === 6 && !sorted.includes(6)) return 'Every day except Saturday.';
    if (sorted.length === 6 && !sorted.includes(0)) return 'Every day except Sunday.';
    return sorted.map((d) => names[d]).join(', ') + '.';
}

function formatSelectedDoms(doms: ReadonlySet<number>): string {
    const sorted = [...doms].sort((a, b) => a - b);
    if (sorted.length === 0) return 'No days selected.';
    const labels = sorted.map(ordinalSuffix);
    if (labels.length === 1) return `The ${labels[0]} of each month.`;
    if (labels.length === 2) return `The ${labels[0]} and ${labels[1]} of each month.`;
    return `The ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]} of each month.`;
}

function quarterMonthSummary(m: 0 | 1 | 2): string {
    return (['Jan · Apr · Jul · Oct', 'Feb · May · Aug · Nov', 'Mar · Jun · Sep · Dec'] as const)[m];
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CadencePickerElement = defineElement<{ config: CadenceConfig }>()({
    tagName: 'cadence-picker',

    events: {
        cadenceChange: defineElementEvent<CadenceConfig>(),
    },

    styles: css`
        :host {
            display: block;
        }

        .field {
            margin-bottom: 14px;
        }

        .field-label {
            display: block;
            font-family: var(--font-display);
            font-size: 0.7rem;
            letter-spacing: 0.08em;
            color: var(--color-text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
        }

        /* 5-column cadence row */
        .cadence-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }

        /* Re-usable 2- and 3-column variants */
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
        .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }

        /* Day-of-week (7 columns) */
        .dow-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }

        /* Day-of-month (7 columns, numbers 1–31) */
        .dom-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 3px;
        }

        /* All buttons in grids get 44 px touch target */
        .cadence-grid ${ViraButton},
        .grid-2 ${ViraButton},
        .grid-3 ${ViraButton},
        .grid-4 ${ViraButton},
        .grid-6 ${ViraButton},
        .dow-grid ${ViraButton},
        .dom-grid ${ViraButton} {
            width: 100%;
            min-height: 44px;
        }

        .anchor-summary {
            margin-top: 6px;
            font-size: 0.72rem;
            color: var(--color-text-muted);
            font-family: var(--font-mono);
        }
    `,

    render({ inputs, dispatch, events }) {
        const { config } = inputs;

        function update(partial: Partial<CadenceConfig>): void {
            dispatch(new events.cadenceChange({ ...config, ...partial }));
        }

        function toggleDay(day: number): void {
            const next = new Set(config.daysOfWeek);
            if (next.has(day)) {
                if (next.size > 1) next.delete(day);
            } else {
                next.add(day);
            }
            update({ daysOfWeek: next });
        }

        function toggleDom(day: number): void {
            const next = new Set(config.daysOfMonth);
            if (next.has(day)) {
                if (next.size > 1) next.delete(day);
            } else {
                next.add(day);
            }
            update({ daysOfMonth: next });
        }

        const isDaily = config.cadence === 'daily' || config.cadence === 'multiple_per_day';

        return html`
            <!-- Cadence row -->
            <div class="field">
                <span class="field-label">Cadence</span>
                <div class="cadence-grid">
                    ${CADENCE_BUTTONS.map((c) => html`
                        <${ViraButton.assign({
                            text: c.label,
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.cadence === c.value
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ cadence: c.value })}
                        ></${ViraButton}>
                    `)}
                </div>
            </div>

            <!-- Schedule mode — hidden for daily (distinction is meaningless) -->
            ${!isDaily ? html`
                <div class="field">
                    <span class="field-label">Repeat Cycle</span>
                    <div class="grid-2">
                        <${ViraButton.assign({
                            text: 'After last done',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.scheduleMode === 'rolling'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ scheduleMode: 'rolling' })}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: 'Calendar date',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.scheduleMode === 'fixed'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ scheduleMode: 'fixed' })}
                        ></${ViraButton}>
                    </div>
                </div>
            ` : html``}

            <!-- Weekly: day-of-week multi-select -->
            ${config.cadence === 'weekly' ? html`
                <div class="field">
                    <span class="field-label">Days of Week</span>
                    <div class="dow-grid">
                        ${DAY_LABELS.map((d) => html`
                            <${ViraButton.assign({
                                text: d.label,
                                color: ViraColorVariant.Info,
                                buttonEmphasis: config.daysOfWeek.has(d.value)
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => toggleDay(d.value)}
                            ></${ViraButton}>
                        `)}
                    </div>
                    <div class="anchor-summary">${formatSelectedDays(config.daysOfWeek)}</div>
                </div>
            ` : html``}

            <!-- Monthly: dom/ordinal toggle + sub-picker -->
            ${config.cadence === 'monthly' ? html`
                <div class="field">
                    <span class="field-label">Monthly Anchor</span>
                    <div class="grid-2">
                        <${ViraButton.assign({
                            text: 'Day of month',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.monthAnchorMode === 'dom'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ monthAnchorMode: 'dom' })}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: 'Nth weekday',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.monthAnchorMode === 'ordinal'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ monthAnchorMode: 'ordinal' })}
                        ></${ViraButton}>
                    </div>
                </div>

                ${config.monthAnchorMode === 'dom' ? html`
                    <div class="field">
                        <span class="field-label">Day(s) of Month</span>
                        <div class="dom-grid">
                            ${DOM_RANGE.map((d) => html`
                                <${ViraButton.assign({
                                    text: String(d),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.daysOfMonth.has(d)
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => toggleDom(d)}
                                ></${ViraButton}>
                            `)}
                        </div>
                        <div class="anchor-summary">${formatSelectedDoms(config.daysOfMonth)}</div>
                    </div>
                ` : html`
                    <div class="field">
                        <span class="field-label">Which Occurrence</span>
                        <div class="grid-6">
                            ${ORDINAL_VALUES.map((w) => html`
                                <${ViraButton.assign({
                                    text: w === -1 ? 'Last' : w === 5 ? '5th*' : ordinalSuffix(w),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.ordinalWeek === w
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => update({ ordinalWeek: w })}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>
                    <div class="field">
                        <span class="field-label">Day of Week</span>
                        <div class="dow-grid">
                            ${DAY_LABELS.map((d) => html`
                                <${ViraButton.assign({
                                    text: d.label,
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.dayOfWeek === d.value
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => update({ dayOfWeek: d.value })}
                                ></${ViraButton}>
                            `)}
                        </div>
                        <div class="anchor-summary">
                            The ${config.ordinalWeek === -1 ? 'last' : ordinalSuffix(config.ordinalWeek)}
                            ${DAY_LABELS.find((d) => d.value === config.dayOfWeek)?.label ?? ''}
                            of each month${config.ordinalWeek === 5 ? ' (skips months without a 5th)' : ''}.
                        </div>
                    </div>
                `}
            ` : html``}

            <!-- Quarterly: month-of-quarter + day(s)-of-month -->
            ${config.cadence === 'quarterly' ? html`
                <div class="field">
                    <span class="field-label">Month of Quarter</span>
                    <div class="grid-3">
                        ${QUARTER_MONTH_LABELS.map((q) => html`
                            <${ViraButton.assign({
                                text: q.label,
                                color: ViraColorVariant.Info,
                                buttonEmphasis: config.quarterMonth === q.value
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => update({ quarterMonth: q.value })}
                            ></${ViraButton}>
                        `)}
                    </div>
                    <div class="anchor-summary">${quarterMonthSummary(config.quarterMonth)}</div>
                </div>
                <div class="field">
                    <span class="field-label">Day(s) of Month</span>
                    <div class="dom-grid">
                        ${DOM_RANGE.map((d) => html`
                            <${ViraButton.assign({
                                text: String(d),
                                color: ViraColorVariant.Info,
                                buttonEmphasis: config.daysOfMonth.has(d)
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => toggleDom(d)}
                            ></${ViraButton}>
                        `)}
                    </div>
                    <div class="anchor-summary">${formatSelectedDoms(config.daysOfMonth)}</div>
                </div>
            ` : html``}

            <!-- Yearly: month + anchor type (dom or ordinal) -->
            ${config.cadence === 'yearly' ? html`
                <div class="field">
                    <span class="field-label">Month</span>
                    <div class="grid-4">
                        ${MONTH_LABELS.map((m) => html`
                            <${ViraButton.assign({
                                text: m.label,
                                color: ViraColorVariant.Info,
                                buttonEmphasis: config.annualMonth === m.value
                                    ? ViraEmphasis.Standard
                                    : ViraEmphasis.Subtle,
                                buttonSize: ViraSize.Small,
                            })}
                                @click=${() => update({ annualMonth: m.value })}
                            ></${ViraButton}>
                        `)}
                    </div>
                </div>
                <div class="field">
                    <span class="field-label">Day Anchor</span>
                    <div class="grid-2">
                        <${ViraButton.assign({
                            text: 'Day of month',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.yearAnchorMode === 'dom'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ yearAnchorMode: 'dom' })}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: 'Nth weekday',
                            color: ViraColorVariant.Info,
                            buttonEmphasis: config.yearAnchorMode === 'ordinal'
                                ? ViraEmphasis.Standard
                                : ViraEmphasis.Subtle,
                            buttonSize: ViraSize.Small,
                        })}
                            @click=${() => update({ yearAnchorMode: 'ordinal' })}
                        ></${ViraButton}>
                    </div>
                </div>

                ${config.yearAnchorMode === 'dom' ? html`
                    <div class="field">
                        <span class="field-label">Day of Month</span>
                        <div class="dom-grid">
                            ${DOM_RANGE.map((d) => html`
                                <${ViraButton.assign({
                                    text: String(d),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.dayOfMonth === d
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => update({ dayOfMonth: d })}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>
                ` : html`
                    <div class="field">
                        <span class="field-label">Which Occurrence</span>
                        <div class="grid-6">
                            ${ORDINAL_VALUES.map((w) => html`
                                <${ViraButton.assign({
                                    text: w === -1 ? 'Last' : w === 5 ? '5th*' : ordinalSuffix(w),
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.ordinalWeek === w
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => update({ ordinalWeek: w })}
                                ></${ViraButton}>
                            `)}
                        </div>
                    </div>
                    <div class="field">
                        <span class="field-label">Day of Week</span>
                        <div class="dow-grid">
                            ${DAY_LABELS.map((d) => html`
                                <${ViraButton.assign({
                                    text: d.label,
                                    color: ViraColorVariant.Info,
                                    buttonEmphasis: config.dayOfWeek === d.value
                                        ? ViraEmphasis.Standard
                                        : ViraEmphasis.Subtle,
                                    buttonSize: ViraSize.Small,
                                })}
                                    @click=${() => update({ dayOfWeek: d.value })}
                                ></${ViraButton}>
                            `)}
                        </div>
                        <div class="anchor-summary">
                            The ${config.ordinalWeek === -1 ? 'last' : ordinalSuffix(config.ordinalWeek)}
                            ${DAY_LABELS.find((d) => d.value === config.dayOfWeek)?.label ?? ''}
                            of ${MONTH_LABELS.find((m) => m.value === config.annualMonth)?.label ?? ''}
                            each year${config.ordinalWeek === 5 ? ' (skips years where that month lacks a 5th)' : ''}.
                        </div>
                    </div>
                `}
            ` : html``}
        `;
    },
});
