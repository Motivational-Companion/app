"use client";

import type { ReactNode } from "react";
import type { NoteItem } from "@/components/LiveLists";
import LiveLists from "@/components/LiveLists";

type ListKey = "issues" | "goals" | "tasks";

type Props = {
  /**
   * The chat component rendered inside the left card. Usually a
   * <TextConversation /> with `hideInlineLists` set.
   */
  children: ReactNode;
  issues: NoteItem[];
  goals: NoteItem[];
  tasks: NoteItem[];
  onRemove?: (listKey: ListKey, id: string) => void;
  onReorder?: (listKey: ListKey, id: string, direction: "up" | "down") => void;
};

/**
 * Desktop-only split layout that shows the chat on the left and the user's
 * live focus areas (issues, goals, to-dos) on the right. On mobile, the
 * children render full-width and the task panel is hidden (the chat
 * component is expected to show its own collapsible task bar inline on
 * mobile).
 *
 * This exists so authenticated users on desktop see the product metaphor
 * as it was intended: "a to-do list you talk to" — they talk to Sam in the
 * left pane and watch the list build in the right pane in real time.
 */
export default function SplitPaneChatLayout({
  children,
  issues,
  goals,
  tasks,
  onRemove,
  onReorder,
}: Props) {
  const totalItems = issues.length + goals.length + tasks.length;

  return (
    <div className="min-h-[100dvh] bg-bg">
      {/* Mobile: pass-through. The chat component is responsible for its
          own collapsible task bar on mobile. */}
      <div className="md:hidden">{children}</div>

      {/* Desktop: side-by-side chat + tasks */}
      <div className="hidden md:flex justify-center items-start gap-6 p-6 max-w-[1200px] mx-auto">
        {/* Chat card — fixed width for comfortable reading */}
        <div className="w-[520px] shrink-0 h-[calc(100dvh-3rem)] max-h-[900px] bg-card rounded-3xl shadow-xl border border-border overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Focus panel — flex-1, always visible */}
        <aside className="flex-1 min-w-0 h-[calc(100dvh-3rem)] max-h-[900px] bg-card rounded-3xl shadow-xl border border-border overflow-y-auto">
          <div className="p-6">
            <div className="mb-5">
              <h2 className="font-display text-xl font-semibold text-text">
                Your focus
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Items Sam captures from your conversation
              </p>
            </div>

            {totalItems === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-text-soft max-w-xs mx-auto leading-relaxed">
                  Your focus areas will appear here as you talk to Sam.
                </p>
              </div>
            ) : (
              <LiveLists
                issues={issues}
                goals={goals}
                tasks={tasks}
                onRemove={onRemove ?? (() => {})}
                onReorder={onReorder ?? (() => {})}
                lastAdded={null}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
