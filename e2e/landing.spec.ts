import { test, expect } from "@playwright/test";

test.describe("Marketing landing page", () => {
  test("loads with core value props and CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/meet your/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/motivation companion/i).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start my free session/i })
    ).toBeVisible();
  });

  test("does not display fabricated social proof", async ({ page }) => {
    await page.goto("/");

    // These were removed to avoid Meta ad account ban risk
    await expect(
      page.getByText(/12,000\+ people started this week/i)
    ).not.toBeVisible();
    await expect(page.getByText(/4\.8 stars/i)).not.toBeVisible();
  });

  test("has footer links to Privacy and Terms", async ({ page }) => {
    await page.goto("/");

    const privacyLink = page.getByRole("link", { name: /^privacy$/i });
    const termsLink = page.getByRole("link", { name: /^terms$/i });

    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute("href", "/privacy");
    await expect(termsLink).toHaveAttribute("href", "/terms");
  });

  test("clicking Start starts the quiz flow", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: /start my free session/i })
      .click();

    // Sam intro is the first quiz screen
    await expect(page.getByText(/hey! i'm/i)).toBeVisible();
  });

  test("Privacy Policy page loads and has content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/what we collect/i)).toBeVisible();
    await expect(page.getByText(/anthropic/i)).toBeVisible();
    await expect(page.getByText(/stripe/i)).toBeVisible();
  });

  test("Terms of Service page loads and has content", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
    await expect(page.getByText(/subscriptions and billing/i)).toBeVisible();
    await expect(page.getByText(/7-day free trial/i)).toBeVisible();
  });
});
