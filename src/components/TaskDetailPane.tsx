"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TextConversation from "@/components/TextConversation";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  addSubtask,
  deleteTask,
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
  const [subtasks, setSubtasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
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
      setSubtasks(detail.subtasks);
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
      // revert
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

  const handleAddSubtask = useCallback(async () => {
    if (!supabase || !user || !task) return;
    const title = newSubtask.trim();
    if (!title) return;
    setNewSubtask("");
    const row = await addSubtask(supabase, user.id, task.id, title);
    if (row) setSubtasks((prev) => [...prev, row]);
  }, [supabase, user, task, newSubtask]);

  const handleToggleSubtask = useCallback(
    async (subId: string, currentStatus: string) => {
      if (!supabase) return;
      const nextStatus = currentStatus === "completed" ? "active" : "completed";
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status: nextStatus as TaskRow["status"] } : s))
      );
      try {
        await updateTaskStatus(supabase, subId, nextStatus);
      } catch {
        setSubtasks((prev) =>
          prev.map((s) =>
            s.id === subId ? { ...s, status: currentStatus as TaskRow["status"] } : s
          )
        );
      }
    },
    [supabase]
  );

  const handleDeleteSubtask = useCallback(
    async (subId: string) => {
      if (!supabase) return;
      const previous = subtasks;
      setSubtasks((prev) => prev.filter((s) => s.id !== subId));
      try {
        await deleteTask(supabase, subId);
      } catch {
        setSubtasks(previous);
      }
    },
    [supabase, subtasks]
  );

  const taskFocus = useMemo(() => {
    if (!task) return null;
    return {
      taskId: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      subtasks: subtasks.map((s) => ({
        title: s.title,
        status: s.status,
      })),
    };
  }, [task, subtasks]);

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
        <Link href="/chat" className="text-sm text-text-muted hover:text-text">
          &larr; Home
        </Link>
        <h1 className="font-display text-2xl font-semibold text-text mt-4">
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
    <div className="h-full flex flex-col max-w-[780px] mx-auto w-full px-4 md:px-6 py-4 md:py-6">
      <Link
        href="/chat"
        className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 mb-3"
      >
        <span aria-hidden="true">&larr;</span> Home
      </Link>

      {/* Title + status + due date */}
      <div className="flex items-start gap-3 mb-4">
        <button
          type="button"
          onClick={() =>
            handleToggleSubtask(task.id, task.status)
          }
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
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
          className={`flex-1 font-display text-2xl font-semibold bg-transparent outline-none focus:outline-none ${
            isDone ? "line-through text-text-muted" : "text-text"
          }`}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted mb-5">
        <span>Due</span>
        <input
          type="date"
          value={dueDraft}
          onChange={(e) => commitDueDate(e.target.value)}
          className="bg-transparent border border-border rounded px-2 py-1 text-xs text-text"
        />
        {task.due_date && (
          <button
            type="button"
            onClick={() => commitDueDate("")}
            className="text-text-muted hover:text-text underline"
          >
            clear
          </button>
        )}
      </div>

      {/* Description */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Description
        </h2>
        <textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDescription}
          placeholder="What's the full context? Sam will refine this as you chat."
          rows={4}
          className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text leading-relaxed placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
        />
      </section>

      {/* Subtasks */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Subtasks
        </h2>
        <ul className="space-y-1">
          {subtasks.map((sub) => {
            const done = sub.status === "completed";
            return (
              <li
                key={sub.id}
                className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg"
              >
                <button
                  type="button"
                  onClick={() => handleToggleSubtask(sub.id, sub.status)}
                  aria-label={done ? "Mark as not done" : "Mark as done"}
                  className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    done
                      ? "bg-success border-success text-white"
                      : "border-text-muted/50 hover:border-primary"
                  }`}
                >
                  {done && (
                    <svg
                      width="10"
                      height="10"
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
                <span
                  className={`flex-1 text-sm ${done ? "line-through text-text-muted" : "text-text"}`}
                >
                  {sub.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(sub.id)}
                  aria-label="Delete subtask"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-text-muted hover:text-red-600"
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 mt-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSubtask();
              }
            }}
            placeholder="Add subtask and press Enter"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
          />
          <button
            type="button"
            onClick={handleAddSubtask}
            disabled={!newSubtask.trim()}
            className="h-8 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:bg-border disabled:text-text-muted transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Chat */}
      <section className="flex-1 min-h-[320px] border-t border-border pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
          Conversation
        </h2>
        <div className="h-full rounded-2xl border border-border bg-card overflow-hidden">
          {conversationId && (
            <TextConversation
              embedded
              chatMode="chat"
              conversationIdOverride={conversationId}
              taskFocus={taskFocus}
              onTaskDescriptionUpdated={handleDescriptionUpdatedBySam}
            />
          )}
        </div>
      </section>
    </div>
  );
}
