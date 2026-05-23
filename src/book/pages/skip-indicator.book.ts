import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {SkipIndicatorElement} from '../../components/skip-indicator.element.js';

export const skipIndicatorPage = defineBookPage({
    parent: undefined,
    title: 'Skip Indicator',
    defineExamples({defineExample}) {
        const levels: {streak: number; label: string}[] = [
            {streak: 1,  label: 'Warning (1×)'},
            {streak: 2,  label: 'Caution (2×)'},
            {streak: 4,  label: 'Danger (4×)'},
            {streak: 6,  label: 'Critical (6×) — Chronic Avoidance'},
            {streak: 10, label: 'Critical (10×)'},
        ];
        for (const {streak, label} of levels) {
            defineExample({
                title: label,
                render() {
                    return html`
                        <${SkipIndicatorElement.assign({skipStreak: streak})}></${SkipIndicatorElement}>
                    `;
                },
            });
        }
    },
});
