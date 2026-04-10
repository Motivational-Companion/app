import { test, expect, type Page } from "@playwright/test";
import { mockStripeCheckout } from "./fixtures/mocks";

/**
 * Navigate from the landing page to the paywall screen.
 *
 * The quiz has 12 screens (0-11) with 250ms transition animations. Rather
 * than hardcoding clicks per screen (brittle as copy changes), we walk the
 * funnel by repeatedly clicking the first interactive, non-navigation
 * button visible on screen until the paywall shows.
 *
 * Throws if stuck on a screen (no visible button or no advance after click).
 */
async function navigateToPaywall(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /start my free session/i }).click();
  await page.getByRole("button", { name: /i'm ready, let's go/i }).click();

  // Screen 1 onwards: pick the first option and keep going until paywall
  const paywallCta = page.getByRole("button", { name: /start free trial/i });
  const maxScreens = 15;

  for (let attempt = 0; attempt < maxScreens; attempt++) {
    if (await paywallCta.isVisible().catch(() => false)) return;

    // Prefer explicit Continue / Next buttons
    const continueBtn = page.getByRole("button", { name: /^continue$|^next$/i });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      // Wait for transition animation + new screen render
      await page.waitForFunction(
        () => !document.querySelector("[data-transitioning=true]"),
        { timeout: 2000 }
      ).catch(() => {});
      continue;
    }

    // Otherwise click the first selectable option card that is not a
    // back/skip button
    const optionCards = page
      .getByRole("button")
      .filter({ hasNotText: /back|skip|continue|next|start free trial/i });
    const count = await optionCards.count();
    if (count === 0) {
      throw new Error(`Stuck on quiz screen ${attempt}: no option cards visible`);
    }
    await optionCards.first().click();
    await page.waitForFunction(
      () => !document.querySelector("[data-transitioning=true]"),
      { timeout: 2000 }
    ).catch(() => {});
  }

  throw new Error(
    `Failed to reach paywall after ${maxScreens} clicks. Check quiz flow.`
  );
}

test.describe("Quiz funnel", () => {
  test("landing CTA advances into Sam intro screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start my free session/i }).click();

    await expect(page.getByText(/hey! i'm/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /i'm ready, let's go/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /tell me more first/i })
    ).toBeVisible();
  });

  test("first quiz question offers the four core options", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start my free session/i }).click();
    await page.getByRole("button", { name: /i'm ready, let's go/i }).click();

    await expect(page.getByText(/overwhelmed/i).first()).toBeVisible();
    await expect(page.getByText(/stuck/i).first()).toBeVisible();
    await expect(page.getByText(/clarity/i).first()).toBeVisible();
    await expect(page.getByText(/accountability/i).first()).toBeVisible();
  });

  test("paywall screen shows both plans and Start Free Trial", async ({ page }) => {
    await navigateToPaywall(page);

    await expect(
      page.getByRole("button", { name: /start free trial/i })
    ).toBeVisible();
    await expect(page.getByText(/\$59\.99/)).toBeVisible();
    await expect(page.getByText(/\$11\.99/)).toBeVisible();
  });

  test("paywall has no fake 4.8 stars badge", async ({ page }) => {
    await navigateToPaywall(page);
    await expect(page.getByText(/4\.8 stars/i)).not.toBeVisible();
  });

  test("paywall has Privacy and Terms links", async ({ page }) => {
    await navigateToPaywall(page);
    await expect(
      page.getByRole("link", { name: /privacy policy/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /terms of service/i })
    ).toBeVisible();
  });

  test("Start Free Trial calls Stripe Checkout API", async ({ page }) => {
    await mockStripeCheckout(page);

    const checkoutRequest = page.waitForRequest((req) =>
      req.url().includes("/api/stripe/checkout")
    );

    await navigateToPaywall(page);
    await page.getByRole("button", { name: /start free trial/i }).click();

    const req = await checkoutRequest;
    expect(req.method()).toBe("POST");
  });
});
