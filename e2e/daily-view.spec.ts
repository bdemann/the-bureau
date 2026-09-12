import { expect, test } from "@playwright/test";
import { fillTitle, openMakeCommitment, patchCommitmentByTitle, readScore, revealCommitmentInDailyView } from "./helpers";

// Mirrors TESTING.md's "Daily view" section. Band-assignment *rules* (which
// band a task lands in given tier/date/etc.) are already exhaustively unit
// tested in urgency.test.ts — these tests cover the surrounding UI: collapse/
// expand persistence, empty states, "Not Today", and the docket-cleared bonus.

async function addTask(page: import("@playwright/test").Page, title: string, tier: "T1" | "T2" | "T3" | "T4" = "T3") {
    await openMakeCommitment(page);
    await fillTitle(page, title);
    await page.getByText(tier, { exact: true }).click();
    await page.getByText("ADD TASK", { exact: true }).click();
    await page.waitForTimeout(300);
}

async function addRoutine(page: import("@playwright/test").Page, title: string, tier: "T1" | "T2" | "T3" | "T4" = "T3") {
    await openMakeCommitment(page);
    await page.getByText("Routine", { exact: true }).click();
    await fillTitle(page, title);
    await page.getByText(tier, { exact: true }).click();
    await page.getByText("COMMIT ROUTINE", { exact: true }).click();
    await page.waitForTimeout(300);
}

test.describe("Band collapse/expand", () => {
    test("Radar/Backlog default collapsed on a fresh session", async ({ page }) => {
        await page.goto("/");
        const header = (name: string) => page.locator(".band-header", { hasText: name });
        await expect(header("ON YOUR RADAR").locator(".band-chevron")).toHaveText("▸");
        await expect(header("BACKLOG").locator(".band-chevron")).toHaveText("▸");
    });

    test("expanding Mandatory sticks once it's non-empty (only auto-collapses while empty)", async ({ page }) => {
        // A fresh, empty session actually starts with Mandatory collapsed —
        // see the E1 auto-collapse note below — and adding a task doesn't
        // auto-expand it back (nothing re-expands it automatically, only the
        // empty -> collapse direction is automatic). So "starts expanded"
        // isn't literally true; what's true is that a manual expand holds
        // once there's something in the band to show.
        await page.goto("/");
        await addRoutine(page, "Take medication", "T1");
        const mandatoryHeader = page.locator(".band-header", { hasText: "TODAY'S MANDATORY" });
        await expect(mandatoryHeader.locator(".band-chevron")).toHaveText("▸");

        await mandatoryHeader.click();
        await page.waitForTimeout(200);
        await expect(mandatoryHeader.locator(".band-chevron")).toHaveText("▾");
        await expect(page.getByText("Take medication", { exact: true })).toBeVisible();
    });

    test("clicking a band header toggles it and the state persists across reload", async ({ page }) => {
        await page.goto("/");
        const radarHeader = page.locator(".band-header", { hasText: "ON YOUR RADAR" });
        await radarHeader.click();
        await expect(radarHeader.locator(".band-chevron")).toHaveText("▾");

        await page.reload({ waitUntil: "networkidle" });
        await expect(page.locator(".band-header", { hasText: "ON YOUR RADAR" }).locator(".band-chevron")).toHaveText("▾");
    });

    test("empty Mandatory auto-collapses instead of showing the approval message", async ({ page }) => {
        // Documents current (likely unintended) behavior found while writing this
        // suite: E1's auto-collapse ("if mandatory is empty and currently
        // expanded, collapse it") fires on *any* render where mandatory is
        // empty — including a fresh session with zero tasks, and again
        // immediately if the user manually re-expands it while still empty.
        // The result: skin.bands.mandatory.empty ("No mandatory tasks today.
        // Agent Whitaker approves.") can never actually be seen, because the
        // section that would show it collapses itself first. Flagged in
        // TESTING.md for a product decision rather than changed here.
        await page.goto("/");
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-chevron")).toHaveText("▸");
        await expect(page.getByText("No mandatory tasks today. Agent Whitaker approves.", { exact: true })).toHaveCount(0);

        // Manually re-expanding it doesn't stick while it's still empty.
        await page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).click();
        await page.waitForTimeout(200);
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-chevron")).toHaveText("▸");
    });
});

test.describe("Card content", () => {
    test("each card shows its area name above the title", async ({ page }) => {
        await page.goto("/");
        await page.getByText("Areas", { exact: true }).click();
        await page.getByText("NEW AREA OF RESPONSIBILITY").click();
        await page.getByPlaceholder("Amateur Baker", { exact: false }).fill("Finance");
        await page.getByText("Quick create", { exact: false }).click();
        await page.waitForTimeout(200);

        await page.getByText("Daily", { exact: true }).click();
        await openMakeCommitment(page);
        await fillTitle(page, "Pay credit card");
        await page.locator(".field", { hasText: "Area of Responsibility" }).locator("select").selectOption({ label: "Finance" });
        await page.getByText("ADD TASK", { exact: true }).click();
        await page.waitForTimeout(300);

        await revealCommitmentInDailyView(page, "Pay credit card");
        await expect(page.getByText("Finance", { exact: true })).toBeVisible();
    });
});

test.describe("'Not Today'", () => {
    test("absent on a Mandatory card", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Take medication", "T1");
        await revealCommitmentInDailyView(page, "Take medication");
        await expect(page.getByText("Not Today", { exact: true })).toHaveCount(0);
    });

    test("pressing it hides the card for today with no score change and no snoozeCount increment", async ({ page }) => {
        await page.goto("/");
        await addTask(page, "Distant errand");
        // Force it into Radar/Backlog by pushing suggestedDate/window far out via
        // a flexible deadline is fiddly to set up through the UI alone; instead
        // patch it directly to a state Not Today is guaranteed to render for.
        await patchCommitmentByTitle(page, "Distant errand", {
            deadlineType: "flexible",
            windowDeadline: Date.now() + 30 * 86_400_000,
            windowLengthDays: 60,
            suggestedDate: null,
        });
        const before = await readScore(page);
        await revealCommitmentInDailyView(page, "Distant errand");
        await page.getByText("Not Today", { exact: true }).click();
        await page.waitForTimeout(300);

        await expect(page.getByText("Distant errand", { exact: true })).toHaveCount(0);
        expect(await readScore(page)).toBe(before);

        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem("bureau_v1")!;
            const parsed = JSON.parse(raw);
            return parsed.commitments.find((c: {title: string}) => c.title === "Distant errand");
        });
        expect(stored.snoozeCount).toBe(0);
        expect(stored.totalSnoozes).toBe(0);
    });
});

test.describe("Band placement (C1/C2 rules) — wiring check", () => {
    test("T1 daily routine is Mandatory; T4 daily task is never Mandatory", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Take medication", "T1");
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-count")).toHaveText("1");

        await addTask(page, "Someday project", "T4");
        // T4 caps at 'suggested' even on its due date (C1) — Mandatory count stays 1.
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-count")).toHaveText("1");
    });

    test("T2 daily routine escalates to Mandatory once skipStreak reaches the threshold", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "Check inbox", "T2");
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-count")).toHaveText("0");

        await patchCommitmentByTitle(page, "Check inbox", { skipStreak: 5 });
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-count")).toHaveText("1");
    });
});

test.describe("Docket-cleared bonus (E1 + score)", () => {
    test("completing the last mandatory task yields a bigger score jump and auto-collapses Mandatory", async ({ page }) => {
        await page.goto("/");
        await addRoutine(page, "First mandatory", "T1");
        await addRoutine(page, "Second mandatory", "T1");

        const start = await readScore(page);
        await revealCommitmentInDailyView(page, "First mandatory");
        await page.locator(".task-drag-wrapper", { hasText: "First mandatory" }).locator("button", { hasText: "✓" }).click();
        await page.waitForTimeout(300);
        const afterFirst = await readScore(page);
        const firstDelta = afterFirst - start;

        await page.locator(".task-drag-wrapper", { hasText: "Second mandatory" }).locator("button", { hasText: "✓" }).click();
        await page.waitForTimeout(300);
        const afterSecond = await readScore(page);
        const secondDelta = afterSecond - afterFirst;

        // Second completion clears the docket (mandatory band -> empty): its
        // delta includes the docket bonus on top of a (already larger, due to
        // fewer active tasks) per-task reward.
        expect(secondDelta).toBeGreaterThan(firstDelta);

        // E1: mandatory band is now empty -> auto-collapses; suggested auto-expands.
        await expect(page.locator(".band-header", { hasText: "TODAY'S MANDATORY" }).locator(".band-chevron")).toHaveText("▸");
    });
});
