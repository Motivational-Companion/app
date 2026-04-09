# Motivational Companion — Engineering Guidelines

Production SaaS app. Treat every change with production engineering discipline.

## Workflow (required)

For all non-trivial work:

1. **Create a feature branch** — never commit directly to `main`
2. **Run `/simplify`** on changed files before requesting review
3. **Run `/code-review`** (or code-reviewer agent) on the diff
4. **Open a pull request** with a clear summary of what and why
5. **Merge only after review passes** and CI is green

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
