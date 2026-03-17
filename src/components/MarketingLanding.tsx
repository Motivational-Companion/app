"use client";

import { useRef } from "react";

type Props = {
  onStartQuiz: () => void;
  onGoToDemo: () => void;
};

export default function MarketingLanding({ onStartQuiz, onGoToDemo }: Props) {
  const pricingRef = useRef<HTMLDivElement>(null);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text scroll-smooth">
      {/* ── Hero Section ── */}
      <section className="px-6 pt-14 pb-8 md:pt-24 md:pb-16 max-w-2xl mx-auto text-center">
        {/* Sam avatar */}
        <div className="mx-auto mb-6 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-soft via-accent to-primary-light shadow-lg">
          <span className="font-display text-white text-4xl md:text-5xl select-none">
            S
          </span>
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-4">
          Meet Sam
        </p>

        <h1 className="font-display text-[28px] md:text-[44px] font-semibold leading-[1.2] text-text mb-5">
          You don&rsquo;t need more motivation.
          <br />
          You need someone who actually listens.
        </h1>

        <p className="text-text-soft text-base md:text-lg leading-relaxed max-w-md mx-auto mb-2">
          Sam is an AI companion that hears what you&rsquo;re really going
          through&mdash;then helps you build a plan that actually sticks.
        </p>
        <p className="text-text-muted text-sm mb-8">
          5-minute free session &middot; No signup required
        </p>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block shadow-md"
        >
          Start My Free Session
        </button>

        <p className="text-xs text-text-muted mt-3">
          No credit card. No account. Just talk.
        </p>
      </section>

      {/* ── Social Proof Bar ── */}
      <section className="px-6 py-6 max-w-md mx-auto text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <StarIcon key={i} filled={i <= 4} half={i === 5} />
          ))}
          <span className="text-sm font-semibold text-text ml-1.5">4.8</span>
        </div>
        <p className="text-sm text-text-muted">
          12,000+ people started this week
        </p>
      </section>

      <Divider />

      {/* ── Problem / Agitation ── */}
      <section className="px-6 py-14 md:py-20 max-w-2xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-[34px] font-semibold leading-tight mb-6">
          Sound familiar?
        </h2>

        <div className="space-y-4 text-left max-w-lg mx-auto mb-10">
          <PainPoint text="You start strong on Monday... and lose momentum by Wednesday." />
          <PainPoint text="You've downloaded habit trackers, journals, to-do apps. Nothing sticks." />
          <PainPoint text="You know what you should do. You just can't get yourself to do it." />
          <PainPoint text="You feel like you're spinning in circles — busy, but not moving forward." />
        </div>

        <p className="text-text-soft text-base md:text-lg leading-relaxed max-w-md mx-auto mb-8">
          It&rsquo;s not a discipline problem.
          <br />
          <span className="font-semibold text-text">
            You&rsquo;ve never had someone who actually understands what&rsquo;s
            going on inside your head.
          </span>
        </p>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block shadow-md"
        >
          Talk to Sam Free
        </button>
      </section>

      <Divider />

      {/* ── How It Works ── */}
      <section className="px-6 py-14 md:py-20 max-w-3xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-2 text-center">
          Simple as talking to a friend
        </p>
        <h2 className="font-display text-2xl md:text-[34px] font-semibold text-center mb-12">
          How it works
        </h2>

        <div className="grid gap-10 md:grid-cols-3">
          <Step
            num="1"
            icon={
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            }
            title="Talk it out"
            desc="Open the app and tell Sam what's on your mind — by voice or text. No structure needed. Just be real."
          />
          <Step
            num="2"
            icon={
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                />
              </svg>
            }
            title="Get your plan"
            desc="Sam reflects what you said back to you, then builds a clear, prioritized action list in your own words."
          />
          <Step
            num="3"
            icon={
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Check in daily"
            desc="A quick daily nudge from Sam. Review progress. Adjust your plan. Keep the momentum going."
          />
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onStartQuiz}
            className="text-primary font-semibold text-sm hover:text-primary-dark underline underline-offset-4 transition-colors"
          >
            Try it now — it takes 5 minutes
          </button>
        </div>
      </section>

      <Divider />

      {/* ── Before / After ── */}
      <section className="px-6 py-14 md:py-20 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-[34px] font-semibold text-center mb-4">
          The Sam effect
        </h2>
        <p className="text-text-muted text-sm text-center mb-12 max-w-md mx-auto">
          What changes when someone finally listens
        </p>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {/* Before */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-text-muted/20 flex items-center justify-center">
                <span className="text-text-muted text-sm font-bold">
                  &#x2715;
                </span>
              </div>
              <p className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                Before Sam
              </p>
            </div>
            <ul className="space-y-3">
              <BeforeAfterItem
                variant="before"
                text="Scattered thoughts, no clear priorities"
              />
              <BeforeAfterItem
                variant="before"
                text="Start new systems every week, quit by Friday"
              />
              <BeforeAfterItem
                variant="before"
                text="Overwhelmed by everything on your plate"
              />
              <BeforeAfterItem
                variant="before"
                text="Feel stuck but can't explain why"
              />
            </ul>
          </div>

          {/* After */}
          <div className="bg-card border-2 border-primary/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center">
                <span className="text-success text-sm font-bold">
                  &#x2713;
                </span>
              </div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                After Sam
              </p>
            </div>
            <ul className="space-y-3">
              <BeforeAfterItem
                variant="after"
                text="Clear plan built from your own words"
              />
              <BeforeAfterItem
                variant="after"
                text="Consistent daily progress without burnout"
              />
              <BeforeAfterItem
                variant="after"
                text="Calm focus on what actually matters"
              />
              <BeforeAfterItem
                variant="after"
                text="Finally feel like you're moving forward"
              />
            </ul>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Testimonials ── */}
      <section className="px-6 py-14 md:py-20 max-w-3xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-2">
          Real people, real results
        </p>
        <h2 className="font-display text-2xl md:text-[34px] font-semibold mb-12">
          What people are saying
        </h2>

        <div className="grid gap-6 md:grid-cols-2 text-left">
          <TestimonialCard
            quote="I told Sam I was overwhelmed with work, my relationship, and a move all happening at once. Within 10 minutes I had a priority list that actually made sense. I've been following it for 3 weeks now."
            name="Sarah K."
            detail="Marketing manager, 34"
          />
          <TestimonialCard
            quote="The daily check-ins changed everything. It's like having a friend who remembers what you said yesterday and holds you to it without being annoying about it."
            name="Marcus T."
            detail="Freelance designer, 28"
          />
          <TestimonialCard
            quote="I've spent $400+ on therapy apps that felt generic. Sam asked me one question in our first session that cut deeper than anything I've heard from an app before."
            name="Priya R."
            detail="Graduate student, 26"
          />
          <TestimonialCard
            quote="I was skeptical — another AI thing, right? But I actually cried during my first session. Not because it was sad, but because I finally felt heard. That's not something I expected from technology."
            name="Daniel M."
            detail="Small business owner, 41"
          />
        </div>

        <div className="mt-10">
          <button
            onClick={onStartQuiz}
            className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block shadow-md"
          >
            Start My Free Session
          </button>
        </div>
      </section>

      <Divider />

      {/* ── What Makes Sam Different ── */}
      <section className="px-6 py-14 md:py-20 max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-[34px] font-semibold text-center mb-4">
          Why Sam works when everything else hasn&rsquo;t
        </h2>
        <p className="text-text-muted text-sm text-center mb-12 max-w-md mx-auto">
          Sam isn&rsquo;t another productivity tool. It&rsquo;s the missing
          piece.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          <DifferentiatorCard
            icon={
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            }
            title="Not another to-do app"
            desc="Sam doesn't give you more tasks. It helps you figure out which ones actually matter — then drops the rest."
          />
          <DifferentiatorCard
            icon={
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            }
            title="No toxic positivity"
            desc="Sam doesn't say 'you got this!' when you're struggling. It acknowledges the hard stuff first, then helps you move through it."
          />
          <DifferentiatorCard
            icon={
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            }
            title="Your words, your plan"
            desc="Sam listens to how you describe your life and uses your own language to build your plan. Nothing cookie-cutter."
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 mt-5 max-w-2xl mx-auto">
          <DifferentiatorCard
            icon={
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                />
              </svg>
            }
            title="Voice-first experience"
            desc="Talk naturally like you would to a real person. Sam's voice feels warm and human, not robotic."
          />
          <DifferentiatorCard
            icon={
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            }
            title="Private and safe"
            desc="Your conversations stay between you and Sam. No social features, no sharing, no judgment."
          />
        </div>
      </section>

      <Divider />

      {/* ── Objection Handling / FAQ ── */}
      <section className="px-6 py-14 md:py-20 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl md:text-[34px] font-semibold text-center mb-12">
          Questions you might have
        </h2>

        <div className="space-y-6">
          <FAQItem
            question="Is it really free to try?"
            answer="Yes. Your first session is completely free — no credit card, no signup, no catch. Just open the app and talk to Sam. If you want to keep going after that, plans start at $4.99 per month."
          />
          <FAQItem
            question="Will it actually understand me?"
            answer="Sam doesn't use generic scripts. It listens to your specific situation and responds to what you actually said. Most people are surprised by how 'seen' they feel in their first conversation."
          />
          <FAQItem
            question="I've tried everything. Why would this work?"
            answer="Most tools give you a system and expect you to follow it. Sam starts with you — what you're dealing with, how you think, what's actually blocking you. The plan comes from your reality, not a template."
          />
          <FAQItem
            question="Is this therapy?"
            answer="No. Sam is a motivational companion — think of it as a supportive friend who helps you get organized and stay on track. If you're dealing with clinical mental health issues, we always recommend working with a licensed professional."
          />
          <FAQItem
            question="How is this different from ChatGPT?"
            answer="ChatGPT is a general-purpose tool. Sam is purpose-built for one thing: helping you get unstuck and move forward. It remembers your conversations, tracks your progress, and checks in on you daily. It's a relationship, not a chat window."
          />
        </div>
      </section>

      <Divider />

      {/* ── Pricing ── */}
      <section
        ref={pricingRef}
        className="px-6 py-14 md:py-20 max-w-xl mx-auto text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-light mb-2">
          Simple, honest pricing
        </p>
        <h2 className="font-display text-2xl md:text-[34px] font-semibold mb-3">
          Start free. Stay if it helps.
        </h2>
        <p className="text-text-muted text-sm mb-10 max-w-sm mx-auto">
          Your first session is on us. Then choose the plan that fits. Cancel
          anytime — no questions, no guilt.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          {/* Annual */}
          <div className="bg-card border-2 border-primary rounded-2xl p-6 relative order-1">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-primary rounded-full px-4 py-1 whitespace-nowrap">
              Best value — save 58%
            </span>
            <p className="text-sm text-text-soft mt-2 mb-1 font-medium">
              Annual
            </p>
            <p className="text-3xl font-bold text-text">
              $4.99
              <span className="text-sm font-normal text-text-muted">/month</span>
            </p>
            <p className="text-sm text-text-muted mt-1">
              Billed $59.99/year
            </p>
            <p className="text-xs text-success font-semibold mt-3">
              7-day free trial included
            </p>
          </div>

          {/* Monthly */}
          <div className="bg-card border border-border rounded-2xl p-6 order-2">
            <p className="text-sm text-text-soft mt-2 mb-1 font-medium">
              Monthly
            </p>
            <p className="text-3xl font-bold text-text">
              $11.99
              <span className="text-sm font-normal text-text-muted">/month</span>
            </p>
            <p className="text-sm text-text-muted mt-1">Billed monthly</p>
            <p className="text-xs text-success font-semibold mt-3">
              7-day free trial included
            </p>
          </div>
        </div>

        <p className="text-xs text-text-muted mb-8">
          Both plans include unlimited conversations, daily check-ins, voice
          sessions, and priority list management.
        </p>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block shadow-md"
        >
          Start My Free Session
        </button>
      </section>

      <Divider />

      {/* ── Final CTA ── */}
      <section className="px-6 py-16 md:py-24 max-w-2xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-[34px] font-semibold leading-tight mb-4">
          Your first conversation could change everything.
        </h2>
        <p className="text-text-soft text-base md:text-lg leading-relaxed max-w-md mx-auto mb-3">
          Most people say they felt clearer after just 5 minutes with Sam.
          <br />
          You&rsquo;ve got nothing to lose.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Free. Private. Takes 5 minutes.
        </p>

        <button
          onClick={onStartQuiz}
          className="w-full max-w-xs mx-auto h-14 bg-primary text-white rounded-xl text-lg font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all block shadow-lg mb-4"
        >
          Talk to Sam Now
        </button>

        <button
          onClick={scrollToPricing}
          className="text-xs text-text-muted hover:text-primary transition-colors underline underline-offset-2"
        >
          See pricing
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10 max-w-3xl mx-auto text-center space-y-3 border-t border-border">
        <button
          onClick={onGoToDemo}
          className="text-sm text-primary hover:text-primary-dark underline underline-offset-2 transition-colors"
        >
          Try the tech demo
        </button>
        <p className="text-xs text-text-muted leading-relaxed">
          Text powered by Claude. Voice powered by ElevenLabs.
        </p>
        <p className="text-xs text-text-muted">
          &copy; 2026 Sam &middot; A Motivation Companion by Express AI
        </p>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function Divider() {
  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="border-t border-border" />
    </div>
  );
}

function StarIcon({ filled, half }: { filled: boolean; half?: boolean }) {
  if (half) {
    return (
      <svg className="w-4 h-4" viewBox="0 0 20 20">
        <defs>
          <linearGradient id="halfStar">
            <stop offset="50%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="var(--border)" />
          </linearGradient>
        </defs>
        <path
          fill="url(#halfStar)"
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20">
      <path
        fill={filled ? "var(--accent)" : "var(--border)"}
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function PainPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <span className="text-text-muted text-sm mt-0.5 shrink-0">
        &#x2715;
      </span>
      <p className="text-sm text-text leading-relaxed">{text}</p>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-soft/50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-primary-light bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
          {num}
        </span>
        <h3 className="text-base font-semibold text-text">{title}</h3>
      </div>
      <p className="text-sm text-text-soft leading-relaxed max-w-xs">
        {desc}
      </p>
    </div>
  );
}

function BeforeAfterItem({
  variant,
  text,
}: {
  variant: "before" | "after";
  text: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`text-xs mt-1 shrink-0 ${
          variant === "before" ? "text-text-muted" : "text-success"
        }`}
      >
        {variant === "before" ? "\u2022" : "\u2713"}
      </span>
      <p
        className={`text-sm leading-relaxed ${
          variant === "before" ? "text-text-soft" : "text-text"
        }`}
      >
        {text}
      </p>
    </li>
  );
}

function TestimonialCard({
  quote,
  name,
  detail,
}: {
  quote: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col text-left">
      <div className="flex gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
            <path
              fill="var(--accent)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        ))}
      </div>
      <p className="text-sm text-text leading-relaxed flex-1">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-4">
        <p className="text-xs font-semibold text-text">{name}</p>
        <p className="text-xs text-text-muted">{detail}</p>
      </div>
    </div>
  );
}

function DifferentiatorCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-soft leading-relaxed">{desc}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-card border border-border rounded-2xl overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold text-text list-none">
        {question}
        <svg
          className="w-4 h-4 text-text-muted shrink-0 ml-4 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>
      <div className="px-5 pb-4">
        <p className="text-sm text-text-soft leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}
