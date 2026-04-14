"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TextConversation from "@/components/TextConversation";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  getOrCreateTaskConversation,
  loadTaskDetail,
  updateTaskDescription,
  updateTaskDueDate,
  updateTaskFields,
  updateTaskStatus,
  type TaskRow,
} from "@/lib/supabase/data";

type Props = {
  taskId: string;
};

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function TaskDetailPane({ taskId }: Props) {
  const { user, supabase } = useAuth();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [parent, setParent] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !supabase) return;
    if (loadedRef.current === taskId) return;
    loadedRef.current = taskId;
    setLoading(true);
    (async () => {
      const detail = await loadTaskDetail(supabase, taskId);
      if (!detail) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTask(detail.task);
      setParent(detail.parent);
      setTitleDraft(detail.task.title);
      setDescDraft(detail.task.description ?? "");
      setDueDraft(formatDateForInput(detail.task.due_date));
      const convId = await getOrCreateTaskConversation(supabase, user.id, taskId);
      setConversationId(convId);
      setLoading(false);
    })();
  }, [user, supabase, taskId]);

  const commitTitle = useCallback(async () => {
    if (!supabase || !task) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === task.title) return;
    setTask((prev) => (prev ? { ...prev, title: trimmed } : prev));
    try {
      await updateTaskFields(supabase, task.id, { title: trimmed });
    } catch {
      setTask((prev) => (prev ? { ...prev, title: task.title } : prev));
      setTitleDraft(task.title);
    }
  }, [supabase, task, titleDraft]);

  const commitDescription = useCallback(async () => {
    if (!supabase || !task) return;
    if (descDraft === (task.description ?? "")) return;
    const nextDesc = descDraft;
    setTask((prev) => (prev ? { ...prev, description: nextDesc } : prev));
    try {
      await updateTaskDescription(supabase, task.id, nextDesc);
    } catch {
      setTask((prev) => (prev ? { ...prev, description: task.description } : prev));
      setDescDraft(task.description ?? "");
    }
  }, [supabase, task, descDraft]);

  const commitDueDate = useCallback(
    async (value: string) => {
      if (!supabase || !task) return;
      setDueDraft(value);
      const iso = value ? new Date(value).toISOString() : null;
      setTask((prev) => (prev ? { ...prev, due_date: iso } : prev));
      try {
        await updateTaskDueDate(supabase, task.id, iso);
      } catch {
        setTask((prev) => (prev ? { ...prev, due_date: task.due_date } : prev));
        setDueDraft(formatDateForInput(task.due_date));
      }
    },
    [supabase, task]
  );

  const toggleStatus = useCallback(async () => {
    if (!supabase || !task) return;
    const next = task.status === "completed" ? "active" : "completed";
    setTask((prev) => (prev ? { ...prev, status: next } : prev));
    try {
      await updateTaskStatus(supabase, task.id, next);
    } catch {
      setTask((prev) => (prev ? { ...prev, status: task.status } : prev));
    }
  }, [supabase, task]);

  const taskFocus = useMemo(() => {
    if (!task) return null;
    return {
      taskId: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      parent: parent
        ? {
            title: parent.title,
            listType: parent.list_type,
          }
        : null,
    };
  }, [task, parent]);

  const handleDescriptionUpdatedBySam = useCallback(
    (_taskId: string, description: string) => {
      setDescDraft(description);
      setTask((prev) => (prev ? { ...prev, description } : prev));
    },
    []
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="px-6 py-10 max-w-[780px] mx-auto">
        <h1 className="font-display text-2xl font-semibold text-text">
          Task not found
        </h1>
        <p className="text-sm text-text-muted mt-2">
          This task may have been deleted.
        </p>
      </div>
    );
  }

  const isDone = task.status === "completed";

  return (
    <div className="h-full flex flex-col md:flex-row min-h-0">
      {/* LEFT: chat */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-card md:border-r md:border-border">
        {conversationId && (
          <TextConversation
            embedded
            chatMode="chat"
            conversationIdOverride={conversationId}
            taskFocus={taskFocus}
            onTaskDescriptionUpdated={handleDescriptionUpdatedBySam}
          />
        )}
      </section>

      {/* RIGHT: task detail panel — Asana style */}
      <aside className="md:w-[380px] md:shrink-0 md:h-full md:overflow-y-auto bg-bg border-t md:border-t-0 border-border">
        <div className="px-5 md:px-6 py-5 md:py-6">
          {/* Status + title */}
          <div className="flex items-start gap-3 mb-3">
            <button
              type="button"
              onClick={toggleStatus}
              aria-label={isDone ? "Mark as not done" : "Mark complete"}
              className={`mt-1.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isDone
                  ? "bg-success border-success text-white"
                  : "border-text-muted/50 hover:border-primary"
              }`}
            >
              {isDone && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`flex-1 font-semibold text-lg leading-snug bg-transparent outline-none focus:outline-none ${
                isDone ? "line-through text-text-muted" : "text-text"
              }`}
            />
          </div>

          {parent && (
            <p className="text-xs text-text-muted mb-5 ml-8">
              Part of {parent.list_type}: <span className="text-text-soft">{parent.title}</span>
            </p>
          )}

          {/* Field rows */}
          <dl className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <dt className="w-20 text-xs uppercase tracking-wider text-text-muted">
                Status
              </dt>
              <dd className="text-text-soft">{isDone ? "Completed" : "Active"}</dd>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <dt className="w-20 text-xs uppercase tracking-wider text-text-muted">
                Due date
              </dt>
              <dd className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDraft}
                  onChange={(e) => commitDueDate(e.target.value)}
                  className="bg-transparent border border-border rounded px-2 py-0.5 text-sm text-text"
                />
                {task.due_date && (
                  <button
                    type="button"
                    onClick={() => commitDueDate("")}
                    className="text-xs text-text-muted hover:text-text underline"
                  >
                    clear
                  </button>
                )}
              </dd>
            </div>
          </dl>

          {/* Description */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Description
            </h2>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={commitDescription}
              placeholder="What's the full context? Sam will refine this as you chat."
              rows={6}
              className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text leading-relaxed placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
