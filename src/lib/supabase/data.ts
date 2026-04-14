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
 * Return the id of the user's GLOBAL brain-dump conversation — the row
 * with task_id IS NULL. Task-scoped threads (task_id != NULL) are
 * resolved separately via getOrCreateTaskConversation. Shared across
 * text and voice modes so both surfaces append to the same global
 * thread. Mode is recorded on creation but isn't used to partition
 * lookups.
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
    .is("task_id", null)
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

/**
 * Load every message on a conversation, oldest first, so we can hydrate
 * the UI when a user returns to their thread. Returns an empty array on
 * error (caller falls back to a fresh greeting).
 */
export async function loadMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load messages:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content as string,
  }));
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
    // Skip subtasks here — they're loaded with their parent in the
    // task detail pane, not as standalone drawer entries.
    if (row.parent_task_id) continue;
    const item: NoteItem = {
      id: row.id,
      text: row.title,
      timeframe: row.timeframe || undefined,
      description: row.description ?? null,
      addedAt: new Date(row.created_at).getTime(),
    };
    if (row.list_type === "issue") issues.push(item);
    else if (row.list_type === "goal") goals.push(item);
    else tasks.push(item);
  }

  return { issues, goals, tasks };
}

export async function updateTaskFields(
  supabase: SupabaseClient,
  taskId: string,
  fields: { title?: string; timeframe?: string | null }
) {
  const updates: Record<string, unknown> = {};
  if (fields.title !== undefined) updates.title = fields.title;
  if (fields.timeframe !== undefined) updates.timeframe = fields.timeframe;
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);
  if (error) {
    console.error("Failed to update task fields:", error);
    throw error;
  }
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

// ── Task detail (description, due date, subtasks) ──

export type TaskRow = {
  id: string;
  user_id: string;
  list_type: "issue" | "goal" | "task";
  title: string;
  timeframe: string | null;
  status: "active" | "completed" | "snoozed" | "dismissed";
  description: string | null;
  due_date: string | null;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDetail = {
  task: TaskRow;
  subtasks: TaskRow[];
  parent: TaskRow | null;
};

export async function loadTaskDetail(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskDetail | null> {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    console.error("Failed to load task:", taskError);
    return null;
  }

  const taskRow = task as TaskRow;

  const subtasksPromise = supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", taskId)
    .order("created_at");

  const parentPromise = taskRow.parent_task_id
    ? supabase
        .from("tasks")
        .select("*")
        .eq("id", taskRow.parent_task_id)
        .single()
    : Promise.resolve({ data: null, error: null });

  const [{ data: subtasks, error: subError }, { data: parent, error: parentErr }] =
    await Promise.all([subtasksPromise, parentPromise]);

  if (subError) console.error("Failed to load subtasks:", subError);
  if (parentErr) console.error("Failed to load parent task:", parentErr);

  return {
    task: taskRow,
    subtasks: (subtasks ?? []) as TaskRow[],
    parent: (parent as TaskRow) ?? null,
  };
}

export async function updateTaskDescription(
  supabase: SupabaseClient,
  taskId: string,
  description: string
) {
  const { error } = await supabase
    .from("tasks")
    .update({ description })
    .eq("id", taskId);
  if (error) {
    console.error("Failed to update task description:", error);
    throw error;
  }
}

export async function updateTaskDueDate(
  supabase: SupabaseClient,
  taskId: string,
  dueDate: string | null
) {
  const { error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .eq("id", taskId);
  if (error) {
    console.error("Failed to update due date:", error);
    throw error;
  }
}

export async function addSubtask(
  supabase: SupabaseClient,
  userId: string,
  parentTaskId: string,
  title: string
): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      parent_task_id: parentTaskId,
      list_type: "task",
      title,
    })
    .select("*")
    .single();
  if (error) {
    console.error("Failed to add subtask:", error);
    return null;
  }
  return data as TaskRow;
}

// ── Per-task conversations ──

export async function getOrCreateTaskConversation(
  supabase: SupabaseClient,
  userId: string,
  taskId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to look up task conversation:", error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0].id;
  }

  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({ user_id: userId, mode: "text", task_id: taskId })
    .select("id")
    .single();

  if (createErr) {
    console.error("Failed to create task conversation:", createErr);
    return null;
  }
  return created.id;
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
