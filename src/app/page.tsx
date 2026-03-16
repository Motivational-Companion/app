"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MarketingLanding from "@/components/MarketingLanding";
import QuizFunnel from "@/components/QuizFunnel";

type Mode = "landing" | "quiz";

export default function Home() {
  const [mode, setMode] = useState<Mode>("landing");
  const router = useRouter();

  const handleCheckout = async (plan: "annual" | "monthly") => {
    const priceId =
      plan === "annual"
        ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) {
      // Stripe not configured — go straight to demo
      router.push("/demo?start=chat");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback if checkout fails
        router.push("/demo?start=chat");
      }
    } catch {
      router.push("/demo?start=chat");
    }
  };

  if (mode === "quiz") {
    return <QuizFunnel onCheckout={handleCheckout} />;
  }

  return (
    <MarketingLanding
      onStartQuiz={() => setMode("quiz")}
      onGoToDemo={() => router.push("/demo")}
    />
  );
}
