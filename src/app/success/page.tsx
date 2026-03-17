"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] flex flex-col items-center text-center px-6 pb-8 pt-12 md:rounded-3xl md:shadow-xl md:border md:border-border">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <span className="text-success text-4xl font-bold">&#10003;</span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-[28px] font-semibold text-text leading-tight mb-3">
          Welcome!
        </h1>
        <p className="text-text-soft text-base leading-relaxed max-w-xs mb-2">
          Your 7-day free trial has started.
        </p>
        <p className="text-text-muted text-sm max-w-xs mb-8">
          Sam is ready to help you build clarity, momentum, and a plan that
          actually sticks. Your first session starts now.
        </p>

        {/* Features reminder */}
        <div className="w-full max-w-xs space-y-3 mb-8">
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
              <strong>Weekly progress insights</strong> and pattern recognition
            </p>
          </div>
        </div>

        {/* Call to action */}
        <button
          onClick={() => router.push("/demo?start=voice")}
          className="w-full max-w-xs h-14 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Start Talking with Sam
        </button>

        {sessionId && (
          <p className="text-xs text-text-muted mt-4">
            Session reference: {sessionId.slice(0, 16)}...
          </p>
        )}

        <p className="text-xs text-text-muted mt-6">
          No charge for 7 days. Cancel anytime in settings.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
