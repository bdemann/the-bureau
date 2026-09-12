import { expect, test } from "@playwright/test";
import { addTaskLinkedToGoal, createGoal, fillTitle, openMakeCommitment } from "./helpers";

// Mirrors TESTING.md sections: "Filing commitments — type picker",
// "Filing commitments — type switcher (create and edit)",
// "Cross-type conversion (edit mode)", and
// "Goal → other type conversion (dissociation warning)".

test.describe("Type picker and switcher — create mode", () => {
    test("add dialog defaults to TASK kind", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("MAKE NEW TASK", { exact: true })).toBeVisible();
    });

    const cases: {kind: string; title: string; submit: string}[] = [
        {kind: "Routine", title: "MAKE NEW ROUTINE", submit: "COMMIT ROUTINE"},
        {kind: "Task", title: "MAKE NEW TASK", submit: "ADD TASK"},
        {kind: "Goal", title: "NEW GOAL", submit: "SET GOAL"},
        {kind: "Idea", title: "NEW IDEA", submit: "FILE IDEA"},
    ];

    for (const {kind, title, submit} of cases) {
        test(`selecting ${kind} shows correct title and submit label`, async ({ page }) => {
            await page.goto("/");
            await openMakeCommitment(page);
            await page.getByText(kind, { exact: true }).click();
            await expect(page.getByText(title, { exact: true })).toBeVisible();
            await expect(page.getByText(submit, { exact: true })).toBeVisible();
        });
    }

    test("switching type preserves the title already typed", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Clean the garage");
        await page.getByText("Goal", { exact: true }).click();
        await expect(page.getByPlaceholder("Describe the commitment clearly.")).toHaveValue(
            "Clean the garage",
        );
    });

    test("switching to Routine forces recurring on", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        // Routine mode has no "Recurring commitment" checkbox — cadence picker is shown directly.
        await expect(page.getByText("CADENCE", { exact: false })).toBeVisible();
        await expect(page.getByText("Recurring commitment", { exact: false })).toHaveCount(0);
    });

    test("switching Routine -> Task preserves the recurring toggle instead of forcing it off", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await page.getByText("Task", { exact: true }).click();
        // isRecurring stays true, so the checkbox (now visible in Task mode) is checked
        // and the cadence picker remains visible.
        await expect(page.getByText("CADENCE", { exact: false })).toBeVisible();
    });
});

test.describe("Cross-type conversion (edit mode)", () => {
    test("editing a task and switching to Goal converts it in place", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew passport");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await page.getByText("Renew passport", { exact: true }).click();
        await expect(page.getByText("AMEND TASK", { exact: true })).toBeVisible();

        await page.getByText("Goal", { exact: true }).click();
        await page.getByText("SAVE GOAL", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("Renew passport", { exact: true })).toBeVisible();
    });

    test("editing a routine and switching to Idea converts it, no longer a commitment", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Routine", { exact: true }).click();
        await fillTitle(page, "Water the plants");
        await page.getByText("COMMIT ROUTINE", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await page.getByText("Water the plants", { exact: true }).click();
        await page.getByText("Idea", { exact: true }).click();
        await page.getByText("SAVE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("Water the plants", { exact: true })).toBeVisible();
        await page.getByText("Daily", { exact: true }).click();
        await expect(page.getByText("Water the plants", { exact: true })).toHaveCount(0);
    });

    test("editing a goal and switching to Task converts it, appears in commitment lists", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Get promoted");

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Get promoted", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).first().click();
        await page.getByText("Task", { exact: true }).click();
        await fillTitle(page, "Get promoted"); // title field is shared/preserved, re-fill defensively
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await expect(page.getByText("Get promoted", { exact: true })).toBeVisible();
    });

    test("editing an idea and switching to Task converts it", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Ideas", { exact: true }).click();
        await page.getByText("MAKE IDEA", { exact: false }).click();
        await fillTitle(page, "Try a new coffee shop");
        await page.getByText("FILE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Try a new coffee shop", { exact: true }).click();
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await expect(page.getByText("Try a new coffee shop", { exact: true })).toBeVisible();
    });
});

test.describe("Linked goal picker (task/routine edit)", () => {
    function linkedGoalSelect(page: import("@playwright/test").Page) {
        return page.locator(".field", { hasText: "Linked Goal (optional)" }).locator("select");
    }

    test("is visible and pre-selected with the current linked goal", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Save for a trip");
        await addTaskLinkedToGoal(page, "Save for a trip", "Set aside $100");

        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await page.getByText("Set aside $100", { exact: true }).click();

        const select = linkedGoalSelect(page);
        await expect(select).toBeVisible();
        const selectedText = await select.evaluate(
            (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim(),
        );
        expect(selectedText).toBe("Save for a trip");
    });

    test("stays visible (shows only — None —) when no goals exist anywhere", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        const select = linkedGoalSelect(page);
        await expect(select).toBeVisible();
        await expect(select.locator("option")).toHaveCount(1);
    });
});

test.describe("Goal -> other type conversion (dissociation warning)", () => {
    test("switching a goal with linked commitments shows a warning and blocks Save until resolved", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await addTaskLinkedToGoal(page, "Run a marathon", "Long run");

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Run a marathon", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).first().click();

        await page.getByText("Idea", { exact: true }).click();
        await expect(page.getByText("dissociate", { exact: false })).toBeVisible();
        await expect(page.getByText("1 linked", { exact: false })).toBeVisible();
        await expect(page.getByText("SAVE GOAL", { exact: true })).toBeDisabled();
        // Type toggle underneath the warning shouldn't overflow the dialog on mobile.
    });

    test("CANCEL on the warning reverts to the original kind with no changes", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Learn guitar");
        await addTaskLinkedToGoal(page, "Learn guitar", "Practice chords");

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Learn guitar", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).first().click();
        await page.getByText("Idea", { exact: true }).click();
        await page.getByText("CANCEL", { exact: true }).last().click();

        await expect(page.getByText("AMEND GOAL", { exact: true })).toBeVisible();
        await expect(page.getByText("dissociate", { exact: false })).toHaveCount(0);
        await expect(page.getByText("SAVE GOAL", { exact: true })).toBeEnabled();
    });

    test("PROCEED completes the switch and dissociates the linked commitment", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Read more books");
        await addTaskLinkedToGoal(page, "Read more books", "Finish current book");

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Read more books", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).first().click();
        await page.getByText("Idea", { exact: true }).click();
        await page.getByText("PROCEED", { exact: true }).click();

        await expect(page.getByText("AMEND IDEA", { exact: true })).toBeVisible();
        await page.getByText("SAVE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("Read more books", { exact: true })).toBeVisible();
    });

    test("editing a goal with no linked commitments switches type immediately, no warning", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Solo goal");

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Solo goal", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).first().click();
        await page.getByText("Idea", { exact: true }).click();

        await expect(page.getByText("AMEND IDEA", { exact: true })).toBeVisible();
        await expect(page.getByText("dissociate", { exact: false })).toHaveCount(0);
    });
});
