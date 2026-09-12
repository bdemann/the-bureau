import { expect, test } from "@playwright/test";
import { createArea, fillTitle, revealCommitmentInDailyView } from "./helpers";

// Mirrors TESTING.md's "Areas of Responsibility view (area list)", "Area of
// Responsibility creation wizard" (the parts not already covered by
// dialog-overflow.spec.ts / cadence-picker.spec.ts's wizard step tests),
// and "Area-detail" sections.

/** Clicks the wizard's backdrop directly by element rather than blind screen
 * coordinates — the tall step-1 form can leave little or no visible backdrop
 * area on a 390x844 viewport, and its own click handler only checks
 * e.target === e.currentTarget, so a direct dispatch is both more robust and
 * exercises exactly what the component checks. */
async function clickWizardBackdrop(page: import("@playwright/test").Page) {
    await page.locator(".overlay").first().dispatchEvent("click");
}

test.describe("Areas list", () => {
    test("empty state, wizard cancel with no data, and a created area appears", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await expect(page.getByText("NO AREAS OF RESPONSIBILITY", { exact: false })).toBeVisible();

        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByText("Cancel", { exact: true }).click();
        await expect(page.getByText("NO AREAS OF RESPONSIBILITY", { exact: false })).toBeVisible();

        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await expect(page.getByText("Fitness", { exact: true })).toBeVisible();
    });

    test("wizard cancel with data entered shows DISCARD CHANGES; Keep editing preserves it", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");

        await clickWizardBackdrop(page);
        await expect(page.getByText("DISCARD CHANGES?", { exact: true })).toBeVisible();
        await page.waitForTimeout(300);

        await page.getByText("Keep editing", { exact: true }).click();
        await expect(page.getByPlaceholder("Amateur Baker", { exact: false })).toHaveValue("Fitness");
    });

    test("Discard closes the wizard and clears its state", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await clickWizardBackdrop(page);
        await expect(page.getByText("DISCARD CHANGES?", { exact: true })).toBeVisible();
        await page.waitForTimeout(300);
        await page.getByText("Discard", { exact: true }).click();
        await expect(page.getByText("NO AREAS OF RESPONSIBILITY", { exact: false })).toBeVisible();
    });

    test("CLEARED flag: shown when all tasks (not routines) are done, never for routine-only areas", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Routine only");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Routine only", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Daily stretch");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);
        await revealCommitmentInDailyView(page, "Daily stretch");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        // Note: the per-card "N CLEARED" stat always renders (it's just the
        // completed-count), so assert on the "✓ CLEARED" all-clear flag
        // specifically, not the word "CLEARED" alone.
        await page.getByText("Areas", { exact: true }).click();
        await expect(page.getByText("✓ CLEARED", { exact: true })).toHaveCount(0);

        await createArea(page, "Task area");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Task area", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "One-off task");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await revealCommitmentInDailyView(page, "One-off task");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        await page.getByText("Areas", { exact: true }).click();
        await expect(page.getByText("✓ CLEARED", { exact: true })).toBeVisible();
    });
});

test.describe("Area-detail", () => {
    test("header, back button, and empty state", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();

        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();
        await expect(page.getByText("No active commitments in this area.", { exact: true })).toBeVisible();

        await page.getByText("BACK", { exact: false }).click();
        await expect(page.getByText("NEW AREA OF RESPONSIBILITY")).toBeVisible();
    });

    test("cleared-tasks toggle shows/hides completed commitments", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "One-off task");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await revealCommitmentInDailyView(page, "One-off task");
        await page.locator("button", { hasText: "✓" }).first().click();
        await page.waitForTimeout(300);

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await expect(page.getByText("One-off task", { exact: true })).toHaveCount(0);
        await page.getByText("Show", { exact: false }).click();
        await expect(page.getByText("One-off task", { exact: true })).toBeVisible();
        await page.getByText("Hide", { exact: false }).click();
        await expect(page.getByText("One-off task", { exact: true })).toHaveCount(0);
    });

    test("EDIT AREA: pre-filled form, saving persists changes, cancel discards", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();

        const nameInput = page.locator(".edit-input").first();
        await page.getByText("EDIT AREA", { exact: true }).click();
        await expect(nameInput).toHaveValue("Fitness");

        await nameInput.fill("Wellness");
        await page.getByText("CANCEL", { exact: true }).click();
        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();

        await page.getByText("EDIT AREA", { exact: true }).click();
        await nameInput.fill("Wellness");
        await page.getByText("SAVE CHANGES", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Wellness", { exact: false }).first()).toBeVisible();
    });

    test("SAVE CHANGES does nothing while the name is blank", async ({ page }) => {
        // Not an actual disabled attribute — the click handler itself no-ops
        // when the trimmed name is empty (`if (!trimmed) return;`).
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("EDIT AREA", { exact: true }).click();
        await page.locator(".edit-input").first().fill("");
        await page.getByText("SAVE CHANGES", { exact: true }).click();
        await page.waitForTimeout(200);

        // Still in the edit form (didn't save/close) and the area is unchanged.
        await expect(page.locator(".edit-input").first()).toBeVisible();
        await page.getByText("CANCEL", { exact: true }).click();
        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();
    });

    test("DELETE AREA: confirmation, cancel keeps it, confirming removes it and its commitments", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE NEW COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "One-off task");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("DELETE AREA", { exact: true }).click();
        await expect(page.getByText("PERMANENTLY DELETE THIS AREA AND ALL ITS COMMITMENTS?", { exact: false })).toBeVisible();
        await page.getByText("CANCEL", { exact: true }).click();
        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();

        await page.getByText("DELETE AREA", { exact: true }).click();
        await page.getByText("DELETE", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("NO AREAS OF RESPONSIBILITY", { exact: false })).toBeVisible();

        await page.getByText("Daily", { exact: true }).click();
        await expect(page.getByText("One-off task", { exact: true })).toHaveCount(0);
    });
});

test.describe("Area creation wizard — steps 2 and 3 (multi-routine flow)", () => {
    // Step-3's cadence/tier/time-of-day pickers reuse the same <cadence-picker>
    // element already thoroughly covered by cadence-picker.spec.ts against the
    // main commitment dialog — not re-tested per cadence here. This covers what's
    // unique to the wizard: brainstorm parsing and the per-routine Next/Finish loop.
    test("brainstorm parsing creates one routine per line, configured one at a time", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Continue", { exact: false }).click();

        await page.locator("textarea").fill("Go for a run\nStretch");
        await expect(page.getByText("Go for a run", { exact: false })).toBeVisible();
        await expect(page.getByText("Configure 2", { exact: false })).toBeVisible();
        await page.getByText("Configure 2", { exact: false }).click();

        // Step 3, first routine: name pre-filled, advance without changing anything.
        await expect(page.locator('input[type="text"]').last()).toHaveValue("Go for a run");
        await page.getByText("Next Commitment", { exact: false }).click();

        // Second (last) routine: Finish button reads "Create Area ✓".
        await expect(page.locator('input[type="text"]').last()).toHaveValue("Stretch");
        await page.getByText("Create Area", { exact: false }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();
        await page.getByText("Fitness", { exact: true }).click();
        await expect(page.getByText("Go for a run", { exact: true })).toBeVisible();
        await expect(page.getByText("Stretch", { exact: true })).toBeVisible();
        await expect(page.getByText("ROUTINE", { exact: false }).first()).toBeVisible();
    });

    test("Create without commitments (step 2) creates the area with none", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Continue", { exact: false }).click();
        await page.getByText("Create without commitments", { exact: false }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Fitness", { exact: false }).first()).toBeVisible();
        await page.getByText("Fitness", { exact: true }).click();
        await expect(page.getByText("No active commitments in this area.", { exact: true })).toBeVisible();
    });
});
