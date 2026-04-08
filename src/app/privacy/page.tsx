export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:py-12 md:px-4">
      <div className="w-full max-w-[640px] px-6 py-10 md:rounded-3xl md:shadow-xl md:border md:border-border bg-card">
        <h1 className="font-display text-3xl font-semibold text-text mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Last updated: April 8, 2026
        </p>

        <div className="prose prose-sm text-text-soft space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-text">
              What we collect
            </h2>
            <p>
              When you use our app, we collect information you provide during the
              onboarding quiz (your goals, preferences, and coaching style),
              conversation transcripts with Sam (our AI coaching companion), your
              email address and account credentials, and payment information
              processed securely through Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              How we use your data
            </h2>
            <p>
              Your conversation data is used to provide personalized coaching
              through Sam, powered by Anthropic&apos;s Claude AI. Quiz responses
              personalize your experience and help Sam understand your goals. We
              use anonymized, aggregated analytics (via PostHog) to improve the
              product. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Third-party services
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Anthropic (Claude)</strong> processes your conversations
                to provide AI coaching responses.
              </li>
              <li>
                <strong>Stripe</strong> securely handles all payment processing.
                We never store your credit card details.
              </li>
              <li>
                <strong>Supabase</strong> hosts your account data and
                conversation history.
              </li>
              <li>
                <strong>PostHog</strong> collects anonymized product analytics.
              </li>
              <li>
                <strong>Meta (Facebook)</strong> receives anonymized conversion
                events for advertising optimization.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Data retention</h2>
            <p>
              Your conversation history and task data are retained for as long as
              your account is active. You can request deletion of your data at
              any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Your rights</h2>
            <p>
              You have the right to access, correct, or delete your personal
              data. You can export your conversation history and task data. To
              exercise these rights, contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Contact</h2>
            <p>
              For privacy questions or data requests, email{" "}
              <a
                href="mailto:privacy@expressai.co"
                className="text-primary hover:text-primary-dark"
              >
                privacy@expressai.co
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <a href="/" className="text-sm text-primary hover:text-primary-dark">
            &larr; Back to app
          </a>
        </div>
      </div>
    </div>
  );
}
