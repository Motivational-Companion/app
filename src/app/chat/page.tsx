"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import TextConversation from "@/components/TextConversation";
import Conversation from "@/components/Conversation";
import Dashboard from "@/components/Dashboard";
import SplitPaneChatLayout from "@/components/SplitPaneChatLayout";
import type { OnboardingData } from "@/lib/types";
import type { NoteItem } from "@/components/LiveLists";
import { useTaskStore } from "@/lib/useTaskStore";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  saveTasks,
  loadActiveTasks,
  updateTaskStatus,
  deleteTask,
} from "@/lib/supabase/data";

type ListKey = "issues" | "goals" | "tasks";
type View = "board" | "chat" | "checkin" | "voice";

type AuthTasks = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
};

const EMPTY_AUTH_TASKS: AuthTasks = { issues: [], goals: [], tasks: [] };

export default function ChatPage() {
  const { user, loading: authLoading, supabase } = useAuth();
  const store = useTaskStore();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("board");
  const [authTasks, setAuthTasks] = useState<AuthTasks>(EMPTY_AUTH_TASKS);
  const [authCompletedIds, setAuthCompletedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(
    null
  );

  // Load onboarding data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboarding_data");
      if (stored) setOnboardingData(JSON.parse(stored));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  // For unauthenticated users only: go straight to chat if no existing tasks
  useEffect(() => {
    if (!ready || authLoading || user) return;
    const hasTasks = store.issues.length + store.goals.length + store.tasks.length > 0;
    if (!hasTasks) {
      setView("chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authLoading, user]);

  // Load authenticated user's active tasks from Supabase so the split-pane
  // focus panel has a live data source.
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    loadActiveTasks(supabase, user.id).then((result) => {
      if (cancelled) return;
      setAuthTasks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  // Save note to Supabase for authenticated users, localStorage for anonymous.
  // For auth'd users we also update local state immediately so the focus
  // panel reflects the new item without waiting for a Supabase refetch.
  const handleNoteAdded = useCallback(
    (listKey: ListKey, item: NoteItem) => {
      if (user && supabase) {
        const listType = listKey === "issues" ? "issue" as const
          : listKey === "goals" ? "goal" as const
          : "task" as const;
        saveTasks(supabase, user.id, listType, [item]);
        setAuthTasks((prev) => ({
          ...prev,
          [listKey]: [...prev[listKey], item],
        }));
      } else {
        store.addItem(listKey, item);
      }
    },
    [user, supabase, store]
  );

  // Toggle an item as done. Persists to Supabase. Users can click again
  // to un-done. Done items stay in the list with a strikethrough.
  const handleToggleDone = useCallback(
    (_listKey: ListKey, id: string) => {
      const wasCompleted = authCompletedIds.has(id);
      setAuthCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      if (user && supabase) {
        updateTaskStatus(
          supabase,
          id,
          wasCompleted ? "active" : "completed"
        );
      }
    },
    [authCompletedIds, user, supabase]
  );

  // Permanently delete a task. Removes from the local list and from
  // Supabase. Undo is not supported for MVP.
  const handleDeleteTask = useCallback(
    (listKey: ListKey, id: string) => {
      setAuthTasks((prev) => ({
        ...prev,
        [listKey]: prev[listKey].filter((item) => item.id !== id),
      }));
      setAuthCompletedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (user && supabase) {
        deleteTask(supabase, id);
      }
    },
    [user, supabase]
  );

  // When the user clicks a suggestion in the empty focus-panel state,
  // stash it and TextConversation will pre-populate its input on mount.
  const handleSuggestionClick = useCallback((text: string) => {
    setPendingSuggestion(text);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/";
  }, [supabase]);

  // Build existingTasks context for Sam (unauthenticated fallback only)
  const existingTasks = useMemo(() => {
    if (user) return undefined; // TextConversation loads from Supabase when auth'd
    const lines: string[] = [];
    for (const item of store.issues) lines.push(`- Issue: ${item.text}`);
    for (const item of store.goals) lines.push(`- Goal: ${item.text}`);
    for (const item of store.tasks) {
      const completed = store.completedIds.has(item.id) ? " [DONE]" : "";
      lines.push(`- Task: ${item.text}${item.timeframe ? ` (${item.timeframe})` : ""}${completed}`);
    }
    return lines.length > 0 ? lines.join("\n") : undefined;
  }, [user, store.issues, store.goals, store.tasks, store.completedIds]);

  if (!ready || authLoading) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Chat or Check-in view ──
  if (view === "chat" || view === "checkin") {
    // Authenticated users see the split-pane layout on desktop (chat on
    // the left, live focus panel on the right). Mobile falls back to the
    // standalone TextConversation with its own collapsible task bar.
    if (user && supabase) {
      return (
        <SplitPaneChatLayout
          issues={authTasks.issues}
          goals={authTasks.goals}
          tasks={authTasks.tasks}
          completedIds={authCompletedIds}
          onToggleDone={handleToggleDone}
          onDelete={handleDeleteTask}
          onSuggestionClick={handleSuggestionClick}
        >
          <TextConversation
            onBack={() => setView("board")}
            onboardingData={onboardingData}
            chatMode={view === "checkin" ? "checkin" : "chat"}
            onNoteAdded={handleNoteAdded}
            embedded
            initialInput={pendingSuggestion ?? undefined}
          />
        </SplitPaneChatLayout>
      );
    }

    // Unauthenticated fallback (demo / dev)
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

  // ── Voice view ──
  if (view === "voice") {
    return (
      <Conversation
        onBack={() => setView("board")}
        onboardingData={onboardingData}
        onNoteAdded={handleNoteAdded}
      />
    );
  }

  // ── Board view: Dashboard for authenticated users, simple fallback for anonymous ──
  if (user && supabase) {
    return (
      <Dashboard
        userId={user.id}
        supabase={supabase}
        onStartChat={() => setView("chat")}
        onStartVoice={() => setView("voice")}
        onStartCheckin={() => setView("checkin")}
        onSignOut={handleSignOut}
      />
    );
  }

  // Unauthenticated fallback: simple localStorage board (for dev/demo only)
  const totalTasks = store.issues.length + store.goals.length + store.tasks.length;

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] md:max-w-[720px] px-6 py-8 md:px-10 md:py-10 md:rounded-3xl md:shadow-xl md:border md:border-border bg-card">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-text">
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Here&apos;s where you left off
          </p>
        </div>

        {store.vision && (
          <div className="bg-gradient-to-br from-primary/[0.08] to-accent/[0.12] rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Your Vision</p>
            <p className="font-display text-base text-text italic leading-relaxed">
              &ldquo;{store.vision}&rdquo;
            </p>
          </div>
        )}

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

        {totalTasks > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">Your Focus Areas</h2>
            {(["issues", "goals", "tasks"] as ListKey[]).map((listKey) => {
              const items = store[listKey];
              if (items.length === 0) return null;
              const config = listKey === "issues"
                ? { title: "Issues", icon: "!", color: "text-red-500", bg: "bg-red-50", border: "border-red-100" }
                : listKey === "goals"
                ? { title: "Goals", icon: "\u2605", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" }
                : { title: "To-Dos", icon: "\u2713", color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" };

              return (
                <div key={listKey} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs ${config.color}`}>{config.icon}</span>
                    <span className="text-xs font-semibold text-text-soft uppercase tracking-wider">{config.title}</span>
                    <span className="text-xs text-text-muted">({items.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const isCompleted = store.completedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all duration-300 ${
                            isCompleted ? "bg-success/5 border-success/20 opacity-60" : `${config.bg} ${config.border}`
                          }`}
                        >
                          <button
                            onClick={() => store.toggleComplete(item.id)}
                            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isCompleted ? "bg-success border-success text-white" : "border-text-muted/40 hover:border-primary"
                            }`}
                          >
                            {isCompleted && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-text transition-all ${isCompleted ? "line-through text-text-muted" : ""}`}>
                            {item.text}
                            {listKey === "tasks" && item.timeframe && (
                              <span className="ml-2 inline-block text-[11px] text-text-muted bg-border/50 px-2 py-0.5 rounded-full">
                                {item.timeframe}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => store.removeItem(listKey, item.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 text-xs px-1"
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

        {totalTasks === 0 && (
          <div className="text-center py-8 mb-8">
            <p className="text-sm text-text-soft max-w-xs mx-auto leading-relaxed">
              Your focus areas will appear here as you talk to Sam.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
