import { expect, test } from "@playwright/test";
import { fillTitle, openMakeCommitment, readScore, revealCommitmentInDailyView } from "./helpers";

// Mirrors TESTING.md's "Preferences — hide score" and "Persistence" sections.

async function openPreferences(page: import("@playwright/test").Page) {
    await page.getByTitle("Menu", { exact: true }).click();
    await page.getByText("Preferences", { exact: false }).first().click();
}

test.describe("Preferences — hide score", () => {
    test("toggling it on hides the score number, and off brings it back", async ({ page }) => {
        await page.goto("/");
        await openPreferences(page);
        await expect(page.getByText("Hide score", { exact: true })).toBeVisible();
        await expect(page.locator(".score-number")).toBeVisible();

        await page.locator(".dark-mode-row", { hasText: "Hide score" }).locator("label.toggle").click();
        await expect(page.locator(".score-number")).toHaveCount(0);

        await page.locator(".dark-mode-row", { hasText: "Hide score" }).locator("label.toggle").click();
        await expect(page.locator(".score-number")).toBeVisible();
    });

    test("score keeps tracking while hidden — toggling back off shows the updated value", async ({ page }) => {
        await page.goto("/");
        const before = await readScore(page);

        await openPreferences(page);
        await page.locator(".dark-mode-row", { hasText: "Hide score" }).locator("label.toggle").click();
        await expect(page.locator(".score-number")).toHaveCount(0);

        await page.getByText("Daily", { exact: true }).click();
        await openMakeCommitment(page);
        await fillTitle(page, "Renew license");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await revealCommitmentInDailyView(page, "Renew license");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        await openPreferences(page);
        await page.locator(".dark-mode-row", { hasText: "Hide score" }).locator("label.toggle").click();
        expect(await readScore(page)).toBeGreaterThan(before);
    });

    test("persists across reload", async ({ page }) => {
        await page.goto("/");
        await openPreferences(page);
        await page.locator(".dark-mode-row", { hasText: "Hide score" }).locator("label.toggle").click();
        await expect(page.locator(".score-number")).toHaveCount(0);

        await page.reload({ waitUntil: "networkidle" });
        await expect(page.locator(".score-number")).toHaveCount(0);

        const stored = await page.evaluate(() => localStorage.getItem("bureau-hide-score"));
        expect(stored).toBe("true");
    });
});

test.describe("Persistence", () => {
    test("state survives a hard reload", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew license");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.reload({ waitUntil: "networkidle" });
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await expect(page.getByText("Renew license", { exact: true })).toBeVisible();
    });

    test("bureau_v1 in localStorage is well-formed JSON with the expected top-level shape", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew license");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        const parsed = await page.evaluate(() => {
            const raw = localStorage.getItem("bureau_v1");
            return raw ? JSON.parse(raw) : null;
        });
        expect(parsed).not.toBeNull();
        expect(Array.isArray(parsed.commitments)).toBe(true);
        expect(parsed.commitments.some((c: {title: string}) => c.title === "Renew license")).toBe(true);
    });
});
