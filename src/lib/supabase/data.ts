"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingData, ActionPlan } from "@/lib/types";
import type { NoteItem } from "@/components/LiveLists";

// ── Onboarding ──

export async function saveOnboardingData(
  supabase: SupabaseClient,
  userId: string,
  data: OnboardingData
) {
  // Save to onboarding_responses
  const { error: onboardingError } = await supabase
    .from("onboarding_responses")
    .insert({
      user_id: userId,
      bring_you_here: data.bringYouHere,
      look_like: data.lookLike,
      obstacles: data.obstacles,
      tried_before: data.triedBefore,
      vision: data.vision,
      checkin_time: data.checkinTime,
      priority_area: data.priorityArea,
      coaching_style: data.coachingStyle,
    });

  if (onboardingError) {
    console.error("Failed to save onboarding data:", onboardingError);
  }

  // Update profile preferences
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      coaching_style: data.coachingStyle,
      checkin_time: data.checkinTime,
      priority_area: data.priorityArea,
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Failed to update profile:", profileError);
  }
}

// ── Conversations ──

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  mode: "text" | "voice"
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, mode })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create conversation:", error);
    return null;
  }
  return data.id;
}

/**
 * Return the id of the user's current active conversation for the given mode,
 * creating one if none exists. This is the single source of truth for
 * "what conversation am I in right now" and prevents the bug where switching
 * views inside /chat spawns a new conversation record per mount.
 */
export async function getOrCreateActiveConversation(
  supabase: SupabaseClient,
  userId: string,
  mode: "text" | "voice"
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("mode", mode)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to look up active conversation:", error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0].id;
  }

  return createConversation(supabase, userId, mode);
}

export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
  if (error) {
    console.error("Failed to save message:", error);
  }

  // Increment message count
  await supabase.rpc("increment_message_count", {
    conv_id: conversationId,
  }).then(({ error: rpcError }) => {
    // rpc might not exist yet — ok to silently fail
    if (rpcError) console.error("Failed to increment count:", rpcError);
  });
}

export async function endConversation(
  supabase: SupabaseClient,
  conversationId: string
) {
  await supabase
    .from("conversations")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", conversationId);
}

// ── Tasks ──

export async function saveTasks(
  supabase: SupabaseClient,
  userId: string,
  listType: "issue" | "goal" | "task",
  items: NoteItem[],
  actionPlanId?: string
) {
  if (items.length === 0) return;

  const rows = items.map((item, index) => ({
    user_id: userId,
    list_type: listType,
    title: item.text,
    timeframe: item.timeframe || null,
    rank: index,
    action_plan_id: actionPlanId || null,
  }));

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) {
    console.error(`Failed to save ${listType} items:`, error);
  }
}

export async function loadActiveTasks(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("list_type")
    .order("rank");

  if (error) {
    console.error("Failed to load tasks:", error);
    return { issues: [], goals: [], tasks: [] };
  }

  const issues: NoteItem[] = [];
  const goals: NoteItem[] = [];
  const tasks: NoteItem[] = [];

  for (const row of data || []) {
    const item: NoteItem = {
      id: row.id,
      text: row.title,
      timeframe: row.timeframe || undefined,
      addedAt: new Date(row.created_at).getTime(),
    };
    if (row.list_type === "issue") issues.push(item);
    else if (row.list_type === "goal") goals.push(item);
    else tasks.push(item);
  }

  return { issues, goals, tasks };
}

export async function updateTaskStatus(
  supabase: SupabaseClient,
  taskId: string,
  status: "active" | "completed" | "snoozed" | "dismissed"
) {
  const updates: Record<string, unknown> = { status };
  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);

  if (error) {
    console.error("Failed to update task:", error);
  }
}

export async function deleteTask(supabase: SupabaseClient, taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    console.error("Failed to delete task:", error);
  }
}

// ── Action Plans ──

export async function saveActionPlan(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null,
  plan: ActionPlan
): Promise<string | null> {
  const { data, error } = await supabase
    .from("action_plans")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      vision_statement: plan.vision_statement,
      recommended_first_step: plan.recommended_first_step,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save action plan:", error);
    return null;
  }

  // Save priorities as tasks
  if (plan.priorities?.length > 0) {
    const taskRows = plan.priorities.map((p) => ({
      user_id: userId,
      action_plan_id: data.id,
      list_type: "task" as const,
      title: p.next_action,
      timeframe: p.timeframe,
      theme: p.theme,
      urgency: p.urgency,
      importance: p.importance,
      rank: p.rank,
    }));

    const { error: taskError } = await supabase.from("tasks").insert(taskRows);
    if (taskError) {
      console.error("Failed to save plan tasks:", taskError);
    }
  }

  return data.id;
}

// ── Profile / Subscription ──

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
  return data;
}

export async function getConversationHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, mode, started_at, ended_at, message_count")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load conversation history:", error);
    return [];
  }
  return data || [];
}
