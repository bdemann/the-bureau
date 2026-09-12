import { test } from "@playwright/test";
import { expectNoHorizontalOverflow, fillTitle, openMakeCommitment } from "./helpers";

test.describe("Make/Amend commitment dialog — no horizontal overflow at mobile width", () => {
    for (const type of ["Routine", "Task", "Goal", "Idea"] as const) {
        test(`${type} mode`, async ({ page }) => {
            await page.goto("/");
            await openMakeCommitment(page);
            await page.getByText(type, { exact: true }).click();
            await expectNoHorizontalOverflow(page, `${type} mode`);
        });
    }

    test("recurring commitment — every cadence", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("Recurring commitment").click();
        await expectNoHorizontalOverflow(page, "recurring: daily (default)");

        for (const cadence of ["Weekly", "Monthly", "Quarterly", "Annually"]) {
            await page.getByText(cadence, { exact: true }).click();
            await expectNoHorizontalOverflow(page, `recurring: ${cadence}`);
        }
    });

    test("flexible deadline type", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("Flexible", { exact: true }).click();
        await expectNoHorizontalOverflow(page, "flexible deadline");
    });

    test("milestone toggle", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await page.getByText("Milestone (track progress", { exact: false }).click();
        await expectNoHorizontalOverflow(page, "milestone toggled");
    });

    test("amend (edit) an existing task", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Pay electric bill");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.getByText("TODAY'S MANDATORY", { exact: false }).click();
        await page.getByText("Pay electric bill", { exact: true }).click();
        await expectNoHorizontalOverflow(page, "amend task dialog");
    });
});

test.describe("Area wizard — no horizontal overflow at mobile width", () => {
    test("step 1: new area", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await expectNoHorizontalOverflow(page, "area wizard step 1");
    });

    test("step 2: identify commitments", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Continue", { exact: false }).click();
        await expectNoHorizontalOverflow(page, "area wizard step 2");
    });
});
