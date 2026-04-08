export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:py-12 md:px-4">
      <div className="w-full max-w-[640px] px-6 py-10 md:rounded-3xl md:shadow-xl md:border md:border-border bg-card">
        <h1 className="font-display text-3xl font-semibold text-text mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Last updated: April 8, 2026
        </p>

        <div className="prose prose-sm text-text-soft space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-text">The service</h2>
            <p>
              This app provides AI-powered coaching through a conversational
              companion named Sam. Sam uses artificial intelligence to help you
              clarify your goals, organize your thoughts, and build
              accountability habits. Sam is not a licensed therapist, counselor,
              or medical professional. The service is for personal development
              and productivity purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Subscriptions and billing
            </h2>
            <p>
              We offer monthly and annual subscription plans with a 7-day free
              trial. You will not be charged during the trial period. After the
              trial, your selected plan will be billed automatically. You can
              cancel at any time through your account settings. Cancellation
              takes effect at the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Refunds
            </h2>
            <p>
              If you cancel during your free trial, you will not be charged. For
              paid subscriptions, we do not offer refunds for partial billing
              periods. If you believe you were charged in error, contact us and
              we will review your case.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Your content
            </h2>
            <p>
              You retain ownership of all content you share in conversations
              with Sam, including your goals, tasks, and personal reflections.
              By using the service, you grant us a limited license to process
              this content through our AI systems solely to provide the coaching
              experience. We do not use your personal conversations to train AI
              models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Acceptable use
            </h2>
            <p>
              You agree to use the service for its intended purpose of personal
              development and productivity coaching. You must be at least 18
              years old to use this service. Do not use Sam as a substitute for
              professional medical, psychological, or legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Limitation of liability
            </h2>
            <p>
              The service is provided &ldquo;as is&rdquo; without warranties of
              any kind. We are not liable for any decisions you make based on
              conversations with Sam. Our total liability is limited to the
              amount you paid for the service in the 12 months preceding the
              claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">
              Changes to these terms
            </h2>
            <p>
              We may update these terms from time to time. We will notify you of
              material changes via email or in-app notification. Continued use
              of the service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Contact</h2>
            <p>
              For questions about these terms, email{" "}
              <a
                href="mailto:support@expressai.co"
                className="text-primary hover:text-primary-dark"
              >
                support@expressai.co
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
