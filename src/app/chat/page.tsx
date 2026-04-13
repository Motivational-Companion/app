"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TextConversation from "@/components/TextConversation";
import Conversation from "@/components/Conversation";
import SplitPaneChatLayout from "@/components/SplitPaneChatLayout";
import type { OnboardingData } from "@/lib/types";
import type { NoteItem } from "@/components/LiveLists";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  saveTasks,
  loadActiveTasks,
  updateTaskStatus,
  deleteTask,
} from "@/lib/supabase/data";

type ListKey = "issues" | "goals" | "tasks";

type AuthTasks = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
};

const EMPTY_AUTH_TASKS: AuthTasks = { issues: [], goals: [], tasks: [] };

/**
 * The workspace. One route, one view: chat + focus panel side-by-side on
 * desktop, single-column chat on mobile. Voice is a full-screen overlay
 * toggled by a button in the chat header. Unauthenticated users never
 * reach this page — middleware redirects them to /.
 *
 * Previously this file was a 4-way state machine (board / chat / checkin /
 * voice) with a Dashboard "hub" that forced an extra click before users
 * reached the product. That complexity is gone. The split pane IS the
 * product.
 */
export default function ChatPage() {
  const { user, loading: authLoading, supabase } = useAuth();
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData | null>(null);
  const [authTasks, setAuthTasks] = useState<AuthTasks>(EMPTY_AUTH_TASKS);
  const [authCompletedIds, setAuthCompletedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(
    null
  );
  // Two modes only: chat (default, the workspace) or voice (overlay).
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  // Picked once based on whether the user has active tasks on arrival.
  // null = not yet determined (still loading).
  const [chatMode, setChatMode] = useState<"chat" | "checkin" | null>(null);
  const initialRouteDone = useRef(false);

  // Onboarding data from localStorage (set during the quiz funnel)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboarding_data");
      if (stored) setOnboardingData(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Load active tasks + pick first chatMode based on task count
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    loadActiveTasks(supabase, user.id).then((result) => {
      if (cancelled) return;
      setAuthTasks(result);
      if (initialRouteDone.current) return;
      initialRouteDone.current = true;
      const hasItems =
        result.issues.length + result.goals.length + result.tasks.length > 0;
      setChatMode(hasItems ? "checkin" : "chat");
    });
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  // Sam extracted an item — save to Supabase + update local state so the
  // focus panel reflects it immediately.
  const handleNoteAdded = useCallback(
    (listKey: ListKey, item: NoteItem) => {
      if (!user || !supabase) return;
      const listType =
        listKey === "issues"
          ? ("issue" as const)
          : listKey === "goals"
            ? ("goal" as const)
            : ("task" as const);
      saveTasks(supabase, user.id, listType, [item]);
      setAuthTasks((prev) => ({
        ...prev,
        [listKey]: [...prev[listKey], item],
      }));
    },
    [user, supabase]
  );

  // Toggle done. Optimistic, reverts on Supabase error.
  const handleToggleDone = useCallback(
    async (_listKey: ListKey, id: string) => {
      const wasCompleted = authCompletedIds.has(id);
      setAuthCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) next.delete(id);
        else next.add(id);
        return next;
      });
      if (!user || !supabase) return;
      try {
        await updateTaskStatus(
          supabase,
          id,
          wasCompleted ? "active" : "completed"
        );
      } catch (err) {
        console.error("Failed to update task status, reverting:", err);
        setAuthCompletedIds((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [authCompletedIds, user, supabase]
  );

  // Permanent delete. Optimistic, reverts on Supabase error.
  const handleDeleteTask = useCallback(
    async (listKey: ListKey, id: string) => {
      const previousItems = authTasks[listKey];
      const previousCompleted = authCompletedIds.has(id);

      setAuthTasks((prev) => ({
        ...prev,
        [listKey]: prev[listKey].filter((item) => item.id !== id),
      }));
      if (previousCompleted) {
        setAuthCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }

      if (!user || !supabase) return;
      try {
        await deleteTask(supabase, id);
      } catch (err) {
        console.error("Failed to delete task, reverting:", err);
        setAuthTasks((prev) => ({ ...prev, [listKey]: previousItems }));
        if (previousCompleted) {
          setAuthCompletedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }
      }
    },
    [authTasks, authCompletedIds, user, supabase]
  );

  const handleSuggestionClick = useCallback((text: string) => {
    setPendingSuggestion(text);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }, [supabase]);

  // Loading spinner covers: auth check, task load, chatMode selection.
  if (authLoading || !user || !supabase || chatMode === null) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Voice overlay. Back button returns to the workspace.
  if (mode === "voice") {
    return (
      <Conversation
        onBack={() => setMode("chat")}
        onboardingData={onboardingData}
        onNoteAdded={handleNoteAdded}
      />
    );
  }

  // Default: the workspace
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
        onboardingData={onboardingData}
        chatMode={chatMode}
        onNoteAdded={handleNoteAdded}
        onOpenVoice={() => setMode("voice")}
        onSignOut={handleSignOut}
        embedded
        initialInput={pendingSuggestion ?? undefined}
      />
    </SplitPaneChatLayout>
  );
}
