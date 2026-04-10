# Motivational Companion — Engineering Guidelines

Production SaaS app. Treat every change with production engineering discipline.

## Workflow (required)

For all non-trivial work:

1. **Create a feature branch** — never commit directly to `main`
2. **Implement the change** on the branch (code + tests)
3. **Run `/simplify`** on the changed files. Address real findings. This step
   is **mandatory before opening a PR** — not after, not optional.
4. **Run `/code-review`** (or code-reviewer agent) on the full diff. Address
   real findings. Also mandatory before opening a PR.
5. **Run the full test suite** (`npx vitest run`) and the production build
   (`npx next build`). Both must pass.
6. **Open the pull request** with a clear summary, test plan, and manual
   verification checklist.
7. **Merge only after** review passes and CI is green.

**The simplify + code-review gates are non-negotiable.** Do not open a PR
without them. They catch race conditions, memory leaks, dead state, and
duplication before they hit main. Skipping them means the PR is incomplete.

**Exceptions (direct-to-main ok):**
- Typo fixes
- Config-only changes under 5 lines
- Emergency rollback

When in doubt, use the branch flow.

## Why this matters

- Paying users are on the live site
- Paid ad traffic is being evaluated for conversion
- Alec (investor) is evaluating execution quality
- Main branch should always be deployable
- Reversibility matters when something breaks

## Code quality standards

- TypeScript must compile clean (`npx tsc --noEmit`)
- Tests must pass (`npx vitest run`)
- Production build must succeed (`npx next build`)
- No `any` types without justification
- No dead code or commented-out blocks
- Error states must be handled at user-facing boundaries

## Testing requirements (required for every feature)

Every new feature or material change must ship with:

1. **Automated unit/component tests** (Vitest + React Testing Library)
   - Cover the happy path, at least one error path, and any conditional
     branching logic
   - Live under `src/test/` following existing naming conventions
   - Run with `npm test` or `npx vitest run`

2. **End-to-end test** (Playwright)
   - Exercise the feature as a user would (click, type, navigate)
   - Assert on observable outcomes (DOM, URL, network calls)
   - Live under `e2e/` following existing naming conventions
   - Use the mock helpers in `e2e/fixtures/mocks.ts` for Stripe, Supabase,
     and Claude — never hit production APIs from tests
   - Run with `npm run test:e2e` or `npm run test:e2e:ui`
   - See `e2e/README.md` for patterns

3. **Manual verification checklist** in the PR description
   - Step-by-step flow the reviewer can run locally
   - Expected vs actual results for each step

No feature merges without all three. This is non-negotiable — we are
running paid ad traffic against this product. Regressions cost money and
credibility.

## Key architectural facts

- **ICP:** Women 25-45 seeking clarity on goals and tasks
- **Funnel:** Meta/TikTok ad → quiz (14 screens) → paywall → Stripe Checkout → AuthGate → Dashboard
- **Subscription gate:** `middleware.ts` enforces `subscription_status IN ('active','trialing')` for `/chat*` routes
- **Auth:** Supabase auth via AuthGate component
- **Payments:** Stripe Checkout (live mode) with 7-day trial
- **AI:** Claude Sonnet via Anthropic SDK (text) + ElevenLabs Conversational AI (voice)
- **Analytics:** PostHog + Meta Pixel via utility functions in `lib/analytics.tsx` and `lib/meta-pixel.tsx`
- **Storage:** Supabase for auth'd users, localStorage fallback for anonymous/demo
- **Legal:** `/privacy` and `/terms` pages required for Meta ads compliance

## What NOT to build (per Alec's feedback)

- LLC/entity formation (deferred until funded)
- Multi-funnel personas
- Voice tier metering
- Model tiering (Haiku vs Sonnet optimization)
- Weekly summaries or gamification
- Push notifications (email-first)

The priority is validating funnel economics, not building features.
