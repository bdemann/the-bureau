import { defineConfig, devices } from "@playwright/test";

// The port is configurable so parallel git worktrees can run e2e side by side.
// With --strictPort and no server reuse, a busy port fails the run instead of
// silently testing someone else's (stale) server.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 5173);

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: `http://localhost:${port}`,
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "mobile",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
            },
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 30_000,
    },
});
