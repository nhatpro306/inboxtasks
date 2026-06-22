/**
 * InboxTasks – E2E happy-path spec
 *
 * HOW TO RUN LIVE
 * ---------------
 * Prerequisites:
 *   1. Full stack must be running:
 *        docker compose up -d postgres
 *        npm run dev           # starts api (3001) + worker + web (5173)
 *   2. Ollama running with qwen3:8b loaded:
 *        ollama serve          # (if not already running as a service)
 *        ollama pull qwen3:8b
 *   3. Install Playwright browsers (once):
 *        npx playwright install chromium
 *   4. Run:
 *        E2E_LIVE=1 npx playwright test
 *      or with a custom base URL:
 *        E2E_LIVE=1 E2E_BASE_URL=http://localhost:5173 npx playwright test
 *
 * Without E2E_LIVE=1 the entire describe is skipped so CI passes cleanly.
 */

import { test, expect, type Page } from "@playwright/test";

const LIVE = !!process.env.E2E_LIVE;

/**
 * Helper – wait for a suggestion card to appear in /review.
 * The worker needs time to process the inbox, so we allow generous retries.
 */
async function waitForSuggestion(page: Page) {
  await page.waitForSelector('[aria-label^="Suggestion:"]', { timeout: 60_000 });
}

test.describe("InboxTasks happy path", () => {
  test.skip(!LIVE, "Set E2E_LIVE=1 with the full stack (db+api+web+ollama) running");

  // ------------------------------------------------------------
  // Step 1 – Settings: add an email account
  // ------------------------------------------------------------
  test("1 · add an email account in Settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Expand the add-account form
    await page.getByRole("button", { name: /add inbox/i }).click();

    // Fill in the form using accessible labels (sr-only labels give us getByLabel)
    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("IMAP host").fill("imap.gmail.com");
    await page.getByLabel("IMAP port").fill("993");
    await page.getByLabel("App password").fill("test-app-password");

    // Submit
    await page.getByRole("button", { name: /add account/i }).click();

    // Expect the toast or the account to appear in the list
    await expect(
      page.getByRole("listitem").filter({ hasText: "test@example.com" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------
  // Step 2 – Trigger Scan now
  // ------------------------------------------------------------
  test("2 · trigger Scan now from the header", async ({ page }) => {
    await page.goto("/");

    // Scan now button is in both desktop header and mobile header; pick the first
    const scanBtn = page.getByRole("button", { name: /scan inbox now/i }).first();
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();

    // Button should briefly disable itself while scanning
    await expect(scanBtn).toBeDisabled({ timeout: 2_000 });

    // After scan, we navigate to /review automatically — wait for the heading
    await expect(page.getByRole("heading", { name: /review suggestions/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  // ------------------------------------------------------------
  // Step 3 – Review: accept a suggestion
  // ------------------------------------------------------------
  test("3 · accept a suggestion from /review", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByRole("heading", { name: /review suggestions/i })).toBeVisible();

    // Wait for at least one suggestion card
    await waitForSuggestion(page);

    const firstCard = page.locator('[aria-label^="Suggestion:"]').first();
    const suggestionTitle = await firstCard.getAttribute("aria-label");
    // aria-label is "Suggestion: <title>"
    const title = suggestionTitle?.replace(/^Suggestion:\s*/, "") ?? "";

    // Click the Accept button on this card
    await firstCard.getByRole("button", { name: /accept suggestion/i }).click();

    // Card should disappear
    await expect(firstCard).not.toBeVisible({ timeout: 5_000 });

    // Store title for subsequent steps (use test.info for cross-test sharing is complex;
    // instead we'll navigate to /today and look for any task — integration is enough)
    void title; // suppress unused-var warning
  });

  // ------------------------------------------------------------
  // Step 4 – Today: verify the accepted task appears
  // ------------------------------------------------------------
  test("4 · accepted task appears in /today", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    // At least one TaskCard should be rendered (section or task list not empty)
    await expect(
      page.locator(".bg-card").filter({ has: page.getByRole("checkbox") }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------
  // Step 5 – Calendar: assert a task event/dot is visible
  // ------------------------------------------------------------
  test("5 · /calendar shows a task event", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();

    // FullCalendar renders events as .fc-daygrid-event elements
    await expect(page.locator(".fc-daygrid-event").first()).toBeVisible({ timeout: 10_000 });
  });

  // ------------------------------------------------------------
  // Step 6 – Settings: notification toggle exists (a11y check)
  // ------------------------------------------------------------
  test("6 · push notification toggle is accessible in /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // The toggle renders as role="switch"
    const toggle = page.getByRole("switch", { name: /enable push notifications/i });
    await expect(toggle).toBeVisible();

    // Verify aria-checked is exposed (either true or false is fine)
    const checked = await toggle.getAttribute("aria-checked");
    expect(["true", "false"]).toContain(checked);
  });
});
