"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TextConversation from "@/components/TextConversation";
import { useAuth } from "@/lib/supabase/useAuth";
import { useTaskState } from "@/lib/task-state";
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
  const { setTaskDescription } = useTaskState();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [parent, setParent] = useState<TaskRow | null>(null);
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
      setParent(detail.parent);
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
      setTask((prev) => (prev ? { ...prev, title: task.title } : prev));
      setTitleDraft(task.title);
    }
  }, [supabase, task, titleDraft]);

  const commitDescription = useCallback(async () => {
    if (!supabase || !task) return;
    if (descDraft === (task.description ?? "")) return;
    const nextDesc = descDraft;
    setTask((prev) => (prev ? { ...prev, description: nextDesc } : prev));
    setTaskDescription(task.id, nextDesc);
    try {
      await updateTaskDescription(supabase, task.id, nextDesc);
    } catch {
      setTask((prev) => (prev ? { ...prev, description: task.description } : prev));
      setDescDraft(task.description ?? "");
    }
  }, [supabase, task, descDraft, setTaskDescription]);

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
      parent: parent
        ? {
            title: parent.title,
            listType: parent.list_type,
          }
        : null,
    };
  }, [task, parent, subtasks]);

  const handleDescriptionUpdatedBySam = useCallback(
    (refinedTaskId: string, description: string) => {
      setDescDraft(description);
      setTask((prev) => (prev ? { ...prev, description } : prev));
      setTaskDescription(refinedTaskId, description);
    },
    [setTaskDescription]
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

      {/* RIGHT: Asana-style task detail panel — white card, inline
          edits without textarea/input chrome. */}
      <aside className="md:w-[440px] md:shrink-0 md:h-full md:overflow-y-auto bg-card border-t md:border-t-0 border-border">
        <div className="px-5 md:px-7 py-5 md:py-7">
          {/* Status + title */}
          <div className="flex items-start gap-3 mb-2">
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
            <textarea
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              rows={1}
              className={`flex-1 font-semibold text-lg leading-snug bg-transparent outline-none focus:outline-none resize-none break-words ${
                isDone ? "line-through text-text-muted" : "text-text"
              }`}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
          </div>

          {parent && (
            <p className="text-xs text-text-muted mb-5 ml-8">
              Part of {parent.list_type}: <span className="text-text-soft">{parent.title}</span>
            </p>
          )}

          {/* Field rows — Asana metadata block */}
          <dl className="space-y-2.5 mb-7">
            <div className="flex items-center gap-3 text-sm">
              <dt className="w-24 text-xs uppercase tracking-wider text-text-muted">
                Due date
              </dt>
              <dd className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDraft}
                  onChange={(e) => commitDueDate(e.target.value)}
                  className="bg-transparent rounded px-1 py-0.5 text-sm text-text hover:bg-bg focus:bg-bg focus:outline-none"
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
            <div className="flex items-center gap-3 text-sm">
              <dt className="w-24 text-xs uppercase tracking-wider text-text-muted">
                Status
              </dt>
              <dd className="text-text-soft">{isDone ? "Completed" : "Active"}</dd>
            </div>
          </dl>

          {/* Description — borderless, types like prose */}
          <div className="mb-7">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
              Description
            </h2>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={commitDescription}
              placeholder="What's this task about? Sam will refine this as you chat."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-text leading-relaxed placeholder:text-text-muted focus:outline-none break-words py-1"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
          </div>

          {/* Subtasks */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Subtasks
            </h2>
            <ul className="space-y-0.5">
              {subtasks.map((sub) => {
                const done = sub.status === "completed";
                return (
                  <li
                    key={sub.id}
                    className="group flex items-center gap-2.5 px-1 py-1.5 rounded hover:bg-bg"
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
                      className={`flex-1 text-sm break-words ${done ? "line-through text-text-muted" : "text-text"}`}
                    >
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(sub.id)}
                      aria-label="Delete subtask"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-text-muted hover:text-red-600 px-1"
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
              <li className="flex items-center gap-2.5 px-1 py-1.5">
                <span
                  className="shrink-0 w-4 h-4 inline-flex items-center justify-center text-text-muted"
                  aria-hidden="true"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  onBlur={() => {
                    if (newSubtask.trim()) handleAddSubtask();
                  }}
                  aria-label="Add subtask"
                  className="flex-1 bg-transparent text-sm text-text focus:outline-none"
                />
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
