import { expect, test, type Page } from "@playwright/test";

// Menu → About: the shared @bdemann/app-kit About page, plus back-button
// behavior (src/modal-history-guard.ts). The service-worker "new version
// ready" flow needs two real deploys — see TESTING.md.

async function openAbout(page: Page) {
    await page.getByTitle("Menu", { exact: true }).click();
    await page.getByText("About", { exact: true }).click();
}

test.describe("About page", () => {
    test("Menu → About shows the page with version and commit", async ({ page }) => {
        await page.goto("/");
        await openAbout(page);

        await expect(page.getByText("Bureau Menu", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "About BCR Clear" })).toBeVisible();
        await expect(page.getByText("Version", { exact: true })).toBeVisible();
        await expect(page.getByText("0.1.0", { exact: true })).toBeVisible();
        await expect(page.getByText("Commit", { exact: true })).toBeVisible();
        // Dev builds have no commit, so it reads "dev".
        await expect(page.getByTestId("commit")).toHaveText("dev");
        await expect(page.getByText("Built", { exact: true })).toBeVisible();
        await expect(page.getByText("App updates", { exact: true })).toBeVisible();
    });

    test("the browser back button returns to the previous view", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();

        await openAbout(page);
        await expect(page.getByRole("heading", { name: "About BCR Clear" })).toBeVisible();

        await page.goBack();
        await expect(page.getByRole("heading", { name: "About BCR Clear" })).toHaveCount(0);
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();
    });

    test("leaving About through the bottom nav pops its history entry", async ({ page }) => {
        await page.goto("/");
        const stateBefore = await page.evaluate(() => history.state);

        await openAbout(page);
        expect(await page.evaluate(() => history.state)).toEqual({ modalGuard: true });

        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("MAKE IDEA", { exact: false }).first()).toBeVisible();
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => history.state)).toEqual(stateBefore);
    });

    test("the menu entries are plain 'About' and 'Feedback', not skin-voiced", async ({ page }) => {
        await page.goto("/");
        await page.getByTitle("Menu", { exact: true }).click();
        await expect(page.getByText("About", { exact: true })).toBeVisible();
        await expect(page.getByText("Version & updates", { exact: true })).toBeVisible();
        await expect(page.getByText("Feedback", { exact: true })).toBeVisible();
    });
});
