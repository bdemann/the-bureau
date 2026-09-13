import { expect, test } from "@playwright/test";
import { createGoal, fillTitle, openSection } from "./helpers";

// Mirrors TESTING.md's "App shell" and "Bottom navigation bar" sections.

test.describe("App shell", () => {
    test("loads with the expected header and lands on Daily by default", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto("/");
        await page.waitForTimeout(300);

        await expect(page.getByText("CLEAR", { exact: false }).first()).toBeVisible();
        await expect(page.getByText("BUREAU OF CIVIC RESPONSIBILITY", { exact: false })).toBeVisible();
        await expect(page.locator(".score-number")).toBeVisible();
        await expect(page.getByText("TODAY'S MANDATORY", { exact: false })).toBeVisible();
        expect(errors).toEqual([]);
    });

    test("hamburger menu opens and a backdrop click closes it", async ({ page }) => {
        await page.goto("/");
        await page.getByTitle("Menu", { exact: true }).click();
        await expect(page.getByText("Bureau Menu", { exact: true })).toBeVisible();

        // Click the backdrop (outside the panel) — top-left corner of the viewport.
        await page.mouse.click(5, 5);
        await page.waitForTimeout(200);
        await expect(page.getByText("Bureau Menu", { exact: true })).toHaveCount(0);
    });

    test("Menu → Insights navigates there and closes the menu", async ({ page }) => {
        await page.goto("/");
        await page.getByTitle("Menu", { exact: true }).click();
        await page.getByText("Insights", { exact: false }).first().click();
        await expect(page.getByText("MISSED COMMITMENTS", { exact: true })).toBeVisible();
        await expect(page.getByText("Bureau Menu", { exact: true })).toHaveCount(0);
    });

    // Correction: TESTING.md said the hamburger menu shows "Insights and Report
    // a Neighbor only" — it's grown substantially since that was written.
    test("hamburger menu now has many more sections than 'Insights and Report a Neighbor only'", async ({ page }) => {
        await page.goto("/");
        await page.getByTitle("Menu", { exact: true }).click();
        await expect(page.getByText("Filed Records", { exact: true })).toBeVisible();
        await expect(page.getByText("All Tasks", { exact: false })).toBeVisible();
        await expect(page.getByText("All Routines", { exact: false })).toBeVisible();
        await expect(page.getByText("All Commitments", { exact: false }).first()).toBeVisible();
        await expect(page.getByText("Performance", { exact: true })).toBeVisible();
        await expect(page.getByText("Community Duty", { exact: true })).toBeVisible();
        await expect(page.getByText("Report a Neighbor", { exact: false })).toBeVisible();
        await expect(page.getByText("Shopping List", { exact: false })).toBeVisible();
        await expect(page.getByText("Preferences", { exact: false })).toBeVisible();
        await expect(page.getByText("Your Data", { exact: true })).toBeVisible();
        await expect(page.getByText("Export Spreadsheet", { exact: false })).toBeVisible();
        await expect(page.getByText("Export Your Records", { exact: false })).toBeVisible();
        await expect(page.getByText("Restore Records", { exact: false })).toBeVisible();
    });
});

test.describe("Bottom navigation bar", () => {
    test("visible on all four primary views and switches correctly", async ({ page }) => {
        await page.goto("/");
        for (const [tab, marker] of [
            ["Areas", "NEW AREA OF RESPONSIBILITY"],
            ["Ideas", "MAKE IDEA"],
            ["Goals", "MAKE GOAL"],
            ["Daily", "MAKE COMMITMENT"],
        ] as const) {
            await page.getByText(tab, { exact: true }).click();
            await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
        }
    });

    test("Areas tab stays highlighted while viewing an area's detail", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Fitness");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);

        await page.getByText("Fitness", { exact: true }).click();
        const areasTab = page.locator("nav button", { hasText: "Areas" });
        await expect(areasTab).toHaveClass(/active/);
    });

    test("Goals tab stays highlighted while viewing a goal's detail", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        const goalsTab = page.locator("nav button", { hasText: "Goals" });
        await expect(goalsTab).toHaveClass(/active/);
    });

    test("tapping Areas/Goals tab from their own detail view returns to the top-level list", async ({ page }) => {
        await page.goto("/");
        await createGoal(page, "Run a marathon");
        await page.getByText("Run a marathon", { exact: true }).click();
        await expect(page.getByText("EDIT", { exact: true })).toBeVisible();

        await page.getByText("Goals", { exact: true }).click();
        await expect(page.getByText("MAKE GOAL", { exact: false }).first()).toBeVisible();
        await expect(page.getByText("EDIT", { exact: true })).toHaveCount(0);
    });

    test("UNDO toast renders above the nav bar, not behind it", async ({ page }) => {
        await page.goto("/");
        await page.getByText("MAKE COMMITMENT", { exact: false }).first().click();
        await fillTitle(page, "Something");
        await openSection(page, "Window & Deadline");
        await page.getByText("Flexible", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);
        await page.getByText("Snooze", { exact: false }).click();

        const toastBox = await page.locator(".undo-toast").boundingBox();
        const navBox = await page.locator("nav").boundingBox();
        expect(toastBox).not.toBeNull();
        expect(navBox).not.toBeNull();
        // The toast's bottom edge should sit at or above the nav bar's top edge.
        expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
    });
});
