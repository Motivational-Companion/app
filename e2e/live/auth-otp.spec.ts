import { test, expect } from "@playwright/test";
import { createInbox, waitForOtpCode } from "./mail-tm";

/**
 * Live end-to-end OTP test — proves real Supabase + SMTP delivery.
 *
 * Uses a disposable mail.tm inbox (no secrets, no cost) to drive the
 * actual production signin flow and verify the 6-digit code lands.
 * Failures here mean the SMTP config regressed, Supabase auth broke,
 * or Resend sender was revoked.
 *
 * Run: `npm run test:live`. Longer timeout because email delivery
 * takes 5-30s real-world.
 */
test("signin OTP arrives and authenticates against prod", async ({ page }) => {
  test.setTimeout(120_000);

  const inbox = await createInbox();
  console.log(`[live-otp] inbox: ${inbox.email}`);

  await page.goto("/signin");
  await page.getByPlaceholder(/email/i).fill(inbox.email);
  await page.getByRole("button", { name: /sign.?in/i }).click();

  // Either the "check your email" step or a visible error.
  await expect(
    page.getByText(/check your email|we sent/i).first()
  ).toBeVisible({ timeout: 15_000 });

  const code = await waitForOtpCode(inbox.token);
  console.log(`[live-otp] code received: ${code}`);

  // Single-input form; auto-submits once all 6 digits land (see
  // lastSubmittedRef effect in AuthGate).
  await page.getByLabel(/verification code/i).fill(code);

  await expect(page).toHaveURL(/\/chat/, { timeout: 20_000 });
});
