import { defineElement, html } from "element-vir";
import { ElementBookApp } from "element-book";
import { headerPage } from "./pages/header.book.js";
import { taskItemPage } from "./pages/task-item.book.js";
import { areaCardPage } from "./pages/area-card.book.js";
import { snoozeIndicatorPage } from "./pages/snooze-indicator.book.js";
import { skipIndicatorPage } from "./pages/skip-indicator.book.js";
import { characterDialoguePage } from "./pages/character-dialogue.book.js";
import { addAreaPage, addTaskPage } from "./pages/dialogs.book.js";

defineElement()({
    tagName: "bcr-book",
    render() {
        return html`
            <${ElementBookApp.assign({
                pages: [
                    headerPage,
                    taskItemPage,
                    areaCardPage,
                    snoozeIndicatorPage,
                    skipIndicatorPage,
                    characterDialoguePage,
                    addAreaPage,
                    addTaskPage,
                ],
                themeColor: "#1B2A4A",
                internalRouterConfig: {
                    useInternalRouter: true,
                    basePath: "book",
                },
            })}></${ElementBookApp}>
        `;
    },
});
