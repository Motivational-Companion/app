"use client";

import { useState } from "react";
import Onboarding from "@/components/Onboarding";
import Conversation from "@/components/Conversation";

type Mode = "hub" | "conversation" | "onboarding";

export default function Home() {
  const [mode, setMode] = useState<Mode>("hub");

  if (mode === "conversation") {
    return <Conversation onBack={() => setMode("hub")} />;
  }

  if (mode === "onboarding") {
    return <Onboarding onComplete={() => setMode("conversation")} />;
  }

  // Demo hub
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-6">
        <span className="text-primary-dark font-display text-3xl">S</span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-text mb-2">
        Motivation Companion
      </h1>
      <p className="text-text-soft text-base max-w-sm leading-relaxed mb-10">
        Tech demo — ElevenLabs + Claude
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setMode("conversation")}
          className="w-full h-14 bg-primary text-white rounded-2xl text-lg font-semibold
                     hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Talk to Sam
        </button>
        <button
          onClick={() => setMode("onboarding")}
          className="w-full h-14 border-2 border-border text-primary rounded-2xl text-base font-semibold
                     hover:border-primary-light/50 hover:bg-primary/[0.03] active:scale-[0.98] transition-all"
        >
          Try the Onboarding Flow
        </button>
      </div>

      <p className="mt-8 text-xs text-text-muted max-w-sm">
        Voice powered by ElevenLabs Conversational AI. Coaching intelligence by Claude.
      </p>
    </div>
  );
}
