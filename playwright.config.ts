import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Motivational Companion E2E tests.
 *
 * Tests run against the local Next.js dev server. External services
 * (Stripe, Supabase auth, Claude API) are mocked per-test via
 * `page.route()` interception so tests are fast, deterministic, and
 * never touch production data or cost real money.
 *
 * Run locally: `npm run test:e2e`
 * Run with UI: `npm run test:e2e -- --ui`
 * Run headed:  `npm run test:e2e -- --headed`
 *
 * First-time setup: `npx playwright install chromium`
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
