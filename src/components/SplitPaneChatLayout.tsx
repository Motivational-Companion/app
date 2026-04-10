"use client";

import type { ReactNode } from "react";
import type { NoteItem } from "@/components/LiveLists";
import LiveLists from "@/components/LiveLists";

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
  onRemove?: (listKey: ListKey, id: string) => void;
  onReorder?: (listKey: ListKey, id: string, direction: "up" | "down") => void;
};

/**
 * Responsive layout for the authenticated chat experience.
 *
 * Mobile (<md): renders the chat as a full-width phone-card, and the
 * child (TextConversation embedded) shows its own collapsible task bar.
 * The dedicated focus panel is hidden.
 *
 * Desktop (>=md): renders a split pane — chat card on the left (520px
 * fixed), live focus panel on the right (flex-1). The chat component's
 * inline collapsible task bar is hidden on desktop via its own CSS so
 * the focus panel is the single source of truth.
 *
 * The children are rendered exactly once — no double mounting, no
 * double-instance chat state. Responsive behavior is CSS-only.
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
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-6 md:px-4">
      <div className="w-full max-w-[480px] md:max-w-[1200px] md:flex md:gap-6">
        {/* Chat card — phone width on mobile, fixed 520px on desktop */}
        <div className="w-full md:w-[520px] md:shrink-0 h-[100dvh] md:h-[calc(100dvh-3rem)] md:max-h-[900px] bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col overflow-hidden">
          {children}
        </div>

        {/* Focus panel — desktop only */}
        <aside className="hidden md:flex md:flex-1 md:min-w-0 md:h-[calc(100dvh-3rem)] md:max-h-[900px] bg-card rounded-3xl shadow-xl border border-border overflow-y-auto">
          <div className="p-6 w-full">
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
