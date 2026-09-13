import { expect, test } from "@playwright/test";
import { fillTitle, openCommitmentFromDailyView, openMakeCommitment, openSection } from "./helpers";

// Covers the add/edit dialog's grouped-section redesign itself: which
// sections are always open, which start collapsed, and the auto-open rule
// that expands a collapsed section once the commitment already has
// something configured there (see add-task-dialog.element.ts's
// autoOpenWindow/autoOpenLifecycle/autoOpenMilestone).

test.describe("Always-open sections", () => {
    test("Basics, Priority, Schedule, and Organize show their fields with no expand step", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await expect(page.getByText("Consequence Tier", { exact: true })).toBeVisible();
        await expect(page.getByText("Time of Day", { exact: true })).toBeVisible();
        await expect(page.getByText("Recurring commitment", { exact: false })).toBeVisible();
        await expect(page.getByText("Area of Responsibility", { exact: true })).toBeVisible();
    });
});

test.describe("Collapsed-by-default sections", () => {
    test("Window & Deadline and Milestone start collapsed for a brand-new one-off task", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await expect(page.getByText("Deadline Type", { exact: true })).not.toBeVisible();
        await expect(page.getByText("Milestone (track progress", { exact: false })).not.toBeVisible();

        await openSection(page, "Window & Deadline");
        await expect(page.getByText("Deadline Type", { exact: true })).toBeVisible();
        await openSection(page, "Milestone");
        await expect(page.getByText("Milestone (track progress", { exact: false })).toBeVisible();
    });

    test("Lifecycle doesn't render at all for a one-off (non-recurring) task", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await expect(page.getByText("Lifecycle", { exact: true })).toHaveCount(0);
    });

    test("clicking a section header toggles it open and closed again", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        const header = page.locator(".form-section-header", { hasText: "Window & Deadline" });

        await expect(page.getByText("Deadline Type", { exact: true })).not.toBeVisible();
        await header.click();
        await expect(page.getByText("Deadline Type", { exact: true })).toBeVisible();
        await header.click();
        await expect(page.getByText("Deadline Type", { exact: true })).not.toBeVisible();
    });
});

test.describe("Auto-open on edit", () => {
    test("a flexible deadline with a custom lead time reopens with Window & Deadline expanded", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await fillTitle(page, "Renew library card");
        await openSection(page, "Window & Deadline");
        await page.getByText("Flexible", { exact: true }).click();
        await page.getByText("Custom", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Renew library card");
        await expect(page.getByText("Deadline Type", { exact: true })).toBeVisible();
    });

    test("a milestone reopens with the Milestone section expanded", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Task", { exact: true }).click();
        await fillTitle(page, "Write the novel");
        await openSection(page, "Milestone");
        await page.getByText("Milestone (track progress", { exact: false }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Write the novel");
        await expect(page.getByText("Progress Cadence", { exact: true })).toBeVisible();
    });

    test("a recurring task with an end condition reopens with Lifecycle expanded", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Read 10 books this year");
        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await page.getByLabel("Has an end condition").check();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Read 10 books this year");
        await expect(page.getByText("Pause Commitment", { exact: true })).toBeVisible();
    });

    test("a plain recurring task with nothing configured reopens with Lifecycle still collapsed", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Take vitamins");
        await page.getByText("Recurring commitment", { exact: false }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Take vitamins");
        await expect(page.getByText("Pause Commitment", { exact: true })).not.toBeVisible();
    });
});
