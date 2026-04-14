"use client";

import type { ReactNode } from "react";
import type { NoteItem } from "@/components/LiveLists";
import FocusPanelList from "@/components/FocusPanelList";

type ListKey = "issues" | "goals" | "tasks";

type Props = {
  /**
   * The chat component rendered in the left pane. Pass a
   * <TextConversation embedded /> so it drops its own shell.
   */
  children: ReactNode;
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  completedIds: Set<string>;
  onToggleDone: (listKey: ListKey, id: string) => void;
  onDelete: (listKey: ListKey, id: string) => void;
  onSuggestionClick?: (text: string) => void;
};

const SUGGESTIONS = [
  "I'm feeling stretched thin and need to get organized.",
  "There's a big thing on my plate this week and I do not know where to start.",
  "I keep putting off the same task and it's making me anxious.",
];

/**
 * Full-bleed workspace layout. Lives below AppHeader (which takes 64px).
 * Mobile: chat fills the viewport. Desktop: chat pane (520px) + focus panel
 * (flex-1) side-by-side, separated by a single vertical divider.
 */
export default function SplitPaneChatLayout({
  children,
  issues,
  goals,
  tasks,
  completedIds,
  onToggleDone,
  onDelete,
  onSuggestionClick,
}: Props) {
  const totalItems = issues.length + goals.length + tasks.length;

  return (
    <div className="h-[calc(100dvh-56px)] md:h-[calc(100dvh-64px)] md:grid md:grid-cols-[520px_1fr] bg-bg">
      <section className="h-full md:border-r md:border-border bg-card flex flex-col overflow-hidden">
        {children}
      </section>

      <aside className="hidden md:flex md:flex-col md:h-full bg-bg overflow-y-auto">
        <div className="p-6 md:p-8 w-full max-w-[720px]">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-text">
              Your focus
            </h2>
            {totalItems > 0 && (
              <span className="text-xs text-text-muted">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          {totalItems === 0 ? (
            <div className="py-6">
              <p className="text-sm text-text-soft max-w-md mb-6 leading-relaxed">
                This is where your issues, goals, and to-dos will show up as
                you brain dump with Sam.
              </p>
              {onSuggestionClick && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                    Not sure what to say? Try one of these
                  </p>
                  <div className="space-y-2">
                    {SUGGESTIONS.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => onSuggestionClick(text)}
                        className="w-full text-left text-sm text-text bg-card hover:bg-accent-soft/40 border border-border rounded-xl px-4 py-3 transition-colors"
                      >
                        &ldquo;{text}&rdquo;
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <FocusPanelList
              issues={issues}
              goals={goals}
              tasks={tasks}
              completedIds={completedIds}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
