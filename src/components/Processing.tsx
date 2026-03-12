"use client";

import { useEffect } from "react";

type Props = {
  onComplete: () => void;
};

export default function Processing({ onComplete }: Props) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg px-6 text-center">
      {/* Animated pulse */}
      <div className="relative mb-8">
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-accent/20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center">
          <span className="text-primary-dark font-display text-3xl">S</span>
        </div>
      </div>

      <h2 className="font-display text-xl font-medium text-text mb-2">
        Organizing your thoughts...
      </h2>
      <p className="text-sm text-text-soft max-w-xs">
        Sam is building your personalized action plan based on everything you shared.
      </p>

      {/* Progress dots */}
      <div className="flex gap-2 mt-8">
        {[0, 0.3, 0.6].map((delay, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}
