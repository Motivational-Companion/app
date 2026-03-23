"use client";

import { useState, useEffect, useMemo } from "react";
import TextConversation from "@/components/TextConversation";
import type { OnboardingData } from "@/lib/types";
import type { NoteItem } from "@/components/LiveLists";
import { useTaskStore } from "@/lib/useTaskStore";

type ListKey = "issues" | "goals" | "tasks";

const LIST_CONFIGS: Record<
  ListKey,
  { title: string; icon: string; color: string; bg: string; border: string; showTimeframe?: boolean }
> = {
  issues: {
    title: "Issues",
    icon: "!",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  goals: {
    title: "Goals",
    icon: "\u2605",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  tasks: {
    title: "To-Dos",
    icon: "\u2713",
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/10",
    showTimeframe: true,
  },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type View = "board" | "chat" | "checkin";

export default function ChatPage() {
  const store = useTaskStore();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("board");

  // Load onboarding data and determine initial view
  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboarding_data");
      if (stored) setOnboardingData(JSON.parse(stored));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  // Determine initial view once store is loaded
  useEffect(() => {
    if (!ready) return;
    const hasTasks = store.issues.length + store.goals.length + store.tasks.length > 0;
    const hasOnboarding = !!localStorage.getItem("onboarding_data");
    // First-time user: go straight to chat
    if (!hasTasks && !hasOnboarding) {
      setView("chat");
    }
    // Returning user with no tasks but has onboarding: also chat
    else if (!hasTasks) {
      setView("chat");
    }
    // Returning user with tasks: board
    else {
      setView("board");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Build existingTasks string for Sam's context
  const existingTasks = useMemo(() => {
    const lines: string[] = [];
    for (const item of store.issues) {
      lines.push(`- Issue: ${item.text}`);
    }
    for (const item of store.goals) {
      lines.push(`- Goal: ${item.text}`);
    }
    for (const item of store.tasks) {
      const completed = store.completedIds.has(item.id) ? " [DONE]" : "";
      lines.push(`- Task: ${item.text}${item.timeframe ? ` (${item.timeframe})` : ""}${completed}`);
    }
    return lines.length > 0 ? lines.join("\n") : undefined;
  }, [store.issues, store.goals, store.tasks, store.completedIds]);

  const handleNoteAdded = (listKey: "issues" | "goals" | "tasks", item: NoteItem) => {
    store.addItem(listKey, item);
  };

  if (!ready) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Chat or Check-in view
  if (view === "chat" || view === "checkin") {
    return (
      <TextConversation
        onBack={() => setView("board")}
        onboardingData={onboardingData}
        chatMode={view === "checkin" ? "checkin" : "chat"}
        onNoteAdded={handleNoteAdded}
        existingTasks={existingTasks}
      />
    );
  }

  // Board view
  const totalTasks = store.issues.length + store.goals.length + store.tasks.length;

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] px-6 py-8 md:rounded-3xl md:shadow-xl md:border md:border-border bg-card">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-text">
            {getGreeting()}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Here&apos;s where you left off
          </p>
        </div>

        {/* Vision Statement */}
        {store.vision && (
          <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
              Your Vision
            </p>
            <p className="font-display text-base text-text italic leading-relaxed">
              &ldquo;{store.vision}&rdquo;
            </p>
          </div>
        )}

        {/* Primary Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => setView("checkin")}
            className="w-full h-14 bg-accent text-white rounded-2xl text-lg font-semibold
                       hover:bg-accent/90 active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
          >
            Daily Check-in
          </button>

          <button
            onClick={() => setView("chat")}
            className="w-full h-12 bg-primary text-white rounded-2xl text-sm font-semibold
                       hover:bg-primary-dark active:scale-[0.98] transition-all shadow-md shadow-primary/15"
          >
            Talk to Sam
          </button>
        </div>

        {/* Task Lists */}
        {totalTasks > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">
              Your Focus Areas
            </h2>

            {(["issues", "goals", "tasks"] as ListKey[]).map((listKey) => {
              const items = store[listKey];
              if (items.length === 0) return null;
              const config = LIST_CONFIGS[listKey];

              return (
                <div key={listKey} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs ${config.color}`}>
                      {config.icon}
                    </span>
                    <span className="text-xs font-semibold text-text-soft uppercase tracking-wider">
                      {config.title}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({items.length})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const isCompleted = store.completedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all duration-300 ${
                            isCompleted
                              ? "bg-success/5 border-success/20 opacity-60"
                              : `${config.bg} ${config.border}`
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => store.toggleComplete(item.id)}
                            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isCompleted
                                ? "bg-success border-success text-white"
                                : "border-text-muted/40 hover:border-primary"
                            }`}
                            aria-label={
                              isCompleted
                                ? "Mark as incomplete"
                                : "Mark as complete"
                            }
                          >
                            {isCompleted && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>

                          {/* Content */}
                          <span
                            className={`flex-1 text-text transition-all ${
                              isCompleted ? "line-through text-text-muted" : ""
                            }`}
                          >
                            {item.text}
                            {config.showTimeframe && item.timeframe && (
                              <span className="ml-2 inline-block text-[11px] text-text-muted bg-border/50 px-2 py-0.5 rounded-full">
                                {item.timeframe}
                              </span>
                            )}
                          </span>

                          {/* Dismiss button */}
                          <button
                            onClick={() => store.removeItem(listKey, item.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 text-xs px-1"
                            aria-label="Dismiss"
                          >
                            &#10005;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No tasks state */}
        {totalTasks === 0 && (
          <div className="text-center py-6 mb-8">
            <div className="w-12 h-12 rounded-full bg-accent-soft/50 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary text-xl">&#9825;</span>
            </div>
            <p className="text-sm text-text-soft">
              Start a conversation with Sam to build your focus areas.
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-xs text-text-muted text-center">
          Powered by Claude
        </p>
      </div>
    </div>
  );
}
