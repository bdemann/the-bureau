import {defineElement, html} from 'element-vir';
import {ElementBookApp} from 'element-book';
import {headerPage} from './pages/header.book.js';
import {taskItemPage} from './pages/task-item.book.js';
import {projectCardPage} from './pages/project-card.book.js';
import {snoozeIndicatorPage} from './pages/snooze-indicator.book.js';
import {characterDialoguePage} from './pages/character-dialogue.book.js';
import {addProjectPage, addTaskPage} from './pages/dialogs.book.js';

defineElement()({
    tagName: 'bcr-book',
    render() {
        return html`
            <${ElementBookApp.assign({
                pages: [
                    headerPage,
                    taskItemPage,
                    projectCardPage,
                    snoozeIndicatorPage,
                    characterDialoguePage,
                    addProjectPage,
                    addTaskPage,
                ],
                themeColor: '#1B2A4A',
                internalRouterConfig: {
                    useInternalRouter: true,
                    basePath: 'book',
                },
            })}></${ElementBookApp}>
        `;
    },
});
