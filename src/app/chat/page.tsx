"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import TextConversation from "@/components/TextConversation";
import type { OnboardingData } from "@/lib/types";
import { useAuth } from "@/lib/supabase/useAuth";
import { loadActiveTasks } from "@/lib/supabase/data";
import { useTaskState } from "@/lib/task-state";

/**
 * Home tab — the global brain-dump chat. Layout (AppHeader +
 * AppDrawer) is provided by /chat/layout.tsx. Task state is
 * shared with the drawer via TaskStateProvider so extractions
 * here show up in the drawer live.
 */
export default function ChatPage() {
  const { user, loading: authLoading, supabase } = useAuth();
  const {
    issues,
    goals,
    tasks,
    handleNoteAdded,
    handleNoteUpdated,
  } = useTaskState();
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData | null>(null);
  // Picked once on mount based on whether the user has active tasks.
  // null until determined.
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

  // Pick chatMode once based on whether the user has active tasks. We
  // fetch once locally so the initial greeting doesn't flicker as the
  // shared TaskStateProvider finishes its own load.
  useEffect(() => {
    if (!user || !supabase) return;
    if (initialRouteDone.current) return;
    initialRouteDone.current = true;
    loadActiveTasks(supabase, user.id).then((result) => {
      const hasItems =
        result.issues.length + result.goals.length + result.tasks.length > 0;
      setChatMode(hasItems ? "checkin" : "chat");
    });
  }, [user, supabase]);

  // Existing tasks string (with ids) that Sam references in the prompt
  // so she can update in place rather than duplicate.
  const existingTasksString = useMemo(() => {
    const lines: string[] = [];
    for (const item of issues) lines.push(`Issue [${item.id}] ${item.text}`);
    for (const item of goals) lines.push(`Goal [${item.id}] ${item.text}`);
    for (const item of tasks) {
      lines.push(
        `Task [${item.id}] ${item.text}${item.timeframe ? ` (${item.timeframe})` : ""}`
      );
    }
    return lines.length > 0 ? lines.join("\n") : undefined;
  }, [issues, goals, tasks]);

  if (authLoading || !user || !supabase || chatMode === null) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[780px] mx-auto w-full">
      <TextConversation
        onboardingData={onboardingData}
        chatMode={chatMode}
        onNoteAdded={handleNoteAdded}
        onNoteUpdated={handleNoteUpdated}
        embedded
        existingTasks={existingTasksString}
      />
    </div>
  );
}
