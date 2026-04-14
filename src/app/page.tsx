"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import MarketingLanding from "@/components/MarketingLanding";
import QuizFunnel from "@/components/QuizFunnel";

type Mode = "landing" | "quiz";

export default function Home() {
  const [mode, setMode] = useState<Mode>("landing");

  const handleCheckout = async (plan: "annual" | "monthly") => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Stripe checkout error:", data.error);
        alert("Something went wrong starting checkout. Please try again.");
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Something went wrong starting checkout. Please try again.");
    }
  };

  if (mode === "quiz") {
    return <QuizFunnel onCheckout={handleCheckout} onBack={() => setMode("landing")} />;
  }

  return (
    <>
      <AppHeader variant="landing" />
      <MarketingLanding onStartQuiz={() => setMode("quiz")} />
    </>
  );
}
