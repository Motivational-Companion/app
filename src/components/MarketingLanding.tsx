"use client";

type Props = {
  onStartQuiz: () => void;
  onGoToDemo?: () => void;
};

export default function MarketingLanding({ onStartQuiz }: Props) {
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] min-h-[100dvh] md:min-h-0 flex flex-col px-6 pb-8 md:rounded-3xl md:shadow-xl md:border md:border-border">
        <div className="text-center pt-10">
          {/* MC avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-semibold text-xl">MC</span>
          </div>

          <h1 className="font-display text-[26px] font-semibold leading-[1.25] text-text">
            Meet your
            <br />
            motivation companion.
          </h1>

          <p className="text-[15px] text-text-soft mt-3 mb-1 leading-relaxed">
            An AI coach that <strong>listens first</strong>,
            <br />
            then helps you <strong>take action</strong>.
          </p>

          <p className="text-xs text-text-muted mb-6">
            5-minute free session &middot; No signup required
          </p>
        </div>

        {/* Value props card */}
        <div className="bg-card rounded-2xl p-[18px] mb-3.5 shadow-sm">
          <div className="flex gap-3 mb-3">
            <span className="text-lg shrink-0">&#127919;</span>
            <div>
              <h3 className="font-semibold text-[15px] text-text">
                Get clear on what matters
              </h3>
              <p className="text-xs text-text-muted">
                Turn mental chaos into a simple plan
              </p>
            </div>
          </div>
          <div className="flex gap-3 mb-3">
            <span className="text-lg shrink-0">&#128172;</span>
            <div>
              <h3 className="font-semibold text-[15px] text-text">
                Just talk &mdash; it listens
              </h3>
              <p className="text-xs text-text-muted">
                No forms. Share in your own words
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-lg shrink-0">&#128276;</span>
            <div>
              <h3 className="font-semibold text-[15px] text-text">
                Daily nudges that help
              </h3>
              <p className="text-xs text-text-muted">
                Gentle check-ins tied to your priorities
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <button
          onClick={onStartQuiz}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Start My Free Session
        </button>

        <p className="text-xs text-text-muted text-center mt-2">
          AI-powered coaching. 7 days free.
        </p>

        <p className="text-sm text-text-soft text-center mt-5">
          Already have an account?{" "}
          <a
            href="/signin"
            className="text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            Sign in
          </a>
        </p>

        <div className="flex justify-center gap-4 mt-5">
          <a href="/privacy" className="text-xs text-text-muted hover:text-text-soft transition-colors">
            Privacy
          </a>
          <a href="/terms" className="text-xs text-text-muted hover:text-text-soft transition-colors">
            Terms
          </a>
        </div>
      </div>
    </div>
  );
}
