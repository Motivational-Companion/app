/**
 * Network mocks for E2E tests.
 *
 * We intercept external service calls at the Playwright level so tests are
 * deterministic and never hit production APIs. Each helper installs a set
 * of routes on a page and returns nothing (side effects only).
 */
import type { Page, Route } from "@playwright/test";

const SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9-]+\.supabase\.co\//;

export type MockSupabaseOptions = {
  /** If set, /auth/v1/user and related endpoints return this user. */
  user?: { id: string; email: string } | null;
  /** If set, the profile subscription_status returned by queries. */
  subscriptionStatus?: "active" | "trialing" | "canceled" | "past_due" | null;
  /** If true, signInWithOtp returns success. Default true. */
  otpSendOk?: boolean;
  /** If true, verifyOtp returns success. Default true. */
  otpVerifyOk?: boolean;
  /** Custom error message returned when otpSendOk=false. */
  otpSendError?: string;
  /** Custom error message returned when otpVerifyOk=false. */
  otpVerifyError?: string;
};

/**
 * Install Supabase auth mocks on the given page. Intercepts:
 * - auth/v1/otp (signInWithOtp)
 * - auth/v1/verify (verifyOtp)
 * - auth/v1/user (getUser, used by useAuth)
 * - rest/v1/profiles (subscription_status lookup in middleware)
 */
export async function mockSupabase(page: Page, options: MockSupabaseOptions = {}) {
  const {
    user = null,
    subscriptionStatus = null,
    otpSendOk = true,
    otpVerifyOk = true,
    otpSendError = "Something went wrong",
    otpVerifyError = "Invalid code",
  } = options;

  await page.route(SUPABASE_URL_PATTERN, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // signInWithOtp. Real API returns { data: {}, error: null } or an
    // error envelope. Supabase JS client wraps this — returning an empty
    // object would leave `data` undefined and break the client.
    if (path.endsWith("/auth/v1/otp") && method === "POST") {
      if (otpSendOk) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ data: {}, error: null }),
        });
      }
      return route.fulfill({
        status: 400,
        body: JSON.stringify({ msg: otpSendError, error_code: "otp_error" }),
      });
    }

    // verifyOtp
    if (path.endsWith("/auth/v1/verify") && method === "POST") {
      if (otpVerifyOk && user) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: user.id,
              email: user.email,
              aud: "authenticated",
              role: "authenticated",
            },
          }),
        });
      }
      return route.fulfill({
        status: 400,
        body: JSON.stringify({ msg: otpVerifyError, error_code: "otp_expired" }),
      });
    }

    // getUser
    if (path.endsWith("/auth/v1/user") && method === "GET") {
      if (user) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            aud: "authenticated",
            role: "authenticated",
          }),
        });
      }
      return route.fulfill({
        status: 401,
        body: JSON.stringify({ msg: "not authenticated" }),
      });
    }

    // profiles query (used by middleware subscription gate)
    if (path.includes("/rest/v1/profiles")) {
      if (user && subscriptionStatus) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([{ subscription_status: subscriptionStatus }]),
        });
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    }

    // Any other Supabase call: fall through to a 200 empty response
    return route.fulfill({
      status: 200,
      body: JSON.stringify({}),
    });
  });
}

/**
 * Mock the Stripe Checkout session creation endpoint.
 * Redirects the client to a mocked success page.
 */
export async function mockStripeCheckout(page: Page) {
  await page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: `${new URL(page.url()).origin}/success?session_id=cs_test_mock_session`,
      }),
    });
  });
}

/**
 * Mock the Stripe session retrieval endpoint used by the success page.
 */
export async function mockStripeSession(
  page: Page,
  options: { email?: string; customerId?: string } = {}
) {
  const {
    email = "buyer@example.com",
    customerId = "cus_test_mock",
  } = options;

  await page.route("**/api/stripe/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        customer_id: customerId,
        customer_email: email,
        subscription_id: "sub_test_mock",
        payment_status: "paid",
      }),
    });
  });
}

/**
 * Mock the Claude chat streaming endpoint with a simple scripted response.
 */
export async function mockClaudeChat(page: Page, responseText = "Hi, I'm Sam.") {
  await page.route("**/api/chat", async (route) => {
    const sseBody = [
      `data: ${JSON.stringify({ type: "text", content: responseText })}\n\n`,
      `data: [DONE]\n\n`,
    ].join("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sseBody,
    });
  });
}
