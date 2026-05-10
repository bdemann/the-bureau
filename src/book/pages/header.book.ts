import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {BureauHeaderElement} from '../../components/bureau-header.element.js';

export const headerPage = defineBookPage({
    parent: undefined,
    title: 'Bureau Header',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Rank: Patriot (130+)',
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
            title: 'Rank: Loyal Citizen (100–129)',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 110,
                        streak: 3,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'Rank: Citizen (70–99)',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 85,
                        streak: 0,
                        onBack: null,
                        projectName: null,
                    })}></${BureauHeaderElement}>
                `;
            },
        });
        defineExample({
            title: 'Rank: Disengaged Citizen (40–69)',
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
            title: 'Rank: Suspected Communist (0–39)',
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
            title: 'Project view — with back button',
            render() {
                return html`
                    <${BureauHeaderElement.assign({
                        patriotScore: 110,
                        streak: 5,
                        onBack: () => {},
                        projectName: 'Homeowner',
                    })}></${BureauHeaderElement}>
                `;
            },
        });
    },
});
