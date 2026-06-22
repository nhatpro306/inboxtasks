import { defineConfig, devices } from "@playwright/test";

/**
 * InboxTasks – Playwright configuration.
 *
 * The E2E tests are guarded with test.skip(!process.env.E2E_LIVE, …)
 * so `npx playwright test` passes (all skipped) without a running stack.
 *
 * To run live tests:
 *   1. Start the full stack: docker compose up -d postgres && npm run dev
 *   2. Set E2E_LIVE=1 and optionally E2E_BASE_URL=http://localhost:5173
 *   3. Run: E2E_LIVE=1 npx playwright test
 *
 * First-time browser install: npx playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
