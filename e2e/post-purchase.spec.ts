import { test, expect } from "@playwright/test";
import { mockSupabase, mockStripeSession } from "./fixtures/mocks";

test.describe("Post-purchase success flow", () => {
  test("shows trial started pill, auto-sends OTP, lands on code step", async ({
    page,
  }) => {
    await mockSupabase(page, { user: null });
    await mockStripeSession(page, { email: "buyer@example.com" });

    await page.goto("/success?session_id=cs_test_mock");

    // Trial pill badge at the top
    await expect(
      page.getByText(/your 7-day free trial has started/i)
    ).toBeVisible();

    // Heading is "Almost there" (code step), not "You're in" (email step)
    await expect(page.getByText(/almost there/i)).toBeVisible();

    // Email displayed prominently
    await expect(page.getByText("buyer@example.com")).toBeVisible();

    // Code input is present (not email input)
    await expect(
      page.getByLabel(/6-digit verification code/i)
    ).toBeVisible();
  });

  test("shows Resend button with cooldown and Use different email link", async ({
    page,
  }) => {
    await mockSupabase(page, { user: null });
    await mockStripeSession(page, { email: "buyer@example.com" });

    await page.goto("/success?session_id=cs_test_mock");

    // Wait for auto-send to complete and cooldown to activate
    await expect(
      page.getByText(/resend in \d+s/i)
    ).toBeVisible({ timeout: 5000 });

    // Use different email button is visible
    await expect(
      page.getByRole("button", { name: /use a different email/i })
    ).toBeVisible();
  });

  test("Use a different email returns to email step with empty field", async ({
    page,
  }) => {
    await mockSupabase(page, { user: null });
    await mockStripeSession(page, { email: "buyer@example.com" });

    await page.goto("/success?session_id=cs_test_mock");

    // Pre-condition: we are on the code step with the prefilled email shown
    await expect(page.getByText("buyer@example.com")).toBeVisible();
    await expect(page.getByText(/almost there/i)).toBeVisible();
    await expect(
      page.getByLabel(/6-digit verification code/i)
    ).toBeVisible();

    await page
      .getByRole("button", { name: /use a different email/i })
      .click();

    // Post-condition: email step visible, input empty, code input gone
    const emailInput = page.getByPlaceholder(/your email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue("");
    await expect(
      page.getByLabel(/6-digit verification code/i)
    ).not.toBeVisible();
    await expect(page.getByText(/one last step/i)).toBeVisible();
  });

  test("shows error if auto-send fails", async ({ page }) => {
    await mockSupabase(page, {
      user: null,
      otpSendOk: false,
      otpSendError: "Rate limit exceeded",
    });
    await mockStripeSession(page, { email: "buyer@example.com" });

    await page.goto("/success?session_id=cs_test_mock");

    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible();
  });

  test("shows error if wrong code entered", async ({ page }) => {
    await mockSupabase(page, {
      user: null,
      otpSendOk: true,
      otpVerifyOk: false,
      otpVerifyError: "Token has expired or is invalid",
    });
    await mockStripeSession(page, { email: "buyer@example.com" });

    await page.goto("/success?session_id=cs_test_mock");
    await expect(page.getByText("buyer@example.com")).toBeVisible();

    await page
      .getByLabel(/6-digit verification code/i)
      .fill("123456");
    await page.getByRole("button", { name: /unlock sam/i }).click();

    await expect(page.getByText(/expired or is invalid/i)).toBeVisible();
  });

  test("success page falls back to email entry when no Stripe email", async ({
    page,
  }) => {
    await mockSupabase(page, { user: null });
    // Mock Stripe session with no email
    await page.route("**/api/stripe/session*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          customer_id: "cus_test_mock",
          customer_email: null,
          payment_status: "paid",
        }),
      });
    });

    await page.goto("/success?session_id=cs_test_mock");

    // Should show the email step (heading "You're in. One last step.")
    await expect(page.getByText(/one last step/i)).toBeVisible();
    await expect(page.getByPlaceholder(/your email/i)).toBeVisible();
  });
});
