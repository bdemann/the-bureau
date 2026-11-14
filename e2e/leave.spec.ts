import { expect, test, type Page } from "@playwright/test";
import { fillTitle, openMakeCommitment, readScore } from "./helpers";

// Authorized Leave (GitHub #60). Mirrors TESTING.md's "Authorized Leave"
// section. Date-dependent behaviour uses page.clock. Window math, limits and
// the no-penalty rollover rules are unit tested in src/data/leave.test.ts.

const DAY1 = "2026-06-10T09:00:00";

async function addRoutine(page: Page, title: string) {
    await openMakeCommitment(page);
    await page.getByText("Routine", { exact: true }).click();
    await fillTitle(page, title);
    await page.getByText("T1", { exact: true }).click();
    await page.getByText("COMMIT ROUTINE", { exact: true }).click();
    await page.waitForTimeout(300);
}

async function openLeaveDialog(page: Page) {
    await page.getByTitle("Menu", { exact: true }).click();
    await page.getByTestId("menu-leave").click();
    await expect(page.getByRole("dialog")).toBeVisible();
}

async function startLeave(page: Page, days: number) {
    await openLeaveDialog(page);
    await page.locator(`.preset[data-days="${days}"]`).click();
}

const mandatoryBand = (page: Page) => page.locator(".band-header", { hasText: "TODAY'S MANDATORY" });

test.describe("Authorized Leave", () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: new Date(DAY1) });
        await page.goto("/");
    });

    test("the dialog shows the presets, their return dates and the remaining allowance", async ({ page }) => {
        await openLeaveDialog(page);
        await expect(page.locator('.preset[data-days="3"]')).toContainText("Report back Jun 13");
        await expect(page.locator('.preset[data-days="7"]')).toContainText("Report back Jun 17");
        await expect(page.getByText("14 of 14 days of leave remain in any 90-day period")).toBeVisible();
    });

    test("starting a 3-day leave shows the strip and hides the cards; reload keeps it; End now brings them back", async ({ page }) => {
        await addRoutine(page, "Take medication");
        await expect(mandatoryBand(page).locator(".band-count")).toHaveText("1");

        await startLeave(page, 3);
        const strip = page.getByTestId("leave-strip");
        await expect(strip).toContainText("Authorized Leave until Jun 12");
        await expect(page.getByTestId("leave-daily-notice")).toBeVisible();
        await expect(mandatoryBand(page)).toHaveCount(0);

        await page.reload({ waitUntil: "networkidle" });
        await expect(page.getByTestId("leave-strip")).toContainText("Authorized Leave until Jun 12");
        await expect(mandatoryBand(page)).toHaveCount(0);

        await page.getByTestId("leave-end-now").click();
        await expect(page.getByTestId("leave-strip")).toHaveCount(0);
        await expect(mandatoryBand(page).locator(".band-count")).toHaveText("1");
    });

    test("leave ends by itself after the return date, with the score unchanged", async ({ page }) => {
        await addRoutine(page, "Take medication");
        const before = await readScore(page);
        await startLeave(page, 3);
        await expect(page.getByTestId("leave-strip")).toBeVisible();

        // Last leave day: still on leave.
        await page.clock.setSystemTime(new Date("2026-06-12T20:00:00"));
        await page.reload({ waitUntil: "networkidle" });
        await expect(page.getByTestId("leave-strip")).toBeVisible();
        expect(await readScore(page)).toBe(before);

        // Return day: leave is over, cards are back, nothing was charged.
        await page.clock.setSystemTime(new Date("2026-06-13T09:00:00"));
        await page.reload({ waitUntil: "networkidle" });
        await expect(page.getByTestId("leave-strip")).toHaveCount(0);
        await expect(mandatoryBand(page).locator(".band-count")).toHaveText("1");
        expect(await readScore(page)).toBe(before);
    });

    test("the individual pause fields of a commitment are untouched by leave", async ({ page }) => {
        await addRoutine(page, "Take medication");
        await startLeave(page, 3);
        const fields = await page.evaluate(() => {
            const parsed = JSON.parse(localStorage.getItem("bureau_v1")!);
            const t = parsed.commitments.find((c: { title: string }) => c.title === "Take medication");
            return { pausedUntil: t.pausedUntil, pausedIndefinitely: t.pausedIndefinitely, leaveUntil: parsed.leaveUntil };
        });
        expect(fields).toEqual({ pausedUntil: null, pausedIndefinitely: false, leaveUntil: "2026-06-12" });
    });

    test("allowance exhausted: presets are disabled and say so", async ({ page }) => {
        await startLeave(page, 7);
        await page.getByTestId("leave-end-now").waitFor();
        // Move past the first leave and take a second 7-day leave: 14 days used.
        await page.clock.setSystemTime(new Date("2026-06-18T09:00:00"));
        await page.reload({ waitUntil: "networkidle" });
        await startLeave(page, 7);
        await expect(page.getByTestId("leave-strip")).toBeVisible();

        await page.clock.setSystemTime(new Date("2026-06-26T09:00:00"));
        await page.reload({ waitUntil: "networkidle" });
        await openLeaveDialog(page);
        await expect(page.locator('.preset[data-days="3"]')).toBeDisabled();
        await expect(page.locator('.preset[data-days="7"]')).toBeDisabled();
        await expect(page.locator('.preset[data-days="3"]')).toContainText("No leave remains");
        await expect(page.getByText("0 of 14 days of leave remain in any 90-day period")).toBeVisible();
    });

    test("ending early only counts the days taken", async ({ page }) => {
        await startLeave(page, 7);
        await page.clock.setSystemTime(new Date("2026-06-12T09:00:00"));
        await page.reload({ waitUntil: "networkidle" });
        await page.getByTestId("leave-end-now").click();
        // Jun 10 and Jun 11 were taken: 12 of 14 remain.
        await openLeaveDialog(page);
        await expect(page.getByText("12 of 14 days of leave remain in any 90-day period")).toBeVisible();
    });

    test("the back button closes the dialog", async ({ page }) => {
        await openLeaveDialog(page);
        await page.goBack();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByText("Bureau Menu", { exact: true })).toHaveCount(0);
    });
});
