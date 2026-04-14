"use client";

import type { NoteItem } from "@/components/LiveLists";

type ListKey = "issues" | "goals" | "tasks";

type ListConfig = {
  title: string;
  color: string;
  dotColor: string;
  showTimeframe?: boolean;
};

const LIST_CONFIGS: Record<ListKey, ListConfig> = {
  issues: {
    title: "Issues",
    color: "text-text-soft",
    dotColor: "bg-accent-soft",
  },
  goals: {
    title: "Goals",
    color: "text-text-soft",
    dotColor: "bg-accent",
  },
  tasks: {
    title: "To-dos",
    color: "text-text-soft",
    dotColor: "bg-primary",
    showTimeframe: true,
  },
};

type Props = {
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  completedIds: Set<string>;
  onToggleDone: (listKey: ListKey, id: string) => void;
  onDelete: (listKey: ListKey, id: string) => void;
};

/**
 * Interactive focus panel list. Users can click the checkbox to toggle a
 * task as done (persists to Supabase) and hover to reveal a delete button.
 * Done items show with a strikethrough and muted color.
 *
 * Groups items by list key (issues → goals → to-dos). Within each group,
 * active items come first, completed items below with reduced opacity.
 */
export default function FocusPanelList({
  issues,
  goals,
  tasks,
  completedIds,
  onToggleDone,
  onDelete,
}: Props) {
  const renderGroup = (listKey: ListKey, items: NoteItem[]) => {
    if (items.length === 0) return null;
    const config = LIST_CONFIGS[listKey];

    // Split active vs completed; active first
    const active = items.filter((i) => !completedIds.has(i.id));
    const completed = items.filter((i) => completedIds.has(i.id));
    const ordered = [...active, ...completed];

    return (
      <section className="mb-6 last:mb-0">
        <header className="flex items-center gap-2 mb-2">
          <span className={`inline-block w-2 h-2 rounded-full ${config.dotColor}`} />
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
            {config.title}
          </h3>
          <span className="text-xs text-text-muted">({items.length})</span>
        </header>

        <ul className="space-y-1">
          {ordered.map((item) => {
            const isDone = completedIds.has(item.id);
            return (
              <li
                key={item.id}
                className={`group flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-card/60 transition-colors ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleDone(listKey, item.id)}
                  aria-label={isDone ? "Mark as not done" : "Mark as done"}
                  aria-pressed={isDone}
                  className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
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

                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-text leading-snug ${isDone ? "line-through" : ""}`}>
                    {item.text}
                  </p>
                  {config.showTimeframe && item.timeframe && !isDone && (
                    <p className="text-xs text-text-muted mt-0.5">{item.timeframe}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDelete(listKey, item.id)}
                  aria-label="Delete"
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-600 hover:bg-red-50"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div>
      {renderGroup("issues", issues)}
      {renderGroup("goals", goals)}
      {renderGroup("tasks", tasks)}
    </div>
  );
}
