import { expect, test } from "@playwright/test";
import { fillTitle, openMakeCommitment, patchCommitmentByTitle } from "./helpers";

// Mirrors TESTING.md's "Insights" section. missedAt is normally set by
// rolloverIfNeeded when a one-time hard-date task's date has passed — rather
// than simulate real days passing, these tests patch it directly (the same
// technique used in commitment-lifecycle.spec.ts) to check the app wires
// stored state into what Insights renders.

async function openInsights(page: import("@playwright/test").Page) {
    await page.getByTitle("Menu", { exact: true }).click();
    // The menu button's full text includes its description ("Insights
    // Compliance gaps, behavioral patterns, and your record") as a sibling
    // text node, so the smallest exact-matching element isn't just "Insights".
    await page.getByText("Insights", { exact: false }).first().click();
}

test.describe("Insights — navigation and empty states", () => {
    test("hamburger menu navigates to Insights", async ({ page }) => {
        await page.goto("/");
        await openInsights(page);
        await expect(page.getByText("MISSED COMMITMENTS", { exact: true })).toBeVisible();
        await expect(page.getByText("MOST SNOOZED", { exact: true })).toBeVisible();
        await expect(page.getByText("MOST SKIPPED", { exact: true })).toBeVisible();
        await expect(page.getByText("TOP COMPLETIONS", { exact: true })).toBeVisible();
    });

    test("empty states show their reassuring copy", async ({ page }) => {
        await page.goto("/");
        await openInsights(page);
        await expect(page.getByText("No missed commitments on record. Exemplary.", { exact: true })).toBeVisible();
        await expect(page.getByText("No snooze history. Vigilant.", { exact: true })).toBeVisible();
        await expect(page.getByText("No skip history on record.", { exact: true })).toBeVisible();
        await expect(page.getByText("No completions recorded yet.", { exact: true })).toBeVisible();
    });
});

test.describe("Insights — missed commitments", () => {
    test("a missed one-time task shows Revive/Dismiss; Revive restores it", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew passport");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await patchCommitmentByTitle(page, "Renew passport", {
            missedAt: Date.now() - 86_400_000,
            suggestedDate: Date.now() - 86_400_000,
        });

        await openInsights(page);
        await expect(page.getByText("Renew passport", { exact: true })).toBeVisible();
        await expect(page.getByText("Revive", { exact: true })).toBeVisible();
        await expect(page.getByText("Dismiss", { exact: true })).toBeVisible();

        await page.getByText("Revive", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Renew passport", { exact: true })).toHaveCount(0);

        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem("bureau_v1")!;
            return JSON.parse(raw).commitments.find((c: {title: string}) => c.title === "Renew passport");
        });
        expect(stored.missedAt).toBeNull();

        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await expect(page.getByText("Renew passport", { exact: true })).toBeVisible();
    });

    test("Dismiss permanently deletes the commitment", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew passport");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await patchCommitmentByTitle(page, "Renew passport", { missedAt: Date.now() - 86_400_000 });

        await openInsights(page);
        await page.getByText("Dismiss", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Renew passport", { exact: true })).toHaveCount(0);

        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem("bureau_v1")!;
            return JSON.parse(raw).commitments.find((c: {title: string}) => c.title === "Renew passport");
        });
        expect(stored).toBeUndefined();
    });

    test("recurring commitments with missed periods show a miss count only, no Revive/Dismiss", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Water plants");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);
        await patchCommitmentByTitle(page, "Water plants", { totalMisses: 3, missedAt: null });

        await openInsights(page);
        await expect(page.getByText("Water plants", { exact: true })).toBeVisible();
        await expect(page.getByText("Revive", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Dismiss", { exact: true })).toHaveCount(0);
    });
});

test.describe("Insights — activity sections", () => {
    test("skip/snooze/complete counters show up in their respective sections", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Meditate");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);
        await patchCommitmentByTitle(page, "Meditate", {
            totalSnoozes: 2,
            totalSkips: 3,
            totalCompletions: 4,
            maxTaskCompletionStreak: 5,
        });

        await openInsights(page);
        await expect(page.getByText("MOST SNOOZED", { exact: true })).toBeVisible();
        await expect(page.getByText("Meditate", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("BEST STREAKS", { exact: true })).toBeVisible();
    });

    test("BEST STREAKS is absent when no task has a streak above 1", async ({ page }) => {
        await page.goto("/");
        await openInsights(page);
        await expect(page.getByText("BEST STREAKS", { exact: true })).toHaveCount(0);
    });

    test("RESPONSIBILITIES OVERVIEW appears once an area exists", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);

        await openInsights(page);
        await expect(page.getByText("RESPONSIBILITIES OVERVIEW", { exact: true })).toBeVisible();
        await expect(page.getByText("Fitness", { exact: true })).toBeVisible();
    });
});
