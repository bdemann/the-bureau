import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {CharacterDialogueElement} from '../../components/character-dialogue.element.js';

export const characterDialoguePage = defineBookPage({
    parent: undefined,
    title: 'Character Dialogue',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Director Briggs — official notice',
            render() {
                return html`
                    <${CharacterDialogueElement.assign({
                        dialogue: {
                            id: '1',
                            character: 'director',
                            message: 'Your civic performance metrics are under review. Ensure all pending obligations are addressed before end of cycle.',
                            timestamp: Date.now(),
                            dismissed: false,
                        },
                    })}></${CharacterDialogueElement}>
                `;
            },
        });
        defineExample({
            title: 'Agent Whitaker — internal memo',
            render() {
                return html`
                    <${CharacterDialogueElement.assign({
                        dialogue: {
                            id: '2',
                            character: 'agent',
                            message: "Good work clearing the backlog. Keep the momentum — the Director's been watching closely this quarter.",
                            timestamp: Date.now(),
                            dismissed: false,
                        },
                    })}></${CharacterDialogueElement}>
                `;
            },
        });
        defineExample({
            title: 'Director — day start briefing',
            render() {
                return html`
                    <${CharacterDialogueElement.assign({
                        dialogue: {
                            id: '3',
                            character: 'director',
                            message: 'New day, new obligations. Your docket has been updated. Review and prioritize accordingly.',
                            timestamp: Date.now(),
                            dismissed: false,
                        },
                    })}></${CharacterDialogueElement}>
                `;
            },
        });
        defineExample({
            title: 'Agent — completion commendation',
            render() {
                return html`
                    <${CharacterDialogueElement.assign({
                        dialogue: {
                            id: '4',
                            character: 'agent',
                            message: 'Task cleared. Every completed item is a mark in your permanent record — the good kind.',
                            timestamp: Date.now(),
                            dismissed: false,
                        },
                    })}></${CharacterDialogueElement}>
                `;
            },
        });
    },
});
