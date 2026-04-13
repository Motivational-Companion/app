"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteItem } from "@/components/LiveLists";
import {
  loadActiveTasks,
  updateTaskStatus,
  deleteTask,
  getConversationHistory,
} from "@/lib/supabase/data";

type Props = {
  userId: string;
  supabase: SupabaseClient;
  onStartChat: () => void;
  onStartVoice: () => void;
  onStartCheckin: () => void;
  onSignOut: () => void;
};

type ConversationEntry = {
  id: string;
  mode: "text" | "voice";
  started_at: string;
  ended_at: string | null;
  message_count: number | null;
};

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard({
  userId,
  supabase,
  onStartChat,
  onStartVoice,
  onStartCheckin,
  onSignOut,
}: Props) {
  const [taskLists, setTaskLists] = useState<{
    issues: NoteItem[];
    goals: NoteItem[];
    tasks: NoteItem[];
  }>({ issues: [], goals: [], tasks: [] });
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [visionStatement, setVisionStatement] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const [tasksResult, convoResult, planResult] = await Promise.all([
        loadActiveTasks(supabase, userId),
        getConversationHistory(supabase, userId, 5),
        supabase
          .from("action_plans")
          .select("vision_statement")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      if (cancelled) return;

      setTaskLists(tasksResult);
      setConversations(convoResult as ConversationEntry[]);

      if (planResult.data?.vision_statement) {
        setVisionStatement(planResult.data.vision_statement);
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const handleToggleComplete = async (listKey: ListKey, id: string) => {
    const isCompleted = completedIds.has(id);

    if (isCompleted) {
      // Un-complete
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await updateTaskStatus(supabase, id, "active");
    } else {
      // Complete
      setCompletedIds((prev) => new Set(prev).add(id));
      await updateTaskStatus(supabase, id, "completed");
    }
  };

  const handleDismiss = async (listKey: ListKey, id: string) => {
    // Optimistically remove from UI
    setTaskLists((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((item) => item.id !== id),
    }));
    await deleteTask(supabase, id);
  };

  const totalTasks =
    taskLists.issues.length + taskLists.goals.length + taskLists.tasks.length;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] md:max-w-[720px] px-6 py-8 md:px-10 md:py-10 md:rounded-3xl md:shadow-xl md:border md:border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">
              {getGreeting()}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Here&apos;s where you left off
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="text-xs text-text-muted hover:text-text-soft transition-colors underline"
          >
            Sign out
          </button>
        </div>

        {/* Vision Statement */}
        {visionStatement && (
          <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
              Your Vision
            </p>
            <p className="font-display text-base text-text italic leading-relaxed">
              &ldquo;{visionStatement}&rdquo;
            </p>
          </div>
        )}

        {/* Primary Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={onStartCheckin}
            className="w-full h-14 bg-accent text-white rounded-2xl text-lg font-semibold
                       hover:bg-accent/90 active:scale-[0.98] transition-all shadow-lg shadow-accent/20"
          >
            Daily Check-in
          </button>

          <div className="flex gap-3">
            <button
              onClick={onStartChat}
              className="flex-1 h-12 bg-primary text-white rounded-2xl text-sm font-semibold
                         hover:bg-primary-dark active:scale-[0.98] transition-all shadow-md shadow-primary/15"
            >
              Talk to Sam
            </button>
            <button
              onClick={onStartVoice}
              className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center
                         hover:bg-primary/15 active:scale-[0.98] transition-all shrink-0"
              aria-label="Voice conversation"
            >
              {/* Microphone icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>
        </div>

        {/* Task Lists */}
        {totalTasks > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">
              Your Focus Areas
            </h2>

            {(["issues", "goals", "tasks"] as ListKey[]).map((listKey) => {
              const items = taskLists[listKey];
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
                      const isCompleted = completedIds.has(item.id);
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
                            onClick={() =>
                              handleToggleComplete(listKey, item.id)
                            }
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
                            onClick={() => handleDismiss(listKey, item.id)}
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
          <div className="text-center py-8 mb-8">
            <p className="text-sm text-text-soft max-w-xs mx-auto leading-relaxed">
              Your focus areas will appear here as you talk to Sam.
            </p>
          </div>
        )}

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">
              Recent Conversations
            </h2>

            <div className="space-y-2">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg border border-border/60 text-sm"
                >
                  {/* Mode icon */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center">
                    {convo.mode === "voice" ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium text-sm">
                      {convo.mode === "voice" ? "Voice" : "Chat"} session
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDate(convo.started_at)}
                      {convo.message_count != null && convo.message_count > 0 && (
                        <span className="ml-1.5">
                          &middot; {convo.message_count}{" "}
                          {convo.message_count === 1 ? "message" : "messages"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
