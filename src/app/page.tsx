"use client";

import { useState } from "react";
import Onboarding from "@/components/Onboarding";
import Conversation from "@/components/Conversation";
import TextConversation from "@/components/TextConversation";
import Processing from "@/components/Processing";
import Results from "@/components/Results";
import type { ActionPlan } from "@/lib/types";

type Mode = "hub" | "conversation" | "textChat" | "onboarding" | "processing" | "results";

export default function Home() {
  const [mode, setMode] = useState<Mode>("hub");
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);

  const handlePlanReady = (plan: ActionPlan) => {
    setActionPlan(plan);
    setMode("processing");
  };

  const handleStartOver = () => {
    setActionPlan(null);
    setMode("hub");
  };

  if (mode === "conversation") {
    return <Conversation onBack={() => setMode("hub")} />;
  }

  if (mode === "textChat") {
    return (
      <TextConversation
        onBack={() => setMode("hub")}
        onPlanReady={handlePlanReady}
      />
    );
  }

  if (mode === "onboarding") {
    return <Onboarding onComplete={() => setMode("textChat")} />;
  }

  if (mode === "processing") {
    return <Processing onComplete={() => setMode("results")} />;
  }

  if (mode === "results" && actionPlan) {
    return <Results plan={actionPlan} onStartOver={handleStartOver} />;
  }

  // Hub
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-6">
        <span className="text-primary-dark font-display text-3xl">S</span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-text mb-2">
        Motivation Companion
      </h1>
      <p className="text-text-soft text-base max-w-sm leading-relaxed mb-10">
        Have a conversation with Sam. Walk away with clarity.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setMode("textChat")}
          className="w-full h-14 bg-primary text-white rounded-2xl text-lg font-semibold
                     hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Chat with Sam
        </button>
        <button
          onClick={() => setMode("conversation")}
          className="w-full h-14 border-2 border-primary text-primary rounded-2xl text-base font-semibold
                     hover:bg-primary/[0.04] active:scale-[0.98] transition-all"
        >
          Talk to Sam (Voice)
        </button>
        <button
          onClick={() => setMode("onboarding")}
          className="w-full h-12 border border-border text-text-muted rounded-2xl text-sm font-medium
                     hover:border-primary-light/50 hover:text-text-soft active:scale-[0.98] transition-all"
        >
          Try the Onboarding Quiz
        </button>
      </div>

      <p className="mt-8 text-xs text-text-muted max-w-sm">
        Text powered by Claude. Voice powered by ElevenLabs.
      </p>
    </div>
  );
}
