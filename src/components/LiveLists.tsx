"use client";

import { useEffect, useState } from "react";

export type NoteItem = {
  id: string;
  text: string;
  addedAt: number;
  timeframe?: string;
  /**
   * Long-form context for the task. Set + refined inside the task
   * detail pane (manually or via Sam's update_task_description tool).
   * Surfaced into the home/global chat's prompt so Sam can pull from
   * it when the user references a task there.
   */
  description?: string | null;
};

type ListConfig = {
  title: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  showTimeframe?: boolean;
};

const LIST_CONFIGS: Record<string, ListConfig> = {
  issues: {
    title: "Issues",
    icon: "!",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  goals: {
    title: "Goals",
    icon: "\u2605",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  tasks: {
    title: "To-Dos",
    icon: "\u2713",
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/10",
    showTimeframe: true,
  },
};

type Props = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  onRemove: (listKey: "issues" | "goals" | "tasks", id: string) => void;
  onReorder: (
    listKey: "issues" | "goals" | "tasks",
    id: string,
    direction: "up" | "down"
  ) => void;
  lastAdded: string | null;
};

export default function LiveLists({
  issues,
  goals,
  tasks,
  onRemove,
  onReorder,
  lastAdded,
}: Props) {
  const total = issues.length + goals.length + tasks.length;
  if (total === 0) return null;

  return (
    <div>
      {issues.length > 0 && (
        <NoteList
          listKey="issues"
          config={LIST_CONFIGS.issues}
          items={issues}
          lastAdded={lastAdded}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      )}
      {goals.length > 0 && (
        <NoteList
          listKey="goals"
          config={LIST_CONFIGS.goals}
          items={goals}
          lastAdded={lastAdded}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      )}
      {tasks.length > 0 && (
        <NoteList
          listKey="tasks"
          config={LIST_CONFIGS.tasks}
          items={tasks}
          lastAdded={lastAdded}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      )}
    </div>
  );
}

function NoteList({
  listKey,
  config,
  items,
  lastAdded,
  onRemove,
  onReorder,
}: {
  listKey: "issues" | "goals" | "tasks";
  config: ListConfig;
  items: NoteItem[];
  lastAdded: string | null;
  onRemove: Props["onRemove"];
  onReorder: Props["onReorder"];
}) {
  // Track which item was just added for animation
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  useEffect(() => {
    if (lastAdded && items.some((i) => i.id === lastAdded)) {
      setAnimatingId(lastAdded);
      const t = setTimeout(() => setAnimatingId(null), 1500);
      return () => clearTimeout(t);
    }
  }, [lastAdded, items]);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs ${config.color}`}>{config.icon}</span>
        <span className="text-xs font-semibold text-text-soft uppercase tracking-wider">
          {config.title}
        </span>
        <span className="text-xs text-text-muted">({items.length})</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`group flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-text border ${config.border} ${config.bg} transition-all duration-500 ${
              animatingId === item.id
                ? "animate-slide-in ring-2 ring-primary/30"
                : ""
            }`}
          >
            {/* Reorder arrows */}
            <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 mr-1">
              <button
                onClick={() => onReorder(listKey, item.id, "up")}
                disabled={index === 0}
                className="text-text-muted hover:text-text disabled:opacity-20 text-[10px] leading-none p-0.5"
                aria-label="Move up"
              >
                &#9650;
              </button>
              <button
                onClick={() => onReorder(listKey, item.id, "down")}
                disabled={index === items.length - 1}
                className="text-text-muted hover:text-text disabled:opacity-20 text-[10px] leading-none p-0.5"
                aria-label="Move down"
              >
                &#9660;
              </button>
            </div>

            {/* Content */}
            <span className="flex-1">
              {item.text}
              {config.showTimeframe && item.timeframe && (
                <span className="ml-2 text-xs text-text-muted">
                  {item.timeframe}
                </span>
              )}
            </span>

            {/* Remove button */}
            <button
              onClick={() => onRemove(listKey, item.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 text-xs px-1"
              aria-label="Remove"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
