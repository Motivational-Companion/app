"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/lib/supabase/useAuth";
import { saveOnboardingData, saveTasks } from "@/lib/supabase/data";
import { trackEvent } from "@/lib/analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";
import type { OnboardingData } from "@/lib/types";
import type { NoteItem } from "@/components/LiveLists";

type Step = "loading" | "link" | "auth" | "migrating" | "ready";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user, loading: authLoading, supabase } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);

  // Retrieve the Stripe checkout session to get customer ID
  useEffect(() => {
    if (!sessionId) {
      setStep("auth");
      return;
    }

    fetch(`/api/stripe/session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customer_id) {
          setStripeCustomerId(data.customer_id);
        }
        // Track trial started
        trackEvent("trial_started", { payment_status: data.payment_status });
        trackMetaEvent("StartTrial", { value: 0, currency: "USD" });
        trackMetaEvent("Purchase", { value: 0, currency: "USD" });
        // If user is already logged in, skip to linking
        if (user) {
          setStep("link");
        } else {
          setStep("auth");
        }
      })
      .catch(() => {
        // Even if session retrieval fails, proceed with auth
        setStep("auth");
      });
  }, [sessionId, user]);

  // When user becomes authenticated, proceed to link and migrate
  useEffect(() => {
    if (authLoading || !user || !supabase) return;
    if (step === "auth") {
      setStep("link");
    }
  }, [user, authLoading, supabase, step]);

  // Link Stripe customer to profile and migrate localStorage data
  useEffect(() => {
    if (step !== "link" || !user || !supabase) return;
    setStep("migrating");

    (async () => {
      try {
        // 1. Link Stripe customer ID to profile
        if (stripeCustomerId) {
          await supabase
            .from("profiles")
            .update({
              stripe_customer_id: stripeCustomerId,
              subscription_status: "trialing",
            })
            .eq("id", user.id);
        }

        // 2. Migrate onboarding data from localStorage
        try {
          const raw = localStorage.getItem("onboarding_data");
          if (raw) {
            const onboardingData: OnboardingData = JSON.parse(raw);
            await saveOnboardingData(supabase, user.id, onboardingData);
          }
        } catch {
          // ignore parse errors
        }

        // 3. Migrate tasks from localStorage
        try {
          const raw = localStorage.getItem("sam_tasks");
          if (raw) {
            const taskData = JSON.parse(raw);
            const lists: Array<{ key: "issues" | "goals" | "tasks"; type: "issue" | "goal" | "task" }> = [
              { key: "issues", type: "issue" },
              { key: "goals", type: "goal" },
              { key: "tasks", type: "task" },
            ];
            for (const { key, type } of lists) {
              const items: NoteItem[] = taskData[key] || [];
              if (items.length > 0) {
                await saveTasks(supabase, user.id, type, items);
              }
            }
          }
        } catch {
          // ignore parse errors
        }

        setStep("ready");
      } catch (err) {
        console.error("Migration failed:", err);
        setStep("ready"); // proceed anyway
      }
    })();
  }, [step, user, supabase, stripeCustomerId]);

  const handleAuthenticated = useCallback(() => {
    setStep("link");
  }, []);

  // Loading state
  if (step === "loading" || authLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Auth step: show post-purchase account creation (CRO-optimized copy)
  if (step === "auth" && !user) {
    return (
      <AuthGate
        onAuthenticated={handleAuthenticated}
        variant="post-purchase"
      />
    );
  }

  // Migrating state
  if (step === "migrating" || step === "link") {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-soft">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Ready: show welcome screen
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] flex flex-col px-6 pb-8 pt-12 md:rounded-3xl md:shadow-xl md:border md:border-border">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <span className="text-success text-4xl font-bold">&#10003;</span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-[28px] font-semibold text-text leading-tight mb-3">
          Welcome!
        </h1>
        <p className="text-text-soft text-base leading-relaxed mb-2">
          Your 7-day free trial has started.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Sam is ready to help you build clarity, momentum, and a plan that
          actually sticks. Your first session starts now.
        </p>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-success text-sm">&#10003;</span>
            <p className="text-sm text-text-soft">
              <strong>Unlimited conversations</strong> with Sam
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-success text-sm">&#10003;</span>
            <p className="text-sm text-text-soft">
              <strong>Daily coaching check-ins</strong> personalized to you
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-success text-sm">&#10003;</span>
            <p className="text-sm text-text-soft">
              <strong>Track your goals</strong> and progress over time
            </p>
          </div>
        </div>

        {/* Call to action */}
        <button
          onClick={() => router.push("/chat")}
          className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Chat with Sam
        </button>

        <p className="text-xs text-text-muted text-center mt-6">
          No charge for 7 days. Cancel anytime in settings.
        </p>
      </div>
    </div>
  );
}
