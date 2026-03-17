"use client";

import { useState, useCallback } from "react";

type QuizData = {
  bringYouHere: string;
  mentalSpace: string[];
  obstacles: string[];
  triedBefore: string[];
  vision: string;
  checkinTime: string;
  priorityArea: string;
  coachingStyle: string;
  selectedPlan: "annual" | "monthly";
};

type Props = {
  onCheckout: (plan: "annual" | "monthly") => void;
};

export default function QuizFunnel({ onCheckout }: Props) {
  const [screen, setScreen] = useState(0);
  const [data, setData] = useState<QuizData>({
    bringYouHere: "",
    mentalSpace: [],
    obstacles: [],
    triedBefore: [],
    vision: "",
    checkinTime: "",
    priorityArea: "",
    coachingStyle: "",
    selectedPlan: "annual",
  });
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const progressMap: Record<number, number> = {
    0: 8,
    1: 14,
    2: 22,
    3: 34,
    4: 44,
    5: 54,
    6: 64,
    7: 74,
    8: 82,
    9: 90,
    10: 96,
    11: 100,
  };

  const progress = progressMap[screen] ?? 0;

  const goTo = useCallback(
    (next: number) => {
      if (transitioning) return;
      setDirection(next > screen ? "forward" : "back");
      setTransitioning(true);
      setTimeout(() => {
        setScreen(next);
        setTransitioning(false);
      }, 250);
    },
    [screen, transitioning]
  );

  const selectSingle = (
    field: keyof QuizData,
    value: string,
    nextScreen: number
  ) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => goTo(nextScreen), 300);
  };

  const toggleMulti = (
    field: "mentalSpace" | "obstacles" | "triedBefore",
    value: string
  ) => {
    setData((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const handleCheckout = () => {
    try {
      localStorage.setItem("onboarding_data", JSON.stringify(data));
    } catch {
      // localStorage unavailable -- continue without saving
    }
    onCheckout(data.selectedPlan);
  };

  // Reflective text for Screen 2 based on Screen 1 selection
  const reflectionBubbles: Record<string, string> = {
    overwhelmed:
      "I hear you. Feeling overwhelmed usually means you care about a lot of things and they\u2019re all competing for attention. Let\u2019s untangle that.",
    stuck:
      "I hear you. Feeling stuck usually means there\u2019s something real in the way. Let\u2019s figure out what it is.",
    clarity:
      "I hear you. Needing clarity is actually a great sign. It means you\u2019re ready to focus. Let\u2019s figure out where.",
    accountable:
      "I hear you. Wanting accountability means you already know what matters. You just need someone in your corner.",
  };

  // ─── Screen 0: Sam Welcome ────────────────────────────────────────────
  if (screen === 0) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <div className="flex flex-col items-center text-center mt-4">
          {/* Sam avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5">
            <span className="text-white font-display text-3xl">S</span>
          </div>

          <SamBubble
            text={
              <>
                Hey! I&apos;m Sam. {"\uD83D\uDC4B"} I&apos;m here to help you
                figure out what you already know you need to do. Think of this as
                a 5-minute conversation with a really good listener. Everything
                stays between us.
              </>
            }
          />

          <div className="w-full space-y-3 mt-8">
            <button
              onClick={() => goTo(1)}
              className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
            >
              I&apos;m ready, let&apos;s go
            </button>
            <button
              onClick={() => goTo(1)}
              className="w-full h-12 border border-border rounded-xl text-sm text-primary font-medium hover:bg-border/30 transition-all"
            >
              Tell me more first
            </button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  // ─── Screen 1: What brings you here? (single select, auto-advance) ───
  if (screen === 1) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(0)} onSkip={() => goTo(2)} />
        <SamBubble text="Let's start simple." />
        <h2 className="font-display text-xl font-medium text-text mt-3 mb-1">
          What brings you here today?
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Pick the one that fits best.
        </p>
        <div className="space-y-3">
          <OptionCard
            icon={"\uD83C\uDF0A"}
            title="I feel overwhelmed"
            sub="Too much to do, not sure where to start"
            selected={data.bringYouHere === "overwhelmed"}
            onClick={() => selectSingle("bringYouHere", "overwhelmed", 2)}
          />
          <OptionCard
            icon={"\uD83D\uDD2C"}
            title="I feel stuck"
            sub="I know what I want but can't move forward"
            selected={data.bringYouHere === "stuck"}
            onClick={() => selectSingle("bringYouHere", "stuck", 2)}
          />
          <OptionCard
            icon={"\uD83D\uDCAD"}
            title="I need clarity"
            sub="Not sure what my priorities should be"
            selected={data.bringYouHere === "clarity"}
            onClick={() => selectSingle("bringYouHere", "clarity", 2)}
          />
          <OptionCard
            icon={"\u26A1"}
            title="I need accountability"
            sub="I know what to do \u2014 I just don't do it"
            selected={data.bringYouHere === "accountable"}
            onClick={() => selectSingle("bringYouHere", "accountable", 2)}
          />
        </div>
      </ScreenShell>
    );
  }

  // ─── Screen 2: Reflection + What's on your mind? (multi-select) ───────
  if (screen === 2) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(1)} onSkip={() => goTo(3)} />
        <SamBubble
          text={
            reflectionBubbles[data.bringYouHere] ||
            "Thanks for sharing that. Let\u2019s dig a little deeper."
          }
        />
        <h3 className="font-semibold text-sm text-text mt-3 mb-1">
          What&apos;s taking up the most mental space?
        </h3>
        <p className="text-xs text-text-muted mb-3">Select all that apply.</p>
        <div className="space-y-2">
          {[
            ["\uD83D\uDCBC", "Work or career stress"],
            ["\uD83D\uDC96", "Relationships or family"],
            ["\uD83D\uDCAA", "Health, fitness, or energy"],
            ["\uD83C\uDF31", "A personal project or goal"],
            ["\uD83D\uDCB0", "Finances or money worries"],
            ["\uD83E\uDDE0", "General overwhelm \u2014 all of it"],
          ].map(([icon, item]) => (
            <CompactOption
              key={item}
              icon={icon}
              label={item}
              selected={data.mentalSpace.includes(item)}
              onClick={() => toggleMulti("mentalSpace", item)}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(3)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6"
        >
          Continue
        </button>
      </ScreenShell>
    );
  }

  // ─── Screen 3: What keeps getting in the way? (multi-select) ──────────
  if (screen === 3) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(2)} onSkip={() => goTo(4)} />
        <h2 className="font-display text-xl font-medium text-text mb-1">
          What keeps getting in the way?
        </h2>
        <p className="text-sm text-text-muted mb-4">Most people pick 2-3.</p>
        <div className="space-y-2">
          {[
            ["\u23F0", "Not enough time"],
            ["\uD83D\uDCAB", "Low energy or motivation"],
            ["\uD83E\uDDE0", "Overthinking everything"],
            ["\uD83D\uDC65", "Other people\u2019s needs come first"],
            ["\uD83D\uDE36", "Fear of failure or judgment"],
            ["\uD83C\uDF00", "I don\u2019t know where to start"],
          ].map(([icon, item]) => (
            <CompactOption
              key={item}
              icon={icon}
              label={item}
              selected={data.obstacles.includes(item)}
              onClick={() => toggleMulti("obstacles", item)}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(4)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6"
        >
          Continue
        </button>
      </ScreenShell>
    );
  }

  // ─── Screen 4: What have you tried? (multi-select) ────────────────────
  if (screen === 4) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(3)} onSkip={() => goTo(5)} />
        <SamBubble text="That makes sense. You're not broken \u2014 you just don't have a system that works with your brain." />
        <h3 className="font-semibold text-sm text-text mt-3 mb-1">
          What have you tried before?
        </h3>
        <p className="text-xs text-text-muted mb-3">Select any that apply.</p>
        <div className="space-y-2">
          {[
            ["\uD83D\uDCDD", "To-do lists or planners"],
            ["\uD83D\uDCF1", "Habit tracker apps"],
            ["\uD83D\uDCD6", "Journaling"],
            ["\uD83D\uDDE3\uFE0F", "Therapy or coaching"],
            ["\uD83C\uDFA5", "YouTube / podcasts / books"],
            ["\uD83E\uDD37", "Nothing yet \u2014 this is my first try"],
          ].map(([icon, label]) => (
            <CompactOption
              key={label}
              icon={icon}
              label={label}
              selected={data.triedBefore.includes(label)}
              onClick={() => toggleMulti("triedBefore", label)}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(5)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6"
        >
          Continue
        </button>
      </ScreenShell>
    );
  }

  // ─── Screen 5: Vision Question (text input) ───────────────────────────
  if (screen === 5) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(4)} onSkip={() => goTo(6)} />
        <div className="text-center mb-4">
          <div className="text-4xl mb-3">&#10024;</div>
          <h2 className="font-display text-xl font-medium text-text">
            Imagine it&apos;s 90 days
            <br />
            from now...
          </h2>
          <p className="text-sm text-text-soft mt-2">
            You wake up feeling <strong>calm, clear, and in control</strong>.
          </p>
        </div>
        <p className="font-medium text-sm text-text mb-2">
          What does that life look like for you?
        </p>
        <textarea
          value={data.vision}
          onChange={(e) =>
            setData((prev) => ({ ...prev, vision: e.target.value }))
          }
          placeholder="What are your mornings like? What have you accomplished? How do you feel?"
          className="w-full h-28 p-4 bg-card border border-border rounded-xl text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-text-muted text-center mt-2">
          This shapes your entire coaching plan &mdash; even a sentence helps.
        </p>
        <button
          onClick={() => goTo(6)}
          disabled={data.vision.trim().length < 1}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6 disabled:bg-border disabled:text-text-muted disabled:cursor-default disabled:transform-none"
        >
          Continue
        </button>
        <button
          onClick={() => {
            setData((prev) => ({ ...prev, vision: "" }));
            goTo(6);
          }}
          className="w-full text-center text-sm text-text-muted hover:text-text-soft transition-colors mt-3"
        >
          Skip for now
        </button>
      </ScreenShell>
    );
  }

  // ─── Screen 6: AI Synthesis (no question, just value) ─────────────────
  if (screen === 6) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(5)} />
        <SamBubble
          text={
            <>
              <strong>Here&apos;s what I&apos;m hearing:</strong>
              <br />
              <br />
              You have a <strong>clear vision</strong> of who you want to be
              &mdash; but the gap between here and there feels overwhelming.
              You&apos;ve tried things before and{" "}
              <strong>nothing sticks</strong>.
              <br />
              <br />
              What if the problem was <strong>never motivation?</strong> What if
              you just needed a better system for turning chaos into clarity
              &mdash; and <strong>someone to check in</strong> along the way?
            </>
          }
        />
        <div className="mt-3">
          <SamBubble
            text={
              <>
                I think I can help.{" "}
                <strong>A few quick preferences</strong> and I&apos;ll build your
                plan.
              </>
            }
          />
        </div>
        <button
          onClick={() => goTo(7)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-8"
        >
          Build my plan
        </button>
      </ScreenShell>
    );
  }

  // ─── Screen 7: Check-in Time (single select) ─────────────────────────
  if (screen === 7) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(6)} onSkip={() => goTo(8)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-2">Quick preferences</p>
        <h2 className="font-display text-xl font-medium text-text mb-1">
          When do you need me most?
        </h2>
        <p className="text-sm text-text-soft mb-4">
          I&apos;ll send a <strong>gentle check-in</strong> at this time each
          day.
        </p>
        <div className="space-y-3">
          <OptionCard
            icon={"\uD83C\uDF05"}
            title="Morning"
            sub="Start the day with clarity"
            selected={data.checkinTime === "morning"}
            onClick={() => selectSingle("checkinTime", "morning", 8)}
          />
          <OptionCard
            icon={"\u2600\uFE0F"}
            title="Midday"
            sub="Reset when energy dips"
            selected={data.checkinTime === "midday"}
            onClick={() => selectSingle("checkinTime", "midday", 8)}
          />
          <OptionCard
            icon={"\uD83C\uDF03"}
            title="Evening"
            sub="Reflect and set up tomorrow"
            selected={data.checkinTime === "evening"}
            onClick={() => selectSingle("checkinTime", "evening", 8)}
          />
        </div>
      </ScreenShell>
    );
  }

  // ─── Screen 8: Priority Area (single select) ─────────────────────────
  if (screen === 8) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(7)} onSkip={() => goTo(9)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-2">Almost there</p>
        <h2 className="font-display text-xl font-medium text-text mb-1">
          Which area should we
          <br />
          focus on first?
        </h2>
        <p className="text-sm text-text-soft mb-4">
          You can <strong>expand later</strong> &mdash; pick one to start.
        </p>
        <div className="space-y-3">
          <OptionCard
            icon={"\uD83D\uDCBC"}
            title="Career & work"
            sub="Productivity, projects, growth"
            selected={data.priorityArea === "career"}
            onClick={() => selectSingle("priorityArea", "career", 9)}
          />
          <OptionCard
            icon={"\uD83D\uDC96"}
            title="Health & wellbeing"
            sub="Exercise, sleep, energy"
            selected={data.priorityArea === "health"}
            onClick={() => selectSingle("priorityArea", "health", 9)}
          />
          <OptionCard
            icon={"\uD83C\uDF31"}
            title="Personal growth"
            sub="Habits, learning, side projects"
            selected={data.priorityArea === "growth"}
            onClick={() => selectSingle("priorityArea", "growth", 9)}
          />
          <OptionCard
            icon={"\uD83D\uDC6A"}
            title="Relationships & family"
            sub="Quality time, boundaries"
            selected={data.priorityArea === "relationships"}
            onClick={() => selectSingle("priorityArea", "relationships", 9)}
          />
        </div>
      </ScreenShell>
    );
  }

  // ─── Screen 9: Coaching Style (single select) ─────────────────────────
  if (screen === 9) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <TopRow onBack={() => goTo(8)} onSkip={() => goTo(10)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-2">Last one</p>
        <h2 className="font-display text-xl font-medium text-text mb-4">
          What kind of support
          <br />
          works best for you?
        </h2>
        <div className="space-y-3">
          <OptionCard
            icon={"\uD83D\uDE4C"}
            title="Warm & encouraging"
            sub={'"You\'ve got this \u2014 here\'s your next step"'}
            selected={data.coachingStyle === "warm"}
            onClick={() => selectSingle("coachingStyle", "warm", 10)}
          />
          <OptionCard
            icon={"\uD83D\uDCAA"}
            title="Direct & no-nonsense"
            sub={'"Here\'s what to do today. Let\'s go."'}
            selected={data.coachingStyle === "direct"}
            onClick={() => selectSingle("coachingStyle", "direct", 10)}
          />
          <OptionCard
            icon={"\uD83E\uDD14"}
            title="Thoughtful & strategic"
            sub={'"Let\'s think about why this matters"'}
            selected={data.coachingStyle === "thoughtful"}
            onClick={() => selectSingle("coachingStyle", "thoughtful", 10)}
          />
        </div>
      </ScreenShell>
    );
  }

  // ─── Screen 10: Plan Reveal ───────────────────────────────────────────
  if (screen === 10) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-success text-2xl font-bold">&#10003;</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-1">
            Your personalized plan
          </p>
          <h1 className="font-display text-[22px] font-semibold text-text mb-1">
            Here&apos;s what I built for you
          </h1>
          <p className="text-sm text-text-muted">
            Based on everything you shared.
          </p>
        </div>

        {/* Vision card */}
        <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-primary mb-1">
            &#127919; YOUR VISION
          </p>
          <p className="text-sm text-text italic">
            {data.vision
              ? `\u201C${data.vision}\u201D`
              : "\u201CWake up calm, clear, and in control \u2014 with time for what matters and the follow-through to make it happen.\u201D"}
          </p>
        </div>

        {/* Plan steps */}
        <div className="space-y-3 mb-3">
          <PlanCard
            num="1"
            title="Daily Brain Dump & Triage"
            desc="Tell me what's on your mind each morning. I'll sort it into 3 clear actions."
          />
          <PlanCard
            num="2"
            title="Weekly Priority Reset"
            desc="Every Sunday: what you accomplished, what fell off, what's next. 5 minutes."
          />
          <PlanCard
            num="3"
            title="Pattern Recognition"
            desc="I track what you tell me and surface what's actually working vs. what's not."
          />
        </div>

        {/* First action */}
        <div className="bg-card border border-border rounded-xl p-3 mb-6">
          <p className="text-xs font-semibold text-success mb-1">
            &#9889; YOUR FIRST ACTION
          </p>
          <p className="text-sm text-text">
            Tomorrow morning: open the app and do your first brain dump.{" "}
            <strong>Just 2 minutes.</strong>
          </p>
        </div>

        <button
          onClick={() => goTo(11)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Unlock My Coaching Plan
        </button>
        <p className="text-xs text-text-muted text-center mt-2">
          Free for 7 days &middot; Cancel anytime
        </p>
      </ScreenShell>
    );
  }

  // ─── Screen 11: Paywall ───────────────────────────────────────────────
  if (screen === 11) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={progress} />
        <div className="text-center mb-4">
          <h2 className="font-display text-xl font-medium text-text">
            Start your 7-day free trial
          </h2>
          <p className="text-sm text-text-soft mt-1">
            Your plan is ready. <strong>Try it free</strong> &mdash; cancel
            anytime.
          </p>
        </div>

        {/* Annual */}
        <button
          onClick={() =>
            setData((prev) => ({ ...prev, selectedPlan: "annual" }))
          }
          className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition-all ${
            data.selectedPlan === "annual"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card"
          }`}
        >
          {data.selectedPlan === "annual" && (
            <span className="inline-block text-xs font-bold text-white bg-primary rounded-full px-3 py-0.5 mb-2">
              Best Value
            </span>
          )}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xl font-bold text-text">
                $59.99
                <span className="text-sm font-normal text-text-muted">
                  /year
                </span>
              </p>
              <p className="text-sm font-semibold text-primary">
                $4.99/month, billed annually
              </p>
            </div>
            <span className="text-xs font-bold text-primary-dark bg-accent-soft px-3 py-1 rounded-full">
              Save 58%
            </span>
          </div>
        </button>

        {/* Monthly */}
        <button
          onClick={() =>
            setData((prev) => ({ ...prev, selectedPlan: "monthly" }))
          }
          className={`w-full text-left p-4 rounded-xl border-2 mb-4 transition-all ${
            data.selectedPlan === "monthly"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card"
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xl font-bold text-text">
                $11.99
                <span className="text-sm font-normal text-text-muted">
                  /month
                </span>
              </p>
              <p className="text-sm text-primary">Billed monthly</p>
            </div>
          </div>
        </button>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {[
            ["Unlimited brain dumps", "talk through anything"],
            ["Daily coaching check-ins", "tied to your priorities"],
            ["Weekly progress insights", "patterns & next steps"],
            ["Your personalized plan", "built from what you shared"],
          ].map(([title, sub]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-success text-sm mt-0.5">&#10003;</span>
              <p className="text-sm text-text">
                <strong>{title}</strong> &mdash; {sub}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Start Free Trial
        </button>
        <p className="text-xs text-text-muted text-center mt-2">
          No charge for 7 days. Cancel in settings anytime.
        </p>

        {/* Trust row */}
        <div className="flex justify-center gap-4 mt-4">
          {[
            "\uD83D\uDD12 Secure",
            "\uD83D\uDCC5 7 days free",
            "\u274C Cancel anytime",
          ].map((item) => (
            <span key={item} className="text-[11px] text-text-muted">
              {item}
            </span>
          ))}
        </div>
      </ScreenShell>
    );
  }

  return null;
}

// ─── Reusable sub-components ──────────────────────────────────────────────

function ScreenShell({
  transitioning,
  direction,
  children,
}: {
  transitioning: boolean;
  direction: "forward" | "back";
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div
        className={`w-full max-w-[480px] flex flex-col px-6 pb-8 pt-4 md:rounded-3xl md:shadow-xl md:border md:border-border transition-all duration-300 ${
          transitioning
            ? direction === "forward"
              ? "opacity-0 translate-x-8"
              : "opacity-0 -translate-x-8"
            : "opacity-100 translate-x-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-[3px] bg-border rounded-full mb-2">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function TopRow({
  onBack,
  onSkip,
}: {
  onBack?: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 min-h-[28px]">
      {onBack ? (
        <button onClick={onBack} className="text-text-soft text-xl px-1 py-1">
          &#8592;
        </button>
      ) : (
        <div />
      )}
      {onSkip && (
        <button
          onClick={onSkip}
          className="text-text-muted text-sm hover:text-text-soft transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  );
}

function SamBubble({ text }: { text: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center">
          <span className="text-primary-dark text-xs font-semibold">S</span>
        </div>
        <span className="text-xs text-text-soft font-medium">Sam</span>
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text leading-relaxed">
        {text}
      </div>
    </>
  );
}

function OptionCard({
  icon,
  title,
  sub,
  selected,
  onClick,
}: {
  icon: string;
  title: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/[0.04]"
          : "border-border bg-card hover:border-primary-light/50"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs text-text-muted">{sub}</p>
      </div>
    </button>
  );
}

function CompactOption({
  icon,
  label,
  selected,
  onClick,
}: {
  icon?: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/[0.04] text-text font-medium"
          : "border-border bg-card text-text-soft hover:border-primary-light/50"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

function PlanCard({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start bg-card border border-border rounded-xl p-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary text-xs font-bold">{num}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs text-text-soft leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
