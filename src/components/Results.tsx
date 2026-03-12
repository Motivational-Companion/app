"use client";

import { useCallback } from "react";
import type { ActionPlan } from "@/lib/types";

type Props = {
  plan: ActionPlan;
  onStartOver: () => void;
};

const urgencyColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const importanceColor: Record<string, string> = {
  high: "bg-primary/10 text-primary-dark",
  medium: "bg-accent/20 text-primary",
  low: "bg-border text-text-muted",
};

export default function Results({ plan, onStartOver }: Props) {
  const copyToClipboard = useCallback(async () => {
    const lines = [
      `Vision: ${plan.vision_statement}`,
      "",
      "Action Plan:",
      ...plan.priorities.map(
        (p) =>
          `${p.rank}. ${p.theme} — ${p.next_action} (${p.timeframe})`
      ),
      "",
      `Start here: ${plan.recommended_first_step}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("Copied to clipboard!");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = lines.join("\n");
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Copied to clipboard!");
    }
  }, [plan]);

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[520px] px-6 py-8 md:rounded-3xl md:shadow-xl md:border md:border-border">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-success text-2xl font-bold">&#10003;</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-text mb-1">
            Your Action Plan
          </h1>
          <p className="text-sm text-text-muted">
            Built from your conversation with Sam
          </p>
        </div>

        {/* Vision statement */}
        <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
            Your Vision
          </p>
          <p className="font-display text-lg text-text italic leading-relaxed">
            &ldquo;{plan.vision_statement}&rdquo;
          </p>
        </div>

        {/* Recommended first step */}
        <div className="bg-card border-2 border-accent rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
            &#9889; Start Here
          </p>
          <p className="text-sm text-text font-medium leading-relaxed">
            {plan.recommended_first_step}
          </p>
        </div>

        {/* Priorities */}
        <div className="space-y-3 mb-8">
          {plan.priorities.map((priority) => (
            <div
              key={priority.rank}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-sm font-bold">
                    {priority.rank}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-text">
                      {priority.theme}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgencyColor[priority.urgency]}`}
                    >
                      {priority.urgency} urgency
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${importanceColor[priority.importance]}`}
                    >
                      {priority.importance} importance
                    </span>
                  </div>
                  <p className="text-sm text-text-soft leading-relaxed mb-1">
                    {priority.next_action}
                  </p>
                  <p className="text-xs text-text-muted">
                    &#128197; {priority.timeframe}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={copyToClipboard}
            className="w-full h-12 bg-primary text-white rounded-xl text-sm font-semibold
                       hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onStartOver}
            className="w-full h-12 border border-border rounded-xl text-sm text-text-soft font-medium
                       hover:bg-border/30 active:scale-[0.98] transition-all"
          >
            Start Over
          </button>
        </div>

        <p className="text-xs text-text-muted text-center mt-6">
          Your conversation was private and is not stored.
        </p>
      </div>
    </div>
  );
}
