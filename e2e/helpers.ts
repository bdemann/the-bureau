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

/**
 * Scopes interactions to the <cadence-picker> element specifically — several
 * of its own button labels ("Daily") collide with unrelated UI (the bottom
 * nav's Daily tab) when queried page-wide.
 */
export function cadencePicker(page: Page) {
    return page.locator("cadence-picker");
}

/**
 * From the Daily view, opens the named commitment's card regardless of which
 * band it landed in or which bands start expanded/collapsed — expands bands
 * one at a time (checking after each) rather than assuming a fixed default,
 * since that default isn't reliably content-independent in practice.
 */
/** Expands whichever Daily-view bands are needed until the named commitment is visible, without clicking it. */
export async function revealCommitmentInDailyView(page: Page, title: string): Promise<void> {
    await page.getByText("Daily", { exact: true }).click();
    const item = page.getByText(title, { exact: true });
    for (const band of ["TODAY'S MANDATORY", "SUGGESTED FOR TODAY", "ON YOUR RADAR", "BACKLOG"]) {
        if (await item.isVisible().catch(() => false)) break;
        await page.getByText(band, { exact: false }).click();
        await page.waitForTimeout(150);
    }
}

export async function openCommitmentFromDailyView(page: Page, title: string): Promise<void> {
    await revealCommitmentInDailyView(page, title);
    await page.getByText(title, { exact: true }).click();
}

export async function createArea(page: Page, name: string): Promise<void> {
    await page.getByText("Areas", { exact: true }).click();
    await page.getByText("NEW AREA OF RESPONSIBILITY").click();
    await page.getByPlaceholder("Amateur Baker", { exact: false }).fill(name);
    await page.getByText("Quick create", { exact: false }).click();
    await page.waitForTimeout(200);
}

/**
 * Patches fields directly on the commitment with the given title in
 * localStorage, then reloads. Used to reach states (high skipStreak,
 * remediationCount, etc.) that would otherwise require simulating many real
 * days passing — the severity thresholds themselves are already covered by
 * data-layer unit tests; this is for checking the app actually *wires* a
 * stored field into the rendered badge/card.
 */
export async function patchCommitmentByTitle(
    page: Page,
    title: string,
    updates: Record<string, unknown>,
): Promise<void> {
    await page.evaluate(
        ({ title, updates }) => {
            const raw = localStorage.getItem("bureau_v1");
            if (!raw) throw new Error("bureau_v1 not found in localStorage");
            const parsed = JSON.parse(raw);
            const task = parsed.commitments.find((c: {title: string}) => c.title === title);
            if (!task) throw new Error(`No commitment titled "${title}" found`);
            Object.assign(task, updates);
            localStorage.setItem("bureau_v1", JSON.stringify(parsed));
        },
        { title, updates },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(200);
}

/** Reads the header's rounded Patriot Score. */
export async function readScore(page: Page): Promise<number> {
    const text = await page.locator(".score-number").first().textContent();
    return Number(text);
}
