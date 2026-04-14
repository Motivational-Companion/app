"use client";

import Link from "next/link";

type Props = {
  onStartQuiz: () => void;
  onGoToDemo?: () => void;
};

export default function MarketingLanding({ onStartQuiz }: Props) {
  return (
    <div className="min-h-[100dvh] bg-bg text-text scroll-smooth">
      {/* ── Hero ── */}
      <section className="px-6 pt-10 pb-16 md:pt-20 md:pb-24 max-w-3xl mx-auto text-center">
        <div className="mx-auto mb-8 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-soft via-accent to-primary-light shadow-lg">
          <span className="font-display text-white text-5xl md:text-6xl select-none">
            S
          </span>
        </div>

        <h1 className="font-display text-[32px] md:text-[44px] font-semibold leading-tight text-text mb-4">
          Meet your motivation companion.
        </h1>
        <p className="text-text-soft text-lg md:text-xl leading-relaxed max-w-md mx-auto mb-3">
          An AI coach that listens first, then helps you take action.
        </p>
        <p className="text-text-muted text-sm mb-8">
          5-minute free session &middot; No signup required
        </p>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block"
        >
          Start My Free Session
        </button>

        <div className="mt-12 grid gap-6 md:grid-cols-3 text-left max-w-lg md:max-w-2xl mx-auto">
          <ValueProp
            emoji="&#127919;"
            title="Get clear on what matters"
            desc="Turn mental chaos into a simple plan"
          />
          <ValueProp
            emoji="&#128172;"
            title="Just talk, it listens"
            desc="No forms. Share in your own words"
          />
          <ValueProp
            emoji="&#128276;"
            title="Daily nudges that help"
            desc="Gentle check-ins tied to your priorities"
          />
        </div>
      </section>

      <Divider />

      {/* ── How it works ── */}
      <section className="px-6 py-16 md:py-24 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-center mb-12">
          How it works
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          <Step
            num="1"
            title="Talk it out"
            desc="Open the app and tell Sam what's on your mind. No structure needed."
          />
          <Step
            num="2"
            title="Get your plan"
            desc="Sam reflects what you said and builds a clear, prioritized action list."
          />
          <Step
            num="3"
            title="Check in daily"
            desc="A quick daily nudge. Review progress. Adjust. Keep moving."
          />
        </div>
      </section>

      <Divider />

      {/* ── Social proof ── */}
      <section className="px-6 py-16 md:py-24 max-w-3xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-2">
          Join the community
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-12">
          12,000+ people started this week
        </h2>
        <div className="grid gap-6 md:grid-cols-3 text-left">
          <TestimonialCard
            quote="I've tried every productivity app out there. This is the first one that actually understood what I was going through."
            name="Sarah K."
          />
          <TestimonialCard
            quote="The daily check-ins changed everything. It's like having a friend who remembers what you said yesterday."
            name="Marcus T."
          />
          <TestimonialCard
            quote="I came in feeling completely lost. 20 minutes later I had a clear plan. That's never happened before."
            name="Priya R."
          />
        </div>
      </section>

      <Divider />

      {/* ── Differentiators ── */}
      <section className="px-6 py-16 md:py-24 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-center mb-12">
          What makes Sam different
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <DifferentiatorCard
            title="Not another to-do app"
            desc="Sam doesn't give you more tasks. Sam helps you figure out which ones actually matter."
          />
          <DifferentiatorCard
            title="No toxic positivity"
            desc="Real conversations about real challenges. Acknowledgment before action."
          />
          <DifferentiatorCard
            title="Your words, your plan"
            desc="Sam uses your own language to build your priorities. Nothing generic."
          />
        </div>
      </section>

      <Divider />

      {/* ── Pricing preview ── */}
      <section className="px-6 py-16 md:py-24 max-w-xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-2">
          Simple pricing
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-3">
          Start free for 7 days
        </h2>
        <p className="text-text-muted text-sm mb-10">
          Cancel anytime. No questions asked.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-10">
          <div className="bg-card border-2 border-primary rounded-2xl p-6 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-primary rounded-full px-4 py-1">
              Best value
            </span>
            <p className="text-2xl font-bold text-text mt-1">
              $4.99
              <span className="text-sm font-normal text-text-muted">/month</span>
            </p>
            <p className="text-sm text-text-soft mt-1">Billed $59.99/year</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="text-2xl font-bold text-text">
              $11.99
              <span className="text-sm font-normal text-text-muted">/month</span>
            </p>
            <p className="text-sm text-text-soft mt-1">Billed monthly</p>
          </div>
        </div>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block"
        >
          Start My Free Session
        </button>
      </section>

      <Divider />

      {/* ── Footer ── */}
      <footer className="px-6 py-12 max-w-3xl mx-auto text-center space-y-4">
        <p className="text-sm text-text-soft">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
        <div className="flex justify-center gap-4 text-xs text-text-muted">
          <Link href="/privacy" className="hover:text-text-soft transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text-soft transition-colors">
            Terms
          </Link>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Text powered by Claude. Voice powered by ElevenLabs.
        </p>
        <p className="text-xs text-text-muted">
          &copy; 2026 Motivation Companion
        </p>
      </footer>
    </div>
  );
}

function Divider() {
  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="border-t border-border" />
    </div>
  );
}

function ValueProp({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center">
      <span
        className="text-2xl shrink-0 md:text-3xl md:mb-1"
        dangerouslySetInnerHTML={{ __html: emoji }}
      />
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-sm text-text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <span className="text-primary text-sm font-bold">{num}</span>
      </div>
      <h3 className="text-base font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-soft leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}

function TestimonialCard({ quote, name }: { quote: string; name: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
      <p className="text-sm text-text leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
      <p className="text-xs text-text-muted mt-4 font-medium">&mdash; {name}</p>
    </div>
  );
}

function DifferentiatorCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-soft leading-relaxed">{desc}</p>
    </div>
  );
}
