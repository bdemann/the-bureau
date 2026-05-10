import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {BureauHeaderElement} from '../../components/bureau-header.element.js';

export const headerPage = defineBookPage({
    parent: undefined,
    title: 'Bureau Header',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Dashboard — nominal score',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 100,
                        streak: 3,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'Project view — with back button',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 100,
                        streak: 5,
                        onBack: () => {},
                        projectName: 'Homeowner',
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'Low score (red)',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 25,
                        streak: 0,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'Warning score (orange)',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 55,
                        streak: 1,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'High score (bright gold)',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 175,
                        streak: 21,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'No streak',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 100,
                        streak: 0,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
    },
});
