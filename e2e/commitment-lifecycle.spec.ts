import { expect, test } from "@playwright/test";
import {
    createArea,
    fillTitle,
    openMakeCommitment,
    patchCommitmentByTitle,
    readScore,
    revealCommitmentInDailyView,
} from "./helpers";

// Mirrors TESTING.md's "Commitment completion", "Snooze", "Un-snooze", and
// "Skip indicator" / "Remediation" sections. Severity-threshold pure logic
// (exact skip-count -> badge-text mapping, remediation grace period, etc.)
// is already covered by scoring.test.ts / remediation.test.ts — these tests
// check that the app actually wires task state into what's rendered.

async function readCommitment(page: import("@playwright/test").Page, title: string) {
    return page.evaluate((title) => {
        const raw = localStorage.getItem("bureau_v1")!;
        const parsed = JSON.parse(raw);
        return parsed.commitments.find((c: {title: string}) => c.title === title);
    }, title);
}

test.describe("Commitment completion", () => {
    test("one-time task: completing hides it and increases the score", async ({ page }) => {
        await page.goto("/");
        const before = await readScore(page);
        await openMakeCommitment(page);
        await fillTitle(page, "Renew license");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await revealCommitmentInDailyView(page, "Renew license");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Renew license", { exact: true })).toHaveCount(0);
        expect(await readScore(page)).toBeGreaterThan(before);
    });

    test("recurring task: completing hides it today (moves to next period)", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Stretch");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);

        await revealCommitmentInDailyView(page, "Stretch");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Stretch", { exact: true })).toHaveCount(0);
        const stored = await readCommitment(page, "Stretch");
        expect(stored.taskCompletionStreak).toBe(1);
    });
});

test.describe("Skip indicator", () => {
    async function addRoutine(page: import("@playwright/test").Page, title: string) {
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, title);
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);
    }

    test("badge text escalates with skipStreak", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Journal");

        await patchCommitmentByTitle(page, "Journal", { skipStreak: 1 });
        await expect(page.getByText("Skipped ×1", { exact: false })).toBeVisible();

        await patchCommitmentByTitle(page, "Journal", { skipStreak: 3 });
        await expect(page.getByText("Skipped ×3 — Pattern noted", { exact: false })).toBeVisible();

        await patchCommitmentByTitle(page, "Journal", { skipStreak: 5 });
        await expect(page.getByText("FLAGGED — Skipped ×5", { exact: false })).toBeVisible();

        await patchCommitmentByTitle(page, "Journal", { skipStreak: 8 });
        await expect(page.getByText("CHRONIC AVOIDANCE ×8", { exact: false })).toBeVisible();
    });

    test("skip badge is also visible in area-detail", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Wellness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Wellness", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Journal");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);

        await patchCommitmentByTitle(page, "Journal", { skipStreak: 2 });
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Wellness", { exact: true }).click();
        await expect(page.getByText("Skipped ×2 — Pattern noted", { exact: false })).toBeVisible();
    });
});

test.describe("Remediation", () => {
    async function addRoutine(page: import("@playwright/test").Page, title: string) {
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, title);
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);
    }

    test("completing under the grace-period skip threshold clears cleanly, no remediation", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Meditate");
        // Grace period is skipStreak < 5 (SKIP_ESCALATION_THRESHOLD) — completing
        // should reset cleanly with no remediation entered.
        await patchCommitmentByTitle(page, "Meditate", { skipStreak: 3 });
        await revealCommitmentInDailyView(page, "Meditate");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        const stored = await readCommitment(page, "Meditate");
        expect(stored.remediationCount).toBe(0);
        expect(stored.skipStreak).toBe(0);
    });

    test("skipStreak at/above the threshold, then completed, enters remediation", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Meditate");
        await patchCommitmentByTitle(page, "Meditate", { skipStreak: 5 });
        await revealCommitmentInDailyView(page, "Meditate");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        const stored = await readCommitment(page, "Meditate");
        expect(stored.remediationCount).toBe(5);
        expect(stored.skipStreak).toBe(5);
    });

    test("remediation badge text escalates with remediationCount", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Meditate");

        await patchCommitmentByTitle(page, "Meditate", { remediationCount: 1 });
        await expect(page.getByText("Recovering — 1 left", { exact: false })).toBeVisible();

        await patchCommitmentByTitle(page, "Meditate", { remediationCount: 3 });
        await expect(page.getByText("Remediation — 3 needed", { exact: false })).toBeVisible();

        await patchCommitmentByTitle(page, "Meditate", { remediationCount: 5 });
        await expect(page.getByText("INTEGRITY AUDIT ×5", { exact: false })).toBeVisible();
    });

    test("relapse mid-remediation: skipping resets remediation and restarts skipStreak at that level", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Meditate");
        await patchCommitmentByTitle(page, "Meditate", { remediationCount: 3, skipStreak: 3 });
        await expect(page.getByText("Remediation — 3 needed", { exact: false })).toBeVisible();

        await page.getByText("Skip", { exact: true }).click();
        await page.waitForTimeout(300);
        // Skipping resolves today's occurrence and hides the card (see the
        // isCompletedForPeriod fix) — read storage rather than expecting the
        // badge on today's now-hidden card.
        const stored = await readCommitment(page, "Meditate");
        expect(stored.remediationCount).toBe(0);
        expect(stored.skipStreak).toBe(4); // starts at the remediation level (3) + 1, not from 1
    });
});

test.describe("Snooze / Un-snooze", () => {
    // A rigid task due today can't be snoozed ("Cannot snooze" instead) — use
    // a Flexible deadline so the Snooze button is actually enabled.
    async function addSnoozableTask(page: import("@playwright/test").Page, title: string) {
        await createArea(page, "Wellness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Wellness", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, title);
        await page.getByText("Flexible", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
    }

    test("snoozing shows a badge, moves the task to the area's SNOOZED section", async ({ page }) => {
        await page.goto("/");
        await addSnoozableTask(page, "Call the dentist");

        await page.getByText("Snooze", { exact: false }).click();
        await page.waitForTimeout(300);
        // The section header text itself ("SNOOZED (1)") case-insensitively
        // collides with the persistent "Snoozed ×N" count badge on the card,
        // so use the unambiguous "Wake up" button as the marker instead.
        await expect(page.getByText("Wake up", { exact: true })).toBeVisible();
        await expect(page.getByText("Call the dentist", { exact: true })).toBeVisible();
    });

    test("Wake up returns it to active; snooze count is retained, not reset", async ({ page }) => {
        await page.goto("/");
        await addSnoozableTask(page, "Call the dentist");
        await page.getByText("Snooze", { exact: false }).click();
        await page.waitForTimeout(300);

        await page.getByText("Wake up", { exact: true }).click();
        await page.waitForTimeout(300);
        // Retained (not reset): the "Snoozed ×1" count badge is expected to
        // remain — only the "Wake up" button should be gone.
        await expect(page.getByText("Wake up", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Snooze (+24h)" })).toBeVisible();

        const stored = await readCommitment(page, "Call the dentist");
        expect(stored.totalSnoozes).toBe(1);
    });

    test("hard-date task due today shows a disabled 'Cannot snooze' button", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Vote in the election");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await revealCommitmentInDailyView(page, "Vote in the election");
        await expect(page.getByText("Cannot snooze", { exact: true })).toBeVisible();
        await expect(page.getByText("Cannot snooze", { exact: true })).toBeDisabled();
    });
});

test.describe("UNDO toast", () => {
    test("skipping shows an UNDO toast that reverses the action", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Stretch");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);

        await revealCommitmentInDailyView(page, "Stretch");
        await page.getByText("Skip", { exact: false }).click();
        await expect(page.getByText("UNDO", { exact: true })).toBeVisible();

        await page.getByText("UNDO", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Stretch", { exact: true })).toBeVisible();
    });
});
