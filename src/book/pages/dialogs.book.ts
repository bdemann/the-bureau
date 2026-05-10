import {html} from 'element-vir';
import {defineBookPage} from 'element-book';
import {AddProjectDialogElement} from '../../components/add-project-dialog.element.js';
import {AddTaskDialogElement} from '../../components/add-task-dialog.element.js';

export const addProjectPage = defineBookPage({
    parent: undefined,
    title: 'Add Project Dialog',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Open',
            render() {
                return html`
                    <div style="position:relative;height:420px;overflow:hidden;">
                        <${AddProjectDialogElement.assign({open: true})}></${AddProjectDialogElement}>
                    </div>
                `;
            },
        });
    },
});

export const addTaskPage = defineBookPage({
    parent: undefined,
    title: 'Add Task Dialog',
    defineExamples({defineExample}) {
        defineExample({
            title: 'Open',
            render() {
                return html`
                    <div style="position:relative;height:560px;overflow:hidden;">
                        <${AddTaskDialogElement.assign({projectId: 'p1', open: true})}></${AddTaskDialogElement}>
                    </div>
                `;
            },
        });
    },
});
