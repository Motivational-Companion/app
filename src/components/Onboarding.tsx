"use client";

import { useState, useCallback } from "react";

type OnboardingData = {
  bringYouHere: string;
  lookLike: string[];
  obstacles: string[];
  triedBefore: string[];
  vision: string;
  checkinTime: string;
  priorityArea: string;
  coachingStyle: string;
};

type Props = {
  onComplete: (data: OnboardingData) => void;
};

export default function Onboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    bringYouHere: "",
    lookLike: [],
    obstacles: [],
    triedBefore: [],
    vision: "",
    checkinTime: "",
    priorityArea: "",
    coachingStyle: "",
  });
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");

  const totalScreens = 13;
  const progress = Math.round((screen / totalScreens) * 100);

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

  const selectSingle = (field: keyof OnboardingData, value: string, nextScreen: number) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => goTo(nextScreen), 300);
  };

  const toggleMulti = (field: "lookLike" | "obstacles" | "triedBefore", value: string) => {
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

  const reflectionText: Record<string, string> = {
    overwhelmed: "overwhelmed — like there's too much coming at you at once",
    stuck: "stuck — like you know what you want but can't seem to get there",
    clarity: "like you need clarity — the path forward feels foggy",
    accountable: "like you need someone in your corner — someone who checks in",
  };

  // Screen 0: Landing
  if (screen === 0) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-6">
            <span className="text-primary-dark font-display text-2xl">S</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-4">
            Motivation Companion
          </p>
          <h1 className="font-display text-[28px] font-semibold text-text leading-tight mb-3">
            You don&apos;t need more<br />motivation.
          </h1>
          <p className="text-text-soft text-base leading-relaxed max-w-xs mb-2">
            You need someone who listens, helps you think clearly, and keeps you moving.
          </p>
          <p className="text-text-muted text-sm mb-8">
            No signup required. Takes 3 minutes.
          </p>
          <div className="w-full max-w-xs space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-success text-sm">&#10003;</span>
              <p className="text-sm text-text-soft"><strong>Clarity</strong> on what actually matters</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-success text-sm">&#10003;</span>
              <p className="text-sm text-text-soft"><strong>Someone who listens</strong> — not lectures</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-success text-sm">&#10003;</span>
              <p className="text-sm text-text-soft"><strong>A real plan</strong> you&apos;ll actually follow</p>
            </div>
          </div>
          <p className="text-xs text-text-muted mb-6">12,000+ started this week</p>
        </div>
        <button
          onClick={() => goTo(1)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Start My Free Session
        </button>
      </ScreenShell>
    );
  }

  // Screen 1: Meet Sam
  if (screen === 1) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={8} />
        <TopRow onBack={() => goTo(0)} />
        <div className="flex flex-col">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-4">
              <span className="text-primary-dark font-display text-3xl">S</span>
            </div>
            <h2 className="font-display text-2xl font-medium text-text mb-2">
              Hi, I&apos;m Sam.
            </h2>
            <p className="text-text-soft text-sm leading-relaxed max-w-xs">
              I&apos;m your coaching companion. I&apos;m not here to tell you what to do — I&apos;m here to help you figure out what <strong>you</strong> already know.
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <p className="text-sm text-text leading-relaxed">
              &ldquo;Think of this like talking to a friend who&apos;s really good at asking the right questions. Everything stays between us.&rdquo;
            </p>
          </div>
          <div className="space-y-3 mt-8">
            <button
              onClick={() => goTo(2)}
              className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
            >
              Let&apos;s do this
            </button>
            <button
              onClick={() => goTo(2)}
              className="w-full h-12 border border-border rounded-xl text-sm text-primary font-medium hover:bg-border/30 transition-all"
            >
              I&apos;m curious, tell me more
            </button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  // Screen 2: What brings you here?
  if (screen === 2) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={18} />
        <TopRow onBack={() => goTo(1)} />
        <SamBubble text="Let's start simple." />
        <h2 className="font-display text-xl font-medium text-text mt-2 mb-1">
          What brings you here today?
        </h2>
        <p className="text-sm text-text-muted mb-4">Pick the one that fits best.</p>
        <div className="space-y-3">
          <OptionCard
            icon="🌊"
            title="I'm overwhelmed"
            sub="Too much to do, not sure where to start"
            selected={data.bringYouHere === "overwhelmed"}
            onClick={() => selectSingle("bringYouHere", "overwhelmed", 3)}
          />
          <OptionCard
            icon="🔒"
            title="I feel stuck"
            sub="I know what I want but can't seem to move"
            selected={data.bringYouHere === "stuck"}
            onClick={() => selectSingle("bringYouHere", "stuck", 3)}
          />
          <OptionCard
            icon="🔍"
            title="I need clarity"
            sub="Things feel foggy — I need a clear path"
            selected={data.bringYouHere === "clarity"}
            onClick={() => selectSingle("bringYouHere", "clarity", 3)}
          />
          <OptionCard
            icon="🤝"
            title="I want accountability"
            sub="I start things but don't follow through"
            selected={data.bringYouHere === "accountable"}
            onClick={() => selectSingle("bringYouHere", "accountable", 3)}
          />
        </div>
      </ScreenShell>
    );
  }

  // Screen 3: Reflective listening + what does that look like
  if (screen === 3) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={28} />
        <TopRow onBack={() => goTo(2)} onSkip={() => goTo(4)} />
        <SamBubble
          text={`I hear you. So you're feeling ${reflectionText[data.bringYouHere] || "like you need a change"}. That takes courage to say.`}
        />
        <h3 className="font-semibold text-sm text-text mt-3 mb-1">
          What does that look like for you?
        </h3>
        <p className="text-xs text-text-muted mb-3">Select all that apply.</p>
        <div className="space-y-2">
          {[
            "Starting things but not finishing",
            "Feeling busy but not productive",
            "Procrastinating on what matters",
            "Can't prioritize — everything feels urgent",
            "General overwhelm — all of it",
          ].map((item) => (
            <CompactOption
              key={item}
              label={item}
              selected={data.lookLike.includes(item)}
              onClick={() => toggleMulti("lookLike", item)}
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

  // Screen 4: Obstacles
  if (screen === 4) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={36} />
        <TopRow onBack={() => goTo(3)} onSkip={() => goTo(5)} />
        <SamBubble text="That makes total sense. Now I'm curious..." />
        <h3 className="font-semibold text-sm text-text mt-3 mb-1">
          What gets in your way?
        </h3>
        <p className="text-xs text-text-muted mb-3">Most people pick 2-3.</p>
        <div className="space-y-2">
          {[
            "Lack of energy or motivation",
            "Too many distractions",
            "Fear of failure or judgment",
            "Other people's needs come first",
            "I don't know where to start",
          ].map((item) => (
            <CompactOption
              key={item}
              label={item}
              selected={data.obstacles.includes(item)}
              onClick={() => toggleMulti("obstacles", item)}
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

  // Screen 5: What have you tried
  if (screen === 5) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={44} />
        <TopRow onBack={() => goTo(4)} onSkip={() => goTo(6)} />
        <SamBubble text="That makes sense. You're not broken — you just don't have a system that works with your brain." />
        <h3 className="font-semibold text-sm text-text mt-3 mb-1">
          What have you tried before?
        </h3>
        <p className="text-xs text-text-muted mb-3">Select any that apply.</p>
        <div className="space-y-2">
          {[
            ["📝", "To-do lists or planners"],
            ["📱", "Habit tracker apps"],
            ["📖", "Journaling"],
            ["🗣️", "Therapy or coaching"],
            ["🎥", "YouTube / podcasts / books"],
            ["🤷", "Nothing yet — this is my first try"],
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
          onClick={() => goTo(6)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6"
        >
          Continue
        </button>
      </ScreenShell>
    );
  }

  // Screen 6: Vision question
  if (screen === 6) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={54} />
        <TopRow onBack={() => goTo(5)} onSkip={() => goTo(7)} />
        <div className="text-center mb-4">
          <div className="text-4xl mb-3">&#10024;</div>
          <h2 className="font-display text-xl font-medium text-text">
            Imagine it&apos;s 90 days<br />from now...
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
          onChange={(e) => setData((prev) => ({ ...prev, vision: e.target.value }))}
          placeholder="What are your mornings like? What have you accomplished? How do you feel?"
          className="w-full h-28 p-4 bg-card border border-border rounded-xl text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-text-muted text-center mt-2">
          This shapes your entire coaching plan — even a sentence helps.
        </p>
        <button
          onClick={() => goTo(7)}
          disabled={data.vision.trim().length < 5}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-6 disabled:bg-border disabled:text-text-muted disabled:cursor-default disabled:transform-none"
        >
          Continue
        </button>
      </ScreenShell>
    );
  }

  // Screen 7: AI Synthesis
  if (screen === 7) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={64} />
        <TopRow onBack={() => goTo(6)} />
        <SamBubble
          text={
            <>
              <strong>Here&apos;s what I&apos;m hearing:</strong>
              <br /><br />
              You have a <strong>clear vision</strong> of who you want to be — but the gap between here and there feels overwhelming. You&apos;ve tried things before and <strong>nothing sticks</strong>.
              <br /><br />
              What if the problem was <strong>never motivation?</strong> What if you just needed a better system for turning chaos into clarity — and <strong>someone to check in</strong> along the way?
            </>
          }
        />
        <div className="mt-3">
          <SamBubble text={<>I think I can help. <strong>A few quick preferences</strong> and I&apos;ll build your plan.</>} />
        </div>
        <button
          onClick={() => goTo(8)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all mt-8"
        >
          Build my plan
        </button>
      </ScreenShell>
    );
  }

  // Screen 8: Check-in time
  if (screen === 8) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={74} />
        <TopRow onBack={() => goTo(7)} onSkip={() => goTo(9)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-1">
          Quick preferences
        </p>
        <h2 className="font-display text-xl font-medium text-text mb-1">
          When do you need me most?
        </h2>
        <p className="text-sm text-text-soft mb-4">
          I&apos;ll send a <strong>gentle check-in</strong> at this time each day.
        </p>
        <div className="space-y-3">
          <OptionCard
            icon="🌅"
            title="Morning"
            sub="Start the day with clarity"
            selected={data.checkinTime === "morning"}
            onClick={() => selectSingle("checkinTime", "morning", 9)}
          />
          <OptionCard
            icon="☀️"
            title="Midday"
            sub="Reset when energy dips"
            selected={data.checkinTime === "midday"}
            onClick={() => selectSingle("checkinTime", "midday", 9)}
          />
          <OptionCard
            icon="🌃"
            title="Evening"
            sub="Reflect and set up tomorrow"
            selected={data.checkinTime === "evening"}
            onClick={() => selectSingle("checkinTime", "evening", 9)}
          />
        </div>
      </ScreenShell>
    );
  }

  // Screen 9: Priority area
  if (screen === 9) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={82} />
        <TopRow onBack={() => goTo(8)} onSkip={() => goTo(10)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-1">
          Almost there
        </p>
        <h2 className="font-display text-xl font-medium text-text mb-1">
          Which area should we<br />focus on first?
        </h2>
        <p className="text-sm text-text-soft mb-4">
          You can <strong>expand later</strong> — pick one to start.
        </p>
        <div className="space-y-3">
          <OptionCard
            icon="💼"
            title="Career & work"
            sub="Productivity, projects, growth"
            selected={data.priorityArea === "career"}
            onClick={() => selectSingle("priorityArea", "career", 10)}
          />
          <OptionCard
            icon="💖"
            title="Health & wellbeing"
            sub="Exercise, sleep, energy"
            selected={data.priorityArea === "health"}
            onClick={() => selectSingle("priorityArea", "health", 10)}
          />
          <OptionCard
            icon="🌱"
            title="Personal growth"
            sub="Habits, learning, side projects"
            selected={data.priorityArea === "growth"}
            onClick={() => selectSingle("priorityArea", "growth", 10)}
          />
          <OptionCard
            icon="👪"
            title="Relationships & family"
            sub="Quality time, boundaries"
            selected={data.priorityArea === "relationships"}
            onClick={() => selectSingle("priorityArea", "relationships", 10)}
          />
        </div>
      </ScreenShell>
    );
  }

  // Screen 10: Coaching style
  if (screen === 10) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={90} />
        <TopRow onBack={() => goTo(9)} onSkip={() => goTo(11)} />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-1">
          Last one
        </p>
        <h2 className="font-display text-xl font-medium text-text mb-4">
          What kind of support<br />works best for you?
        </h2>
        <div className="space-y-3">
          <OptionCard
            icon="🙌"
            title="Warm & encouraging"
            sub={'"You\'ve got this — here\'s your next step"'}
            selected={data.coachingStyle === "warm"}
            onClick={() => selectSingle("coachingStyle", "warm", 11)}
          />
          <OptionCard
            icon="💪"
            title="Direct & no-nonsense"
            sub={'"Here\'s what to do today. Let\'s go."'}
            selected={data.coachingStyle === "direct"}
            onClick={() => selectSingle("coachingStyle", "direct", 11)}
          />
          <OptionCard
            icon="🤔"
            title="Thoughtful & strategic"
            sub={'"Let\'s think about why this matters"'}
            selected={data.coachingStyle === "thoughtful"}
            onClick={() => selectSingle("coachingStyle", "thoughtful", 11)}
          />
        </div>
      </ScreenShell>
    );
  }

  // Screen 11: Plan reveal
  if (screen === 11) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={96} />
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
          <p className="text-sm text-text-muted">Based on everything you shared.</p>
        </div>

        {/* Vision card */}
        <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-4 mb-3">
          <p className="text-xs font-semibold text-primary mb-1">&#127919; YOUR VISION</p>
          <p className="text-sm text-text italic">
            {data.vision
              ? `"${data.vision}"`
              : '"Wake up calm, clear, and in control — with time for what matters and the follow-through to make it happen."'}
          </p>
        </div>

        {/* Plan steps */}
        <div className="space-y-3 mb-3">
          <PlanCard num="1" title="Daily Brain Dump & Triage" desc={"Tell me what's on your mind each morning. I'll sort it into 3 clear actions — ranked by what moves the needle."} />
          <PlanCard num="2" title="Weekly Priority Reset" desc={"Every Sunday: what you accomplished, what fell off, what's next. 5 minutes."} />
          <PlanCard num="3" title="Pattern Recognition" desc={"I track what you tell me and surface what's actually working vs. what's not."} />
        </div>

        {/* First action */}
        <div className="bg-card border border-border rounded-xl p-3 mb-6">
          <p className="text-xs font-semibold text-success mb-1">&#9889; YOUR FIRST ACTION</p>
          <p className="text-sm text-text">
            Tomorrow morning: open the app and do your first brain dump. <strong>Just 2 minutes.</strong>
          </p>
        </div>

        <button
          onClick={() => goTo(12)}
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

  // Screen 12: Paywall
  if (screen === 12) {
    return (
      <ScreenShell transitioning={transitioning} direction={direction}>
        <ProgressBar progress={100} />
        <div className="text-center mb-4">
          <h2 className="font-display text-xl font-medium text-text">
            Start your 7-day free trial
          </h2>
          <p className="text-sm text-text-soft mt-1">
            Your plan is ready. <strong>Try it free</strong> — cancel anytime.
          </p>
        </div>

        {/* Annual */}
        <button
          onClick={() => setSelectedPlan("annual")}
          className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition-all ${
            selectedPlan === "annual"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card"
          }`}
        >
          {selectedPlan === "annual" && (
            <span className="inline-block text-xs font-bold text-white bg-primary rounded-full px-3 py-0.5 mb-2">
              Best Value
            </span>
          )}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xl font-bold text-text">
                $59.99<span className="text-sm font-normal text-text-muted">/year</span>
              </p>
              <p className="text-sm font-semibold text-primary">$4.99/month, billed annually</p>
            </div>
            <span className="text-xs font-bold text-primary-dark bg-accent-soft px-3 py-1 rounded-full">
              Save 58%
            </span>
          </div>
        </button>

        {/* Monthly */}
        <button
          onClick={() => setSelectedPlan("monthly")}
          className={`w-full text-left p-4 rounded-xl border-2 mb-4 transition-all ${
            selectedPlan === "monthly"
              ? "border-primary bg-primary/[0.04]"
              : "border-border bg-card"
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xl font-bold text-text">
                $11.99<span className="text-sm font-normal text-text-muted">/month</span>
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
                <strong>{title}</strong> — {sub}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => onComplete(data)}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Start Free Trial
        </button>
        <p className="text-xs text-text-muted text-center mt-2">
          No charge for 7 days. Cancel in settings anytime.
        </p>
        <div className="flex justify-center gap-4 mt-4">
          {["🔒 Secure", "📅 7 days free", "❌ Cancel anytime", "⭐ 4.8 stars"].map(
            (item) => (
              <span key={item} className="text-[11px] text-text-muted">
                {item}
              </span>
            )
          )}
        </div>
      </ScreenShell>
    );
  }

  return null;
}

// Reusable components

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

function TopRow({ onBack, onSkip }: { onBack?: () => void; onSkip?: () => void }) {
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
        <button onClick={onSkip} className="text-text-muted text-sm hover:text-text-soft transition-colors">
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

function PlanCard({ num, title, desc }: { num: string; title: string; desc: string }) {
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
