import { expect, test } from "@playwright/test";
import { fillTitle, openCommitmentFromDailyView, openMakeCommitment } from "./helpers";

// Mirrors TESTING.md's "Filing commitments from the daily view", "Area of
// Responsibility assignment on commitments", "Commitment termination", and
// "Pausing commitments" sections — all fields that live inside the same
// add/edit commitment dialog that's the target of the upcoming redesign.

test.describe("Area of Responsibility assignment", () => {
    test("defaults to 'No area' when filed from the daily view", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        const areaSelect = page.locator(".field", { hasText: "Area of Responsibility" }).locator("select");
        await expect(areaSelect).toHaveValue("");
    });

    test("submitting with 'No area' creates a commitment with no area tag", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Untagged task");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await openCommitmentFromDailyView(page, "Untagged task");
        await expect(page.getByText("AMEND TASK", { exact: true })).toBeVisible();
    });

    test("area dropdown lists all areas; selecting one assigns the commitment there", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(300);

        await page.getByText("Daily", { exact: true }).click();
        await openMakeCommitment(page);
        await fillTitle(page, "Go for a run");
        const areaSelect = page.locator(".field", { hasText: "Area of Responsibility" }).locator("select");
        await areaSelect.selectOption({ label: "Fitness" });
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await expect(page.getByText("Go for a run", { exact: true })).toBeVisible();
    });

    test("editing an existing commitment pre-selects its current area; changing it moves the commitment", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Finance");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);

        await page.getByText("Daily", { exact: true }).click();
        await openMakeCommitment(page);
        await fillTitle(page, "Go for a run");
        await page.locator(".field", { hasText: "Area of Responsibility" }).locator("select").selectOption({ label: "Fitness" });
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Go for a run");
        const areaSelect = page.locator(".field", { hasText: "Area of Responsibility" }).locator("select");
        await expect(areaSelect).toHaveValue(
            (await areaSelect.locator("option", { hasText: "Fitness" }).getAttribute("value")) ?? "",
        );

        await areaSelect.selectOption({ label: "Finance" });
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Finance", { exact: true }).click();
        await expect(page.getByText("Go for a run", { exact: true })).toBeVisible();
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await expect(page.getByText("Go for a run", { exact: true })).toHaveCount(0);
    });
});

test.describe("Commitment termination", () => {
    test("TERMINATE COMMITMENT is absent when creating, present when editing", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("TERMINATE COMMITMENT", { exact: true })).toHaveCount(0);
        await fillTitle(page, "Renew car registration");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Renew car registration");
        await expect(page.getByText("TERMINATE COMMITMENT", { exact: true })).toBeVisible();
    });

    test("clicking it shows a confirmation; CANCEL backs out without deleting", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew car registration");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Renew car registration");
        await page.getByText("TERMINATE COMMITMENT", { exact: true }).click();
        await expect(page.getByText("PERMANENTLY TERMINATE THIS COMMITMENT?", { exact: true })).toBeVisible();

        await page.getByText("CANCEL", { exact: true }).last().click();
        await expect(page.getByText("PERMANENTLY TERMINATE THIS COMMITMENT?", { exact: true })).toHaveCount(0);
        await page.getByText("Cancel", { exact: true }).click();

        await openCommitmentFromDailyView(page, "Renew car registration");
        await expect(page.getByText("AMEND TASK", { exact: true })).toBeVisible();
    });

    test("confirming TERMINATE removes the commitment for good", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew car registration");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Renew car registration");
        await page.getByText("TERMINATE COMMITMENT", { exact: true }).click();
        await page.getByText("TERMINATE", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Renew car registration", { exact: true })).toHaveCount(0);
    });
});

test.describe("Pausing commitments", () => {
    // Pause Commitment only renders for recurring commitments in edit mode
    // (nested inside `state.isRecurring` in add-task-dialog.element.ts) — a
    // one-time task has no Pause row at all. Not documented in the old
    // checklist; every test below creates a recurring task accordingly.
    async function addRecurringTask(page: import("@playwright/test").Page, title: string) {
        await openMakeCommitment(page);
        await fillTitle(page, title);
        await page.getByText("Recurring commitment", { exact: false }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
    }

    test("Pause Commitment row is absent in add mode, present in edit mode (recurring only)", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("Pause Commitment", { exact: true })).toHaveCount(0);
        await fillTitle(page, "Water the ferns");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await openCommitmentFromDailyView(page, "Water the ferns");
        // One-time task, even in edit mode: no Pause row.
        await expect(page.getByText("Pause Commitment", { exact: true })).toHaveCount(0);

        await page.goto("/");
        await addRecurringTask(page, "Take vitamins");
        await openCommitmentFromDailyView(page, "Take vitamins");
        await expect(page.getByText("Pause Commitment", { exact: true })).toBeVisible();
        await expect(page.getByText("No", { exact: true })).toBeVisible();
        await expect(page.getByText("Indefinitely", { exact: true })).toBeVisible();
        await expect(page.getByText("Until date", { exact: true })).toBeVisible();
        await expect(page.getByText("For N days", { exact: true })).toBeVisible();
    });

    test("Indefinitely hides the commitment from the daily view with no score impact", async ({ page }) => {
        await page.goto("/");
        await addRecurringTask(page, "Take vitamins");
        const scoreBefore = await page.getByText("100", { exact: true }).first().textContent();

        await openCommitmentFromDailyView(page, "Take vitamins");
        await page.getByText("Indefinitely", { exact: true }).click();
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Take vitamins", { exact: true })).toHaveCount(0);
        const scoreAfter = await page.getByText("100", { exact: true }).first().textContent();
        expect(scoreAfter).toBe(scoreBefore);
    });

    test("Until date reveals a date field and hides the commitment", async ({ page }) => {
        await page.goto("/");
        await addRecurringTask(page, "Take vitamins");

        await openCommitmentFromDailyView(page, "Take vitamins");
        await page.getByText("Until date", { exact: true }).click();
        await expect(page.getByText("Pause Until", { exact: true })).toBeVisible();
        await page.locator(".field", { hasText: "Pause Until" }).locator('input[type="date"]').fill("2027-01-01");
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Take vitamins", { exact: true })).toHaveCount(0);
    });

    test("For N days pause hides the commitment for that many days", async ({ page }) => {
        await page.goto("/");
        await addRecurringTask(page, "Take vitamins");

        await openCommitmentFromDailyView(page, "Take vitamins");
        await page.getByText("For N days", { exact: true }).click();
        await expect(page.getByText("Pause For (days)", { exact: true })).toBeVisible();
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Take vitamins", { exact: true })).toHaveCount(0);
    });

    test("paused commitment appears in the area's PAUSED section", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Home");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Home", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "Take vitamins");
        await page.getByText("Recurring commitment", { exact: false }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Take vitamins", { exact: true }).click();
        await page.getByText("Indefinitely", { exact: true }).click();
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("PAUSED", { exact: false })).toBeVisible();
        await expect(page.getByText("Take vitamins", { exact: true })).toBeVisible();
    });
});
