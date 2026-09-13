import { expect, test, type Page } from "@playwright/test";
import { cadencePicker, fillTitle, openCommitmentFromDailyView, openMakeCommitment, openSection } from "./helpers";

// Mirrors TESTING.md's "Task commitment creation — one-time / recurring
// (daily / weekly / monthly / quarterly / annually)", "Milestone commitment
// — progress cadence", "Monthly ordinal offset", "Recurring start date", and
// "Recurring end conditions" sections. Scope: UI wiring (fields appear/hide,
// anchor-summary text, validation, edit-mode round-trip pre-fill) — the date
// *math* itself (rollover, period advance) is already covered by
// src/data/recurrence.test.ts and is out of scope here.

async function selectCadence(page: Page, label: string) {
    await page.getByText("Recurring commitment", { exact: false }).click();
    await cadencePicker(page).getByText(label, { exact: true }).click();
}

test.describe("One-time task", () => {
    test("defaults: recurring off, rigid deadline, date = today", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("Recurring commitment", { exact: false })).not.toBeChecked();
        await openSection(page, "Window & Deadline");
        await expect(page.locator('input[type="date"]').first()).toBeVisible();
    });

    test("ADD TASK disabled until a title is typed", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByText("ADD TASK", { exact: true })).toBeDisabled();
        await fillTitle(page, "Something");
        await expect(page.getByText("ADD TASK", { exact: true })).toBeEnabled();
    });

    test("Flexible/Rigid deadline toggle switches which date field is required", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Renew library card");
        await expect(page.getByText("ADD TASK", { exact: true })).toBeEnabled();
        await openSection(page, "Window & Deadline");
        await page.getByText("Flexible", { exact: true }).click();
        await expect(page.getByText("ADD TASK", { exact: true })).toBeEnabled();
    });
});

test.describe("Daily cadence — skip days", () => {
    test("skip days row appears for Daily, not for Weekly", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Daily");
        await expect(page.getByText("SKIP DAYS", { exact: false })).toBeVisible();

        await cadencePicker(page).getByText("Weekly", { exact: true }).click();
        await expect(page.getByText("SKIP DAYS", { exact: false })).toHaveCount(0);
    });

    test("toggling multiple skip days doesn't block submission", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Daily");
        const skipSection = page.locator("div", { hasText: "SKIP DAYS" }).last();
        await skipSection.getByText("Sun", { exact: true }).click();
        await skipSection.getByText("Wed", { exact: true }).click();
        await fillTitle(page, "Take vitamins");
        await expect(page.getByText("ADD TASK", { exact: true })).toBeEnabled();
    });
});

test.describe("Weekly cadence", () => {
    test("day-of-week picker appears", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Weekly");
        await expect(page.getByText("DAYS OF WEEK", { exact: false })).toBeVisible();
    });

    test("anchor summary reads correctly for common day combinations", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Weekly");

        // Default has only today selected — click the other 6 (not today's own
        // button, which would toggle it back off) to reach "Every day.".
        const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayButton = (label: string) => cadencePicker(page).getByText(label, { exact: true });
        const todayLabel = allDays[new Date().getDay()];
        for (const d of allDays) {
            if (d === todayLabel) continue;
            await dayButton(d).click();
        }
        await expect(page.getByText("Every day.", { exact: true })).toBeVisible();

        await dayButton("Sun").click();
        await dayButton("Sat").click();
        await expect(page.getByText("Every weekday (Mon–Fri).", { exact: true })).toBeVisible();
    });

    test("the picker never allows deselecting the last remaining day", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Gym session");
        await selectCadence(page, "Weekly");
        // Default state has exactly one day selected (today). Per the picker's own
        // toggle guard (`if (next.size > 1) next.delete(day)`), clicking it again
        // must NOT remove it — the summary must never degrade to "No days selected."
        const today = new Date().getDay();
        const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][today];
        const todayButton = cadencePicker(page).getByText(dayLabel, { exact: true });
        await todayButton.click();
        await todayButton.click();
        await expect(page.getByText("No days selected.", { exact: true })).toHaveCount(0);
        await expect(page.getByText("ADD TASK", { exact: true })).toBeEnabled();
    });

    test("editing an existing multi-day weekly commitment pre-fills all selected days", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Take out trash");
        await selectCadence(page, "Weekly");
        // Add Mon+Thu first (the picker refuses to deselect the last remaining
        // day, so today's default selection must not be the only one when we
        // try to remove it), then deselect today's default if it's neither.
        const allDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayLabel = allDays[new Date().getDay()];
        await cadencePicker(page).getByText("Mon", { exact: true }).click();
        await cadencePicker(page).getByText("Thu", { exact: true }).click();
        if (todayLabel !== "Mon" && todayLabel !== "Thu") {
            await cadencePicker(page).getByText(todayLabel, { exact: true }).click();
        }
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Take out trash");
        await expect(page.getByText("Mon, Thu.", { exact: true })).toBeVisible();
    });
});

test.describe("Monthly cadence — day of month", () => {
    test("shows a 1-31 button grid, not a number input", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        await expect(page.getByText("Day of month", { exact: true })).toBeVisible();
        await expect(cadencePicker(page).getByText("31", { exact: true })).toBeVisible();
    });

    test("anchor summary reflects each day clicked", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        // Default preselects today's date, so assert by containment rather than
        // an exact single-day sentence (which would need today's day cleared first).
        const summary = cadencePicker(page).locator(".anchor-summary").first();
        await cadencePicker(page).getByText("1", { exact: true }).click();
        await expect(summary).toContainText("1st");
        await cadencePicker(page).getByText("15", { exact: true }).click();
        await expect(summary).toContainText("1st");
        await expect(summary).toContainText("15th");
    });

    test("edit dialog re-opens with the selected day highlighted (round trip)", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Pay rent");
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("1", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Pay rent");
        await expect(cadencePicker(page).locator(".anchor-summary").first()).toContainText("1st");
    });
});

test.describe("Monthly cadence — Nth weekday (ordinal)", () => {
    test("switching to Nth weekday shows ordinal + day-of-week pickers and an offset field", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await expect(page.getByText("Which Occurrence", { exact: false })).toBeVisible();
        await expect(page.getByText("Day of Week", { exact: true })).toBeVisible();
        await expect(page.getByText("Offset (days)", { exact: true })).toBeVisible();
    });

    test("anchor summary reflects ordinal + day-of-week selection", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await cadencePicker(page).getByText("3rd", { exact: true }).click();
        await cadencePicker(page).getByText("Thu", { exact: true }).click();
        // Day labels are 3-letter abbreviations ("Thu"), not full names.
        await expect(page.getByText("The 3rd Thu of each month.", { exact: true })).toBeVisible();
    });

    test("5th occurrence summary notes it skips months without a 5th", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await cadencePicker(page).getByText("5th*", { exact: true }).click();
        await expect(page.getByText("(skips months without a 5th)", { exact: false })).toBeVisible();
    });

    test("offset field updates its own summary text", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await expect(page.getByText("On the anchor day.", { exact: true })).toBeVisible();

        const offsetInput = cadencePicker(page).locator('input[type="number"]').first();
        await offsetInput.fill("-1");
        await offsetInput.blur();
        await expect(page.getByText("1 day before the anchor.", { exact: true })).toBeVisible();

        await offsetInput.fill("2");
        await offsetInput.blur();
        await expect(page.getByText("2 days after the anchor.", { exact: true })).toBeVisible();
    });

    test("edit dialog re-opens with ordinal, day-of-week, and offset pre-filled", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Grocery run before Thanksgiving");
        await selectCadence(page, "Monthly");
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await cadencePicker(page).getByText("4th", { exact: true }).click();
        await cadencePicker(page).getByText("Thu", { exact: true }).click();
        const offsetInput = cadencePicker(page).locator('input[type="number"]').first();
        await offsetInput.fill("-2");
        await offsetInput.blur();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Grocery run before Thanksgiving");
        await expect(page.getByText("2 days before the anchor.", { exact: true })).toBeVisible();
    });
});

test.describe("Quarterly cadence", () => {
    test("month-of-quarter picker and day-of-month grid both appear", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Quarterly");
        await expect(page.getByText("1st month", { exact: true })).toBeVisible();
        await expect(page.getByText("2nd month", { exact: true })).toBeVisible();
        await expect(page.getByText("3rd month", { exact: true })).toBeVisible();
        await expect(page.getByText("Day(s) of Month", { exact: true })).toBeVisible();
    });

    test("selecting the 2nd month and day 15 updates both anchor summaries", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Quarterly");
        await cadencePicker(page).getByText("2nd month", { exact: true }).click();
        await expect(page.getByText("Feb · May · Aug · Nov", { exact: true })).toBeVisible();
        await cadencePicker(page).getByText("15", { exact: true }).click();
        await expect(cadencePicker(page).locator(".anchor-summary").last()).toContainText("15th");
    });

    test("edit dialog re-opens with month-of-quarter and day pre-filled", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "File quarterly taxes");
        await selectCadence(page, "Quarterly");
        await cadencePicker(page).getByText("2nd month", { exact: true }).click();
        await cadencePicker(page).getByText("15", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "File quarterly taxes");
        await expect(page.getByText("Feb · May · Aug · Nov", { exact: true })).toBeVisible();
        await expect(cadencePicker(page).locator(".anchor-summary").last()).toContainText("15th");
    });
});

test.describe("Annually cadence", () => {
    test("month grid and day-anchor toggle appear", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Annually");
        await expect(cadencePicker(page).getByText("Jan", { exact: true })).toBeVisible();
        await expect(cadencePicker(page).getByText("Dec", { exact: true })).toBeVisible();
        await expect(page.getByText("Day Anchor", { exact: true })).toBeVisible();
    });

    test("Nth weekday mode shows the correct ordinal/day/month summary", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await selectCadence(page, "Annually");
        await cadencePicker(page).getByText("Nov", { exact: true }).click();
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await cadencePicker(page).getByText("4th", { exact: true }).click();
        await cadencePicker(page).getByText("Thu", { exact: true }).click();
        await expect(page.getByText("The 4th Thu of Nov each year.", { exact: true })).toBeVisible();
    });

    test("edit dialog re-opens with Nth weekday mode and correct selections", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Thanksgiving prep");
        await selectCadence(page, "Annually");
        await cadencePicker(page).getByText("Nov", { exact: true }).click();
        await cadencePicker(page).getByText("Nth weekday", { exact: true }).click();
        await cadencePicker(page).getByText("4th", { exact: true }).click();
        await cadencePicker(page).getByText("Thu", { exact: true }).click();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Thanksgiving prep");
        await expect(page.getByText("The 4th Thu of Nov each year.", { exact: true })).toBeVisible();
    });
});

test.describe("Milestone — progress cadence", () => {
    function progressCadenceField(page: Page) {
        return page.locator(".field", { hasText: "Progress Cadence" });
    }

    test("milestone checkbox reveals a progress-cadence picker defaulting to 'Once per day'", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await openSection(page, "Milestone");
        await page.getByText("Milestone (track progress", { exact: false }).click();
        await expect(page.getByText("Progress Cadence", { exact: true })).toBeVisible();
        await expect(progressCadenceField(page).getByText("Once per day", { exact: true })).toBeVisible();
    });

    test("'Custom' reveals a nested cadence picker; unchecking milestone hides the section", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await openSection(page, "Milestone");
        await page.getByText("Milestone (track progress", { exact: false }).click();
        await progressCadenceField(page).getByText("Custom", { exact: true }).click();
        await expect(cadencePicker(page)).toBeVisible();

        await page.getByText("Milestone (track progress", { exact: false }).click();
        await expect(page.getByText("Progress Cadence", { exact: true })).toHaveCount(0);
    });
});

test.describe("Recurring start date", () => {
    test("only appears once Recurring is on; checkbox reveals a Start Date field", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByLabel("Has a start date (don't show until then)")).toHaveCount(0);

        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await page.getByLabel("Has a start date (don't show until then)").check();
        await expect(page.getByText("Start Date", { exact: true })).toBeVisible();
    });

    test("edit dialog pre-fills the start-date checkbox and value", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Start new habit");
        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await page.getByLabel("Has a start date (don't show until then)").check();
        await page.locator('input[type="date"]').first().fill("2027-01-01");
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        // Future start date suppresses the commitment from every daily-view band, so
        // it can't be reopened via the daily view. Edit-mode round trip for a future
        // start date is left as a follow-up (would need an Insights/all-commitments
        // view that lists hidden-until-start-date items, which doesn't exist yet).
    });
});

test.describe("Recurring end conditions", () => {
    test("hidden until Recurring is on; then hidden for Routine, shown for Task", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await expect(page.getByLabel("Has an end condition")).toHaveCount(0);

        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await expect(page.getByLabel("Has an end condition")).toBeVisible();

        await page.getByText("Routine", { exact: true }).click();
        await expect(page.getByLabel("Has an end condition")).toHaveCount(0);
    });

    test("checking it reveals N-completions/date toggle; date mode shows a date picker", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await page.getByLabel("Has an end condition").check();
        await expect(page.getByText("N completions", { exact: true })).toBeVisible();
        await expect(page.getByText("A date", { exact: true })).toBeVisible();
        await expect(page.getByText("Number of Completions", { exact: true })).toBeVisible();

        await page.getByText("A date", { exact: true }).click();
        await expect(page.getByText("Last Day", { exact: false })).toBeVisible();
    });

    test("edit dialog pre-fills an existing end condition", async ({ page }) => {
        await page.goto("/");
        await openMakeCommitment(page);
        await fillTitle(page, "Read 10 books this year");
        await page.getByText("Recurring commitment", { exact: false }).click();
        await openSection(page, "Lifecycle");
        await page.getByLabel("Has an end condition").check();
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await openCommitmentFromDailyView(page, "Read 10 books this year");
        await expect(page.getByLabel("Has an end condition")).toBeChecked();
        await expect(page.getByText("N completions", { exact: true })).toBeVisible();
    });
});
