import { expect, test, type Page } from "@playwright/test";

// Menu → Feedback: the shared @bdemann/app-kit Feedback page posting to
// /api/feedback (mocked here; the real function needs a GitHub token, see
// TESTING.md). Back-button behavior is shared with About (modal-history-guard).

async function openFromMenu(page: Page, label: string) {
    await page.getByTitle("Menu", { exact: true }).click();
    await page.getByText(label, { exact: true }).click();
}
const openFeedback = (page: Page) => openFromMenu(page, "Feedback");
const openAbout = (page: Page) => openFromMenu(page, "About");

const feedbackHeading = (page: Page) => page.getByRole("heading", { name: "Send feedback" });
const aboutHeading = (page: Page) => page.getByRole("heading", { name: "About BCR Clear" });

test.describe("Feedback page", () => {
    test("Menu → Feedback shows the page", async ({ page }) => {
        await page.goto("/");
        await page.getByTitle("Menu", { exact: true }).click();
        await expect(
            page.getByText("Report a problem or suggest an idea", { exact: true }),
        ).toBeVisible();
        await page.getByText("Feedback", { exact: true }).click();

        await expect(page.getByText("Bureau Menu", { exact: true })).toHaveCount(0);
        await expect(feedbackHeading(page)).toBeVisible();
        await expect(page.getByLabel("Your message")).toBeVisible();
        await expect(page.getByLabel("Name (optional)")).toBeVisible();
    });

    test("sending shows success and posts the draft with diagnostics (counts only)", async ({
        page,
    }) => {
        let body: Record<string, unknown> | undefined;
        await page.route("**/api/feedback", async (route) => {
            body = route.request().postDataJSON();
            await route.fulfill({ status: 200, json: { ok: true } });
        });
        await page.goto("/");
        await openFeedback(page);

        await page.getByLabel("Problem").check();
        await page.getByLabel("Your message").fill("The button is too small");
        await page.getByRole("button", { name: "Send", exact: true }).click();

        await expect(page.getByText("Thank you. Your feedback has been sent.")).toBeVisible();
        expect(body?.["kind"]).toBe("problem");
        expect(body?.["message"]).toBe("The button is too small");
        const info = String(body?.["diagnosticsInfo"]);
        expect(info).toContain("App version:");
        expect(info).toContain("Skin: bcr");
        expect(info).toContain("Areas:");
        expect(info).toContain("Commitments (task):");
        expect(info).toContain("User agent:");
    });

    test("a 502 shows the error and keeps the message for a retry", async ({ page }) => {
        await page.route("**/api/feedback", (route) =>
            route.fulfill({ status: 502, json: { ok: false, error: "GitHub said no." } }),
        );
        await page.goto("/");
        await openFeedback(page);

        await page.getByLabel("Your message").fill("Please keep this");
        await page.getByRole("button", { name: "Send", exact: true }).click();

        await expect(page.getByRole("alert")).toContainText("GitHub said no.");
        await expect(page.getByLabel("Your message")).toHaveValue("Please keep this");
        await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    });

    test("a network failure shows a friendly message", async ({ page }) => {
        await page.route("**/api/feedback", (route) => route.abort());
        await page.goto("/");
        await openFeedback(page);

        await page.getByLabel("Your message").fill("Offline note");
        await page.getByRole("button", { name: "Send", exact: true }).click();

        await expect(page.getByRole("alert")).toContainText("Could not reach the server");
    });

    test("an invalid email blocks sending", async ({ page }) => {
        let requests = 0;
        await page.route("**/api/feedback", async (route) => {
            requests += 1;
            await route.fulfill({ status: 200, json: { ok: true } });
        });
        await page.goto("/");
        await openFeedback(page);

        await page.getByLabel("Your message").fill("Hello");
        await page.getByLabel("Email (optional, if you'd like a reply)").fill("not-an-email");
        await page.getByRole("button", { name: "Send", exact: true }).click();

        await expect(page.getByRole("alert")).toBeVisible();
        await page.waitForTimeout(200);
        expect(requests).toBe(0);
    });

    test("an unsent draft survives a reload", async ({ page }) => {
        await page.goto("/");
        await openFeedback(page);
        await page.getByLabel("Your message").fill("Half-written thought");

        await page.reload();
        // The view is restored from saved state; open it again if it is not.
        if (!(await feedbackHeading(page).isVisible())) await openFeedback(page);
        await expect(page.getByLabel("Your message")).toHaveValue("Half-written thought");
    });
});

test.describe("Feedback and About back-button behavior", () => {
    test("back from Feedback returns to the view it was opened from", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();

        await openFeedback(page);
        await expect(feedbackHeading(page)).toBeVisible();

        await page.goBack();
        await expect(feedbackHeading(page)).toHaveCount(0);
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();
    });

    test("switching About → Feedback → About from the menu, then back, returns to the origin", async ({
        page,
    }) => {
        await page.goto("/");
        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();
        const stateBefore = await page.evaluate(() => history.state);

        await openAbout(page);
        await expect(aboutHeading(page)).toBeVisible();
        await openFeedback(page);
        await expect(feedbackHeading(page)).toBeVisible();
        await expect(aboutHeading(page)).toHaveCount(0);
        await openAbout(page);
        await expect(aboutHeading(page)).toBeVisible();

        // Still exactly one guard entry, and one Back leaves both pages.
        await page.goBack();
        await expect(aboutHeading(page)).toHaveCount(0);
        await expect(feedbackHeading(page)).toHaveCount(0);
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();
        expect(await page.evaluate(() => history.state)).toEqual(stateBefore);
    });

    test("leaving Feedback through the bottom nav pops its history entry", async ({ page }) => {
        await page.goto("/");
        const stateBefore = await page.evaluate(() => history.state);

        await openFeedback(page);
        expect(await page.evaluate(() => history.state)).toEqual({ modalGuard: true });

        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("MAKE IDEA", { exact: false }).first()).toBeVisible();
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => history.state)).toEqual(stateBefore);
    });
});
