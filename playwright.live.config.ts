import { defineConfig, devices } from "@playwright/test";

/**
 * Live integration config. Runs e2e/live/* against production
 * (motivation-companion.vercel.app). No mocks, no local dev server.
 * Hits real Supabase + real Resend SMTP + real mail.tm.
 *
 * Run: `npm run test:live`
 */
export default defineConfig({
  testDir: "./e2e/live",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 120_000,

  use: {
    baseURL:
      process.env.LIVE_BASE_URL || "https://motivation-companion.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
