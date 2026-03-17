"use client";

import { useState, useEffect } from "react";
import Onboarding from "@/components/Onboarding";
import Conversation from "@/components/Conversation";
import TextConversation from "@/components/TextConversation";
import Processing from "@/components/Processing";
import Results from "@/components/Results";
import AuthGate from "@/components/AuthGate";
import Dashboard from "@/components/Dashboard";
import { useAuth } from "@/lib/supabase/useAuth";
import { saveOnboardingData } from "@/lib/supabase/data";
import type { ActionPlan, OnboardingData } from "@/lib/types";

type Mode = "hub" | "auth" | "conversation" | "textChat" | "checkin" | "onboarding" | "processing" | "results";

function loadOnboardingData(): OnboardingData | null {
  try {
    const stored = localStorage.getItem("onboarding_data");
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

export default function Home() {
  const { user, loading, supabase } = useAuth();
  const [mode, setMode] = useState<Mode>("hub");
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // Check URL params on mount — handle post-checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get("start");
    if (startParam === "voice") {
      setOnboardingData(loadOnboardingData());
      setMode("conversation");
      window.history.replaceState({}, "", "/demo");
    } else if (startParam === "chat") {
      setOnboardingData(loadOnboardingData());
      setMode("textChat");
      window.history.replaceState({}, "", "/demo");
    }
  }, []);

  const handlePlanReady = (plan: ActionPlan) => {
    setActionPlan(plan);
    setMode("processing");
  };

  const handleStartOver = () => {
    setActionPlan(null);
    setOnboardingData(null);
    setMode("hub");
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setOnboardingData(data);

    // Save to database if user is authenticated and Supabase is configured
    if (user && supabase) {
      await saveOnboardingData(supabase, user.id, data);
    }

    setMode("textChat");
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setMode("hub");
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (mode === "auth") {
    return (
      <AuthGate
        onAuthenticated={() => setMode("hub")}
        onSkip={() => setMode("hub")}
      />
    );
  }

  if (mode === "conversation") {
    return <Conversation onBack={() => setMode("hub")} onboardingData={onboardingData} />;
  }

  if (mode === "textChat") {
    return (
      <TextConversation
        onBack={() => setMode(user ? "hub" : "hub")}
        onPlanReady={handlePlanReady}
        onboardingData={onboardingData}
      />
    );
  }

  if (mode === "checkin") {
    return (
      <TextConversation
        onBack={() => setMode("hub")}
        onPlanReady={handlePlanReady}
        chatMode="checkin"
      />
    );
  }

  if (mode === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (mode === "processing") {
    return <Processing onComplete={() => setMode("results")} />;
  }

  if (mode === "results" && actionPlan) {
    return <Results plan={actionPlan} onStartOver={handleStartOver} />;
  }

  // Authenticated users see the Dashboard
  if (user && supabase) {
    return (
      <Dashboard
        userId={user.id}
        supabase={supabase}
        onStartChat={() => setMode("textChat")}
        onStartVoice={() => setMode("conversation")}
        onStartCheckin={() => setMode("checkin")}
        onSignOut={handleSignOut}
      />
    );
  }

  // Unauthenticated hub
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

      <div className="mt-8">
        <button
          onClick={() => setMode("auth")}
          className="text-sm text-primary hover:text-primary-dark transition-colors"
        >
          Sign in to save your progress
        </button>
      </div>

      <p className="mt-4 text-xs text-text-muted max-w-sm">
        Text powered by Claude. Voice powered by ElevenLabs.
      </p>
    </div>
  );
}
