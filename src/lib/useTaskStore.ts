"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { NoteItem } from "@/components/LiveLists";

type ListKey = "issues" | "goals" | "tasks";

type TaskStoreData = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  completedIds: string[];
  vision: string | null;
};

const STORAGE_KEY = "sam_tasks";

function loadFromStorage(): TaskStoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { issues: [], goals: [], tasks: [], completedIds: [], vision: null };
}

function saveToStorage(data: TaskStoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useTaskStore() {
  const [issues, setIssues] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<NoteItem[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [vision, setVisionState] = useState<string | null>(null);
  const loaded = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const data = loadFromStorage();
    setIssues(data.issues);
    setGoals(data.goals);
    setTasks(data.tasks);
    setCompletedIds(new Set(data.completedIds));
    setVisionState(data.vision);
    loaded.current = true;
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (!loaded.current) return;
    saveToStorage({
      issues,
      goals,
      tasks,
      completedIds: Array.from(completedIds),
      vision,
    });
  }, [issues, goals, tasks, completedIds, vision]);

  const getList = useCallback(
    (key: ListKey) => (key === "issues" ? issues : key === "goals" ? goals : tasks),
    [issues, goals, tasks]
  );

  const getSetter = (key: ListKey) =>
    key === "issues" ? setIssues : key === "goals" ? setGoals : setTasks;

  const addItem = useCallback((listKey: ListKey, item: NoteItem) => {
    const setter = listKey === "issues" ? setIssues : listKey === "goals" ? setGoals : setTasks;
    setter((prev) => {
      // Deduplicate
      if (prev.some((p) => p.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((listKey: ListKey, id: string) => {
    const setter = listKey === "issues" ? setIssues : listKey === "goals" ? setGoals : setTasks;
    setter((prev) => prev.filter((item) => item.id !== id));
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const reorder = useCallback((listKey: ListKey, id: string, direction: "up" | "down") => {
    const setter = listKey === "issues" ? setIssues : listKey === "goals" ? setGoals : setTasks;
    setter((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const setVision = useCallback((v: string) => {
    setVisionState(v);
  }, []);

  return {
    issues,
    goals,
    tasks,
    addItem,
    removeItem,
    toggleComplete,
    completedIds,
    reorder,
    vision,
    setVision,
    loaded: loaded.current,
  };
}
