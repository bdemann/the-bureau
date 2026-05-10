import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {SnoozeIndicatorElement} from '../../components/snooze-indicator.element.js';

export const snoozeIndicatorPage = defineBookPage({
    parent: undefined,
    title: 'Snooze Indicator',
    defineExamples({defineExample}) {
        const levels: {count: number; label: string}[] = [
            {count: 1, label: 'Warning (1×)'},
            {count: 2, label: 'Caution (2×)'},
            {count: 4, label: 'Danger (4×)'},
            {count: 6, label: 'Critical (6×)'},
        ];
        for (const {count, label} of levels) {
            defineExample({
                title: label,
                render() {
                    return html`
                        <${SnoozeIndicatorElement.assign({snoozeCount: count})}></${SnoozeIndicatorElement}>
                    `;
                },
            });
        }
    },
});
