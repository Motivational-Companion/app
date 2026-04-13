"use client";

import type { ReactNode } from "react";
import type { NoteItem } from "@/components/LiveLists";
import FocusPanelList from "@/components/FocusPanelList";

type ListKey = "issues" | "goals" | "tasks";

type Props = {
  /**
   * The chat component rendered inside the left card. Pass a
   * <TextConversation embedded /> so it drops its own shell and
   * inherits the card chrome from this layout.
   */
  children: ReactNode;
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  completedIds: Set<string>;
  onToggleDone: (listKey: ListKey, id: string) => void;
  onDelete: (listKey: ListKey, id: string) => void;
  /**
   * Optional: if provided, clicking a suggestion in the empty state
   * fills the chat input with the suggestion text. Used for first-time
   * users who do not know what to type.
   */
  onSuggestionClick?: (text: string) => void;
};

const SUGGESTIONS = [
  "I'm feeling stretched thin and need to get organized.",
  "There's a big thing on my plate this week and I do not know where to start.",
  "I keep putting off the same task and it's making me anxious.",
];

/**
 * Responsive layout for the authenticated chat experience.
 *
 * Mobile (<md): the chat fills the viewport (w-full, h-[100dvh]) with no
 * card chrome, and the child (TextConversation embedded) renders its own
 * collapsible task bar at the bottom so users can still access their
 * focus items. The dedicated focus panel is hidden on mobile.
 *
 * Desktop (>=md): renders a split pane — chat card on the left (520px
 * fixed width, max 900px tall, rounded + shadow + border), live focus
 * panel on the right (flex-1, same height). The chat component's inline
 * collapsible task bar is hidden on desktop (md:hidden) so the focus
 * panel is the single source of truth for the task list.
 *
 * The children are rendered exactly once — no double mounting, no
 * double-instance chat state. Responsive behavior is CSS-only.
 *
 * Focus panel is interactive: click a task circle to mark it done
 * (persists via onToggleDone callback), hover to reveal a delete button
 * (persists via onDelete callback). Done items show with strikethrough
 * and muted color but stay in the list so users can un-done them.
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
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-6 md:px-4">
      <div className="w-full max-w-[480px] md:max-w-[1200px] md:flex md:gap-6">
        {/* Chat card — phone width on mobile, fixed 520px on desktop */}
        <div className="w-full md:w-[520px] md:shrink-0 h-[100dvh] md:h-[calc(100dvh-3rem)] md:max-h-[900px] bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Focus panel — desktop only */}
        <aside className="hidden md:flex md:flex-col md:flex-1 md:min-w-0 md:h-[calc(100dvh-3rem)] md:max-h-[900px] bg-card rounded-3xl shadow-xl border border-border overflow-y-auto">
          <div className="p-6 w-full">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold text-text">
                Your focus
              </h2>
              {totalItems > 0 && (
                <span className="text-xs text-text-muted">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            {totalItems === 0 ? (
              <div className="py-8">
                <p className="text-sm text-text-soft max-w-xs mb-5 leading-relaxed">
                  This is where your issues, goals, and to-dos will show up
                  as you brain dump with Sam.
                </p>
                {onSuggestionClick && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                      Not sure what to say? Try one of these
                    </p>
                    <div className="space-y-2">
                      {SUGGESTIONS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => onSuggestionClick(text)}
                          className="w-full text-left text-sm text-text bg-bg hover:bg-accent-soft/40 border border-border rounded-xl px-4 py-3 transition-colors"
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
    </div>
  );
}
