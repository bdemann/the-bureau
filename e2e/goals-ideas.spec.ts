import { expect, test } from "@playwright/test";
import { createArea, createGoal, fillTitle } from "./helpers";

// Mirrors TESTING.md's "Goals" and "Ideas" sections. Commitment-dialog field
// wiring for Goal/Idea kind (title, target date, linked goal, area select)
// is already covered by type-switcher.spec.ts / cadence-picker.spec.ts —
// these tests cover the goals/ideas-view-specific behavior: status
// transitions, per-area filtering, linking, and deletion.

test.describe("Goals — global view", () => {
    test("empty state, then a created goal appears under ACTIVE", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("No objectives on file. Make one above to begin.", { exact: true })).toBeVisible();

        await createGoal(page, "Run a marathon");
        await expect(page.getByText("ACTIVE", { exact: false })).toBeVisible();
    });

    test("MARK ACHIEVED / ABANDON / REACTIVATE move a goal between sections", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");

        await page.getByText("MARK ACHIEVED", { exact: true }).click();
        await page.waitForTimeout(200);
        await expect(page.getByText("ACHIEVED", { exact: false }).first()).toBeVisible();

        await page.getByText("REACTIVATE", { exact: true }).click();
        await page.waitForTimeout(200);
        await expect(page.getByText("ACTIVE", { exact: false })).toBeVisible();

        await page.getByText("ABANDON", { exact: true }).click();
        await page.waitForTimeout(200);
        await expect(page.getByText("ABANDONED", { exact: false }).first()).toBeVisible();
    });

    test("clicking a goal card's body (not an action button) opens goal-detail", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        await expect(page.getByText("EDIT", { exact: true })).toBeVisible();
        // LINK COMMITMENT only renders when there's an unlinked commitment
        // available to link — see the dedicated linking test below.
        await expect(page.getByText("LINK COMMITMENT", { exact: true })).toHaveCount(0);
    });
});

test.describe("Goals — per-area view", () => {
    test("only goals linked to that area appear; filing from there auto-links", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await createArea(page, "Finance");

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE GOAL", { exact: false }).first().click();
        await fillTitle(page, "Run a marathon");
        await page.getByText("SET GOAL", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Run a marathon", { exact: true })).toBeVisible();
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Finance", { exact: true }).click();
        await expect(page.getByText("Run a marathon", { exact: true })).toHaveCount(0);

        // Global view lists it regardless of which area it's scoped to.
        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("Run a marathon", { exact: true })).toBeVisible();
    });
});

test.describe("Goal-detail — linking and lifecycle", () => {
    test("LINK COMMITMENT picker links an existing unlinked commitment; unlink removes it", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        // An unlinked task for the picker to find.
        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("MAKE COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "Long run");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Goals", { exact: true }).click();
        await page.getByText("Run a marathon", { exact: true }).click();
        await page.getByText("LINK COMMITMENT", { exact: true }).click();
        await page.getByPlaceholder("Search commitments…").fill("Long run");
        await page.getByText("Long run", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Long run", { exact: true })).toBeVisible();
        await page.getByText("unlink from objective", { exact: false }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Long run", { exact: true })).toHaveCount(0);
    });

    test("+ MAKE NEW COMMITMENT auto-links the created commitment to the goal", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        await page.getByText("+ MAKE NEW COMMITMENT", { exact: true }).click();
        await fillTitle(page, "Speed work");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Speed work", { exact: true })).toBeVisible();
    });

    test("EDIT opens the unified dialog in GOAL mode, pre-filled", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        await page.getByText("EDIT", { exact: true }).click();
        await expect(page.getByText("AMEND GOAL", { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder("Describe the commitment clearly.")).toHaveValue("Run a marathon");
    });

    test("DELETE OBJECTIVE shows a confirmation and then removes the goal", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        await page.getByText("DELETE OBJECTIVE", { exact: true }).click();
        await expect(page.getByText("PERMANENTLY DELETE THIS OBJECTIVE?", { exact: true })).toBeVisible();

        await page.getByText("DELETE", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Run a marathon", { exact: true })).toHaveCount(0);
    });

    test("decommissioning an area deletes its linked goals", async ({ page }) => {
        await page.goto("/");
        await createArea(page, "Fitness");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE GOAL", { exact: false }).first().click();
        await fillTitle(page, "Run a marathon");
        await page.getByText("SET GOAL", { exact: true }).click();
        await page.waitForTimeout(300);

        // TESTING.md's Area-detail section said "DECOMMISSION AREA" /
        // "DECOMMISSION" — actual current text is "DELETE AREA" and "DELETE".
        await page.getByText("DELETE AREA", { exact: true }).click();
        await page.getByText("DELETE", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("Run a marathon", { exact: true })).toHaveCount(0);
    });
});

test.describe("Ideas — global view", () => {
    test("empty state, filing an idea, and deleting it", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("No intelligence on file. Observations go here.", { exact: true })).toBeVisible();

        await page.getByText("MAKE IDEA", { exact: false }).first().click();
        await fillTitle(page, "Try a new coffee shop");
        await page.getByText("FILE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Try a new coffee shop", { exact: true })).toBeVisible();

        // The idea card has its own inline DELETE button (separate from the
        // unified dialog's own "DELETE IDEA" flow, reachable by opening the
        // card instead) — this is the flow TESTING.md originally described.
        await page.getByText("DELETE", { exact: true }).click();
        await expect(page.getByText("Permanently delete this intelligence?", { exact: false })).toBeVisible();
        await page.getByText("CONFIRM", { exact: true }).click();
        await page.waitForTimeout(300);
        await expect(page.getByText("Try a new coffee shop", { exact: true })).toHaveCount(0);
    });

    test("clicking an idea card opens the unified dialog in IDEA mode; switching type converts it", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Ideas", { exact: true }).click();
        await page.getByText("MAKE IDEA", { exact: false }).first().click();
        await fillTitle(page, "Try a new coffee shop");
        await page.getByText("FILE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Try a new coffee shop", { exact: true }).click();
        await expect(page.getByText("AMEND IDEA", { exact: true })).toBeVisible();
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("SAVE TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Try a new coffee shop", { exact: true })).toHaveCount(0);
        await page.getByText("Daily", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await expect(page.getByText("Try a new coffee shop", { exact: true })).toBeVisible();
    });

    test("PROMOTE TO COMMITMENT pre-fills the commitment dialog and removes the idea on submit", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Ideas", { exact: true }).click();
        await page.getByText("MAKE IDEA", { exact: false }).first().click();
        await fillTitle(page, "Try a new coffee shop");
        await page.getByText("FILE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("PROMOTE TO COMMITMENT", { exact: true }).click();
        await expect(page.getByPlaceholder("Describe the commitment clearly.")).toHaveValue("Try a new coffee shop");
        // The dialog may retain whichever kind was last active rather than
        // resetting to Task — normalize explicitly rather than assume.
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await page.getByText("Ideas", { exact: true }).click();
        await expect(page.getByText("Try a new coffee shop", { exact: true })).toHaveCount(0);
    });
});

test.describe("Ideas — per-area view", () => {
    test("area-detail's ideas section is labeled IDEAS, not INTELLIGENCE; only that area's ideas show", async ({ page }) => {
        // TESTING.md previously described this section as "INTELLIGENCE" — the
        // component actually renders skin.types.ideaPlural.toUpperCase(), which
        // is "IDEAS" for every current skin. Matches the fix already noted
        // under "Bug regressions" (issue #7) for the Goals section; this doc's
        // Ideas section just hadn't been updated to match.
        await page.goto("/");
        await createArea(page, "Fitness");
        await createArea(page, "Finance");

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Fitness", { exact: true }).click();
        await page.getByText("MAKE IDEA", { exact: false }).first().click();
        await fillTitle(page, "Try a new gym");
        await page.getByText("FILE IDEA", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("IDEAS", { exact: true })).toBeVisible();
        await expect(page.getByText("INTELLIGENCE", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Try a new gym", { exact: true })).toBeVisible();

        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("Finance", { exact: true }).click();
        await expect(page.getByText("Try a new gym", { exact: true })).toHaveCount(0);
    });
});
