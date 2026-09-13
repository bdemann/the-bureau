import { expect, test } from "@playwright/test";
import { createArea, fillTitle, openSection, revealCommitmentInDailyView } from "./helpers";

// Mirrors TESTING.md's "Reordering commitments" and "Reordering areas
// (dashboard)" sections. Uses Playwright's native dragTo (real HTML5
// drag-and-drop events — these components use draggable="true" +
// dragstart/dragover/drop, not pointer-based dragging).

async function readOrder(page: import("@playwright/test").Page, key: "commitments" | "areas") {
    return page.evaluate((key) => {
        const raw = localStorage.getItem("bureau_v1")!;
        const parsed = JSON.parse(raw);
        return parsed[key].map((c: {id: string; title?: string; name?: string}) => c.title ?? c.name);
    }, key);
}

test.describe("Reordering commitments", () => {
    test("drag handle is present on daily-view and area-detail cards", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "Task A");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("⠿", { exact: true }).first()).toBeVisible();
        await page.getByText("Daily", { exact: true }).click();
        await revealCommitmentInDailyView(page, "Task A");
        await expect(page.getByText("⠿", { exact: true }).first()).toBeVisible();
    });

    test("dragging one commitment onto another reorders them, and it persists after reload", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();

        for (const title of ["Task A", "Task B"]) {
            await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
            await fillTitle(page, title);
            await openSection(page, "Window & Deadline");
            await page.getByText("Flexible", { exact: true }).click();
            await page.getByText("ADD TASK", { exact: true }).click();
            await page.waitForTimeout(300);
        }

        const before = await readOrder(page, "commitments");
        expect(before.indexOf("Task A")).toBeLessThan(before.indexOf("Task B"));

        // Drag "Task B" onto "Task A" — should insert B before A.
        const source = page.locator(".task-drag-wrapper", { hasText: "Task B" });
        const target = page.locator(".task-drag-wrapper", { hasText: "Task A" });
        await source.dragTo(target);
        await page.waitForTimeout(300);

        const after = await readOrder(page, "commitments");
        expect(after.indexOf("Task B")).toBeLessThan(after.indexOf("Task A"));

        await page.reload({ waitUntil: "networkidle" });
        const afterReload = await readOrder(page, "commitments");
        expect(afterReload.indexOf("Task B")).toBeLessThan(afterReload.indexOf("Task A"));
    });

    test("the bottom drop zone moves a commitment to the last position", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();

        for (const title of ["Task A", "Task B"]) {
            await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
            await fillTitle(page, title);
            await openSection(page, "Window & Deadline");
            await page.getByText("Flexible", { exact: true }).click();
            await page.getByText("ADD TASK", { exact: true }).click();
            await page.waitForTimeout(300);
        }

        const source = page.locator(".task-drag-wrapper", { hasText: "Task A" });
        const dropEnd = page.locator(".drop-zone-end").first();
        await source.dragTo(dropEnd);
        await page.waitForTimeout(300);

        const after = await readOrder(page, "commitments");
        expect(after.indexOf("Task A")).toBeGreaterThan(after.indexOf("Task B"));
    });

    test("reordering in one area does not affect commitments in another area", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        for (const title of ["Fit A", "Fit B"]) {
            await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
            await fillTitle(page, title);
            await openSection(page, "Window & Deadline");
            await page.getByText("Flexible", { exact: true }).click();
            await page.getByText("ADD TASK", { exact: true }).click();
            await page.waitForTimeout(300);
        }

        await createArea(page, "Finance");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Finance", { exact: true }).click();
        for (const title of ["Fin A", "Fin B"]) {
            await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
            await fillTitle(page, title);
            await openSection(page, "Window & Deadline");
            await page.getByText("Flexible", { exact: true }).click();
            await page.getByText("ADD TASK", { exact: true }).click();
            await page.waitForTimeout(300);
        }

        const before = await readOrder(page, "commitments");
        expect(before).toEqual(["Fit A", "Fit B", "Fin A", "Fin B"]);

        // Reorder within Finance only.
        const source = page.locator(".task-drag-wrapper", { hasText: "Fin B" });
        const target = page.locator(".task-drag-wrapper", { hasText: "Fin A" });
        await source.dragTo(target);
        await page.waitForTimeout(300);

        const after = await readOrder(page, "commitments");
        // Fitness's relative order is untouched; only Fin A/Fin B swapped.
        expect(after.indexOf("Fit A")).toBeLessThan(after.indexOf("Fit B"));
        expect(after.indexOf("Fin B")).toBeLessThan(after.indexOf("Fin A"));
    });
});

test.describe("Reordering areas (dashboard)", () => {
    test("dragging one area card onto another reorders them, and it persists after reload", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await createArea(page, "Finance");

        const before = await readOrder(page, "areas");
        expect(before).toEqual(["Fitness", "Finance"]);

        await page.getByText("Areas", { exact: true }).click();
        const source = page.locator(".card-drag-wrapper", { hasText: "Finance" });
        const target = page.locator(".card-drag-wrapper", { hasText: "Fitness" });
        await source.dragTo(target);
        await page.waitForTimeout(300);

        const after = await readOrder(page, "areas");
        expect(after).toEqual(["Finance", "Fitness"]);

        await page.reload({ waitUntil: "networkidle" });
        const afterReload = await readOrder(page, "areas");
        expect(afterReload).toEqual(["Finance", "Fitness"]);
    });

    test("the bottom drop zone moves an area to the last position", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await createArea(page, "Finance");

        await page.getByText("Areas", { exact: true }).click();
        const source = page.locator(".card-drag-wrapper", { hasText: "Fitness" });
        const dropEnd = page.locator(".drop-zone-end").first();
        await source.dragTo(dropEnd);
        await page.waitForTimeout(300);

        const after = await readOrder(page, "areas");
        expect(after).toEqual(["Finance", "Fitness"]);
    });
});
