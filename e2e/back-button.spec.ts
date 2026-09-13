import { expect, test } from "@playwright/test";
import { fillTitle, openMakeCommitment } from "./helpers";

// Opening the add/edit commitment dialog pushes a throwaway history entry
// (src/modal-history-guard.ts) so the back button closes the dialog instead
// of leaving the app entirely. Any other close path (Cancel, backdrop,
// submit, delete) must pop that same entry so a later back press doesn't
// require an extra "wasted" press to get past it.

test("the back button closes the add/edit dialog instead of leaving the app", async ({ page }) => {
    await page.goto("/");
    await openMakeCommitment(page);
    await fillTitle(page, "Something");
    await expect(page.getByPlaceholder("Describe the commitment clearly.")).toBeVisible();

    await page.goBack();
    await page.waitForTimeout(200);

    await expect(page.getByPlaceholder("Describe the commitment clearly.")).toHaveCount(0);
    await expect(page.getByText("Daily", { exact: true })).toBeVisible();
});

test("opening the dialog pushes exactly one history entry, and Cancel pops it", async ({ page }) => {
    await page.goto("/");
    const stateBefore = await page.evaluate(() => history.state);

    await openMakeCommitment(page);
    const stateWhileOpen = await page.evaluate(() => history.state);
    expect(stateWhileOpen).toEqual({ modalGuard: true });

    await page.getByText("Cancel", { exact: true }).click();
    await page.waitForTimeout(200);
    const stateAfterCancel = await page.evaluate(() => history.state);
    expect(stateAfterCancel).toEqual(stateBefore);
});

test("submitting the form also pops the pushed history entry", async ({ page }) => {
    await page.goto("/");
    const stateBefore = await page.evaluate(() => history.state);

    await openMakeCommitment(page);
    await fillTitle(page, "Renew passport");
    await page.getByText("ADD TASK", { exact: true }).click();
    await page.waitForTimeout(300);

    const stateAfterSubmit = await page.evaluate(() => history.state);
    expect(stateAfterSubmit).toEqual(stateBefore);
});
