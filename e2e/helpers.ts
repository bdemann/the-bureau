import { expect, type Page } from "@playwright/test";

/**
 * Walks light + shadow DOM and fails the test if any element's border box
 * extends past the viewport edges. Catches the "button hangs off the edge
 * and you have to scroll to reach it" class of bug on narrow viewports.
 */
export async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
    const overflowing = await page.evaluate(() => {
        function* walk(root: Element | ShadowRoot): Generator<Element> {
            const stack: (Element | ShadowRoot)[] = [root];
            while (stack.length) {
                const node = stack.pop()!;
                if ("shadowRoot" in node && node.shadowRoot) stack.push(node.shadowRoot);
                for (const child of node.children ?? []) stack.push(child);
                if (node instanceof Element) yield node;
            }
        }

        const vw = document.documentElement.clientWidth;
        const found: {tag: string; text: string; left: number; right: number}[] = [];
        for (const el of walk(document.body)) {
            const style = getComputedStyle(el);
            if (style.position === "fixed" && style.visibility === "hidden") continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) continue;
            if (rect.right > vw + 1 || rect.left < -1) {
                found.push({
                    tag: el.tagName,
                    text: (el.textContent ?? "").trim().slice(0, 40),
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                });
            }
        }
        return found;
    });

    expect(overflowing, `${label}: elements overflowing the viewport horizontally: ${JSON.stringify(overflowing)}`).toEqual([]);
}

export async function openMakeCommitment(page: Page): Promise<void> {
    await page.getByText("MAKE COMMITMENT", { exact: false }).first().click();
    await expect(page.getByText("MAKE NEW", { exact: false }).first()).toBeVisible();
}

export async function fillTitle(page: Page, value: string): Promise<void> {
    await page.getByPlaceholder("Describe the commitment clearly.").fill(value);
}

export async function createGoal(page: Page, title: string): Promise<void> {
    await page.getByText("Goals", { exact: true }).click();
    await page.getByText("MAKE GOAL", { exact: false }).first().click();
    await fillTitle(page, title);
    await page.getByText("SET GOAL", { exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
}

/** Opens a goal's detail view, adds a Task linked to it via "MAKE NEW COMMITMENT". */
export async function addTaskLinkedToGoal(page: Page, goalTitle: string, taskTitle: string): Promise<void> {
    await page.getByText("Goals", { exact: true }).click();
    await page.getByText(goalTitle, { exact: true }).click();
    await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
    await page.getByText("Task", { exact: true }).click();
    await fillTitle(page, taskTitle);
    await page.getByText("ADD TASK", { exact: true }).click();
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
}
