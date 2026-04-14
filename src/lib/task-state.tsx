"use client";

/**
 * Shared client-side task state for the /chat surface. The drawer,
 * the home chat, and every task detail page read from one source of
 * truth and push mutations back through the same hook so the UI
 * stays consistent without prop drilling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { NoteItem } from "@/components/LiveLists";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  saveTasks,
  loadActiveTasks,
  updateTaskStatus,
  updateTaskFields,
  deleteTask,
} from "@/lib/supabase/data";

export type ListKey = "issues" | "goals" | "tasks";

type TaskBuckets = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
};

const EMPTY: TaskBuckets = { issues: [], goals: [], tasks: [] };

type TaskStateValue = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  completedIds: Set<string>;
  loading: boolean;
  handleNoteAdded: (listKey: ListKey, item: NoteItem) => void;
  handleNoteUpdated: (listKey: ListKey, item: NoteItem) => void;
  handleToggleDone: (listKey: ListKey, id: string) => Promise<void>;
  handleDeleteTask: (listKey: ListKey, id: string) => Promise<void>;
};

const TaskStateContext = createContext<TaskStateValue | null>(null);

export function TaskStateProvider({ children }: { children: ReactNode }) {
  const { user, supabase } = useAuth();
  const [buckets, setBuckets] = useState<TaskBuckets>(EMPTY);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user || !supabase || loadedRef.current) return;
    loadedRef.current = true;
    loadActiveTasks(supabase, user.id).then((result) => {
      setBuckets(result);
      setLoading(false);
    });
  }, [user, supabase]);

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
      setBuckets((prev) => ({
        ...prev,
        [listKey]: [...prev[listKey], item],
      }));
    },
    [user, supabase]
  );

  const handleNoteUpdated = useCallback(
    (listKey: ListKey, item: NoteItem) => {
      setBuckets((prev) => ({
        ...prev,
        [listKey]: prev[listKey].map((row) =>
          row.id === item.id ? item : row
        ),
      }));
      if (!supabase) return;
      updateTaskFields(supabase, item.id, {
        title: item.text,
        timeframe: item.timeframe ?? null,
      }).catch((err) =>
        console.error("Failed to persist task update:", err)
      );
    },
    [supabase]
  );

  const handleToggleDone = useCallback(
    async (_listKey: ListKey, id: string) => {
      const wasCompleted = completedIds.has(id);
      setCompletedIds((prev) => {
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
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [completedIds, user, supabase]
  );

  const handleDeleteTask = useCallback(
    async (listKey: ListKey, id: string) => {
      const previousItems = buckets[listKey];
      const wasCompleted = completedIds.has(id);

      setBuckets((prev) => ({
        ...prev,
        [listKey]: prev[listKey].filter((item) => item.id !== id),
      }));
      if (wasCompleted) {
        setCompletedIds((prev) => {
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
        setBuckets((prev) => ({ ...prev, [listKey]: previousItems }));
        if (wasCompleted) {
          setCompletedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }
      }
    },
    [buckets, completedIds, user, supabase]
  );

  const value = useMemo<TaskStateValue>(
    () => ({
      issues: buckets.issues,
      goals: buckets.goals,
      tasks: buckets.tasks,
      completedIds,
      loading,
      handleNoteAdded,
      handleNoteUpdated,
      handleToggleDone,
      handleDeleteTask,
    }),
    [
      buckets,
      completedIds,
      loading,
      handleNoteAdded,
      handleNoteUpdated,
      handleToggleDone,
      handleDeleteTask,
    ]
  );

  return (
    <TaskStateContext.Provider value={value}>
      {children}
    </TaskStateContext.Provider>
  );
}

export function useTaskState(): TaskStateValue {
  const ctx = useContext(TaskStateContext);
  if (!ctx) {
    throw new Error("useTaskState must be used inside TaskStateProvider");
  }
  return ctx;
}
