import { expect, test } from "@playwright/test";
import { fillTitle, openMakeCommitment, revealCommitmentInDailyView } from "./helpers";

// Covers TESTING.md's "Bug regressions" items not already exercised as a
// side effect of another spec (most of them are — see the note in
// TESTING.md's "Bug regressions" section for where each one now lives).

test("skip fires no completion/streak dialogue (only the initial day-start quote shows)", async ({ page }) => {
    await page.goto("/");
    await openMakeCommitment(page);
    await page.getByText("Routine", { exact: true }).click();
    await fillTitle(page, "Stretch");
    await page.getByText("COMMIT ROUTINE", { exact: true }).click();
    await page.waitForTimeout(300);

    const dialogueBefore = await page.locator(".memo-body").first().textContent().catch(() => null);

    await revealCommitmentInDailyView(page, "Stretch");
    await page.getByText("Skip", { exact: false }).click();
    await page.waitForTimeout(400);

    const dialogueAfter = await page.locator(".memo-body").first().textContent().catch(() => null);
    expect(dialogueAfter).toBe(dialogueBefore);
});

test("Patriot score header shows the streak even when it's 0", async ({ page }) => {
    // A fresh session actually starts at streak=1 ("1d"), not 0 — patch it
    // directly to reach the specific streak=0 rendering rule.
    await page.goto("/");
    await page.evaluate(() => {
        const raw = localStorage.getItem("bureau_v1")!;
        const parsed = JSON.parse(raw);
        parsed.completionStreak = 0;
        localStorage.setItem("bureau_v1", JSON.stringify(parsed));
    });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("0d ·", { exact: false })).toBeVisible();
    await expect(page.getByText("Suspected Communist", { exact: false })).toBeVisible();
});
