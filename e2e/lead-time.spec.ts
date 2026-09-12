import { expect, test } from "@playwright/test";
import { fillTitle, openCommitmentFromDailyView, openMakeCommitment } from "./helpers";

// Mirrors TESTING.md's "Radar lead days (per-commitment)" section. The
// feature evolved from a plain "Radar lead (days)" number field into a
// Default/None/Custom picker (see the correction added to the doc) — this
// spec tests the current UI, not the field described there originally.

test.describe("Lead Time field", () => {
    test("defaults to 'Default' with rigid-task help text; hidden for daily cadence", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("Lead Time", { exact: true })).toBeVisible();
        await expect(page.getByText("Appears in radar 3 days before due date (default).", { exact: true })).toBeVisible();

        await page.getByText("Recurring commitment", { exact: false }).click();
        // Default recurring cadence is Daily — Lead Time (and Milestone, Deadline
        // Type) are all hidden for daily-like cadences.
        await expect(page.getByText("Lead Time", { exact: true })).toHaveCount(0);
    });

    test("shows a 30-day default help text for milestones instead of 3", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Milestone (track progress", { exact: false }).click();
        await expect(page.getByText("Appears in radar 30 days before deadline (default).", { exact: true })).toBeVisible();
    });

    test("flexible deadline shows window-based help text instead of a fixed day count", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Flexible", { exact: true }).click();
        await expect(page.getByText("Visibility scales with window % remaining (default).", { exact: true })).toBeVisible();
    });

    test("'None' and 'Custom' show their own help text; Custom reveals a days-before-due input", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("None", { exact: true }).click();
        await expect(page.getByText("Hidden until due — only appears the day it's needed.", { exact: true })).toBeVisible();

        await page.getByText("Custom", { exact: true }).click();
        await expect(page.getByText("Days before due", { exact: true })).toBeVisible();
        await expect(page.getByText("Shows up 3 days before due.", { exact: true })).toBeVisible();

        const input = page.locator(".field", { hasText: "Days before due" }).getByRole("spinbutton");
        await input.fill("10");
        await expect(page.getByText("Shows up 10 days before due.", { exact: true })).toBeVisible();
    });

    test("singular day-count wording for a custom value of 1", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Custom", { exact: true }).click();
        const input = page.locator(".field", { hasText: "Days before due" }).getByRole("spinbutton");
        await input.fill("1");
        await expect(page.getByText("Shows up 1 day before due.", { exact: true })).toBeVisible();
    });

    test("edit dialog re-opens with the custom lead time pre-filled", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Submit expense report");
        await page.getByText("Custom", { exact: true }).click();
        const input = page.locator(".field", { hasText: "Days before due" }).getByRole("spinbutton");
        await input.fill("14");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Submit expense report");
        await expect(page.getByText("Custom", { exact: true })).toBeVisible();
        await expect(page.getByText("Shows up 14 days before due.", { exact: true })).toBeVisible();
    });
});
