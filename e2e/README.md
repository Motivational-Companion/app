# E2E Tests

End-to-end tests for the Motivational Companion app using Playwright. These
tests exercise the full user flows as a real browser would, with external
services (Stripe, Supabase, Claude API) mocked at the network layer so
runs are fast, deterministic, and free.

## First-time setup

Install the Chromium browser that Playwright uses:

```bash
npm run test:e2e:install
```

This downloads ~150MB of browser binaries. You only need to do this once
per machine (or when Playwright bumps the browser version).

## Running the tests

Headless, full run:

```bash
npm run test:e2e
```

Interactive UI mode (recommended for debugging):

```bash
npm run test:e2e:ui
```

A single spec file:

```bash
npx playwright test e2e/landing.spec.ts
```

Watch a test run in a headed browser:

```bash
npx playwright test --headed --project=chromium
```

Show the last HTML report:

```bash
npx playwright show-report
```

## What's covered

| Spec | What it tests |
|---|---|
| `landing.spec.ts` | Marketing landing page, CTA navigation, no fake social proof, Privacy/Terms pages |
| `quiz-funnel.spec.ts` | Quiz onboarding flow, first question options, paywall screen, Stripe checkout initiation |
| `post-purchase.spec.ts` | Success page auto-sends OTP, shows trial pill, email display, resend cooldown, "use different email", error states |

## What's NOT covered by E2E (and why)

**The subscription gate in `src/middleware.ts` is NOT covered by Playwright.**

Next.js middleware runs server-side. Playwright's `page.route()` only
intercepts browser-level requests, so it cannot mock the Supabase calls
that middleware makes during request handling. Any Playwright test that
hits `/chat` would hit the real production Supabase project.

Instead, the route-matching logic is extracted into `src/lib/routes.ts`
and covered by a Vitest unit test at `src/test/routes.test.ts`. The
Supabase integration inside the middleware is a narrow bit of glue code
and is verified manually via the end-to-end checkout flow.

If the middleware logic grows more complex, consider:
- Moving more of it into `src/lib/routes.ts` (pure, unit-testable) OR
- Setting up a dedicated test Supabase project and running middleware
  tests as a separate `playwright test --project=integration` pass

## Mocking strategy

All external services are intercepted at the network layer via
`page.route()`. The mock helpers live in `e2e/fixtures/mocks.ts`:

- **`mockSupabase(page, opts)`** — intercepts `https://*.supabase.co/*`.
  Handles `signInWithOtp`, `verifyOtp`, `getUser`, and `profiles` queries.
  Pass `user`, `subscriptionStatus`, and success/error flags to
  configure behavior.
- **`mockStripeCheckout(page)`** — stubs `/api/stripe/checkout` to
  redirect to `/success?session_id=cs_test_mock_session`.
- **`mockStripeSession(page, opts)`** — stubs `/api/stripe/session` to
  return a mock Stripe session with the given email.
- **`mockClaudeChat(page, text)`** — stubs `/api/chat` with a fake SSE
  response containing `text`.

Example:

```ts
import { test, expect } from "@playwright/test";
import { mockSupabase, mockStripeSession } from "./fixtures/mocks";

test("my flow", async ({ page }) => {
  await mockSupabase(page, {
    user: { id: "u1", email: "test@example.com" },
    subscriptionStatus: "trialing",
  });
  await mockStripeSession(page, { email: "test@example.com" });

  await page.goto("/chat");
  await expect(page).toHaveURL("/chat");
});
```

## CI integration

The Playwright config handles CI automatically:
- `forbidOnly: true` in CI (prevents accidentally-committed `.only` tests)
- 2 retries on failure
- GitHub reporter format
- Single worker (deterministic ordering)

Add to your CI pipeline:

```bash
npm ci
npm run test:e2e:install
npm run test:e2e
```

## Adding a new test

1. Create `e2e/<feature>.spec.ts`
2. Import mock helpers from `./fixtures/mocks`
3. Use `test.describe` to group related tests
4. Use `expect(page).toHaveURL(...)` and `page.getByRole/getByText/getByLabel`
   for assertions
5. Run locally with `npm run test:e2e:ui` to iterate

Per the CLAUDE.md testing requirements, every new feature should ship with
both a Vitest unit test AND a Playwright E2E test covering the user-facing
flow.
