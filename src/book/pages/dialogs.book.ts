import { html } from "element-vir";
import { defineBookPage } from "element-book";
import { AddAreaDialogElement } from "../../components/add-area-dialog.element.js";
import { AddTaskDialogElement } from "../../components/add-task-dialog.element.js";

export const addAreaPage = defineBookPage({
    parent: undefined,
    title: "Add Area Dialog",
    defineExamples({ defineExample }) {
        defineExample({
            title: "Open",
            render() {
                return html`
                    <div style="position:relative;height:420px;overflow:hidden;transform:scale(1);">
                        <${AddAreaDialogElement.assign({ open: true, activeSkinId: "bcr" })}></${AddAreaDialogElement}>
                    </div>
                `;
            },
        });
    },
});

export const addTaskPage = defineBookPage({
    parent: undefined,
    title: "Add Task Dialog",
    defineExamples({ defineExample }) {
        defineExample({
            title: "Open",
            render() {
                return html`
                    <div style="position:relative;height:560px;overflow:hidden;transform:scale(1);">
                        <${AddTaskDialogElement.assign({ areaId: "p1", open: true, activeSkinId: "bcr" })}></${AddTaskDialogElement}>
                    </div>
                `;
            },
        });
    },
});
