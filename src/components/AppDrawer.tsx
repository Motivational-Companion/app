"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/supabase/useAuth";
import { useTaskState, type ListKey } from "@/lib/task-state";
import type { NoteItem } from "@/components/LiveLists";

type Props = {
  /** Mobile only: close the slide-over after a link click. Desktop
      drawer should NOT collapse on link clicks. */
  onRequestClose?: () => void;
  /** Explicit "collapse the drawer" button handler. Renders the
      collapse icon in the sticky header when provided. */
  onCollapse?: () => void;
};

type SectionKey = ListKey;

const SECTIONS: ReadonlyArray<{
  key: SectionKey;
  label: string;
  emptyHint: string;
  dotClass: string;
}> = [
  {
    key: "goals",
    label: "Goals",
    emptyHint: "No goals yet. Mention one in chat and Sam will pick it up.",
    dotClass: "bg-accent",
  },
  {
    key: "tasks",
    label: "To-dos",
    emptyHint: "No to-dos yet. Sam will note concrete actions as they come up.",
    dotClass: "bg-primary",
  },
  {
    key: "issues",
    label: "Issues",
    emptyHint: "No issues noted yet.",
    dotClass: "bg-accent-soft",
  },
];

export default function AppDrawer({ onRequestClose, onCollapse }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { issues, goals, tasks, completedIds, loading } = useTaskState();

  const buckets: Record<SectionKey, NoteItem[]> = { issues, goals, tasks };

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    goals: true,
    tasks: true,
    issues: false,
  });

  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? "?";
  const activeTaskId = (() => {
    const match = pathname?.match(/^\/chat\/task\/([^/?#]+)/);
    return match?.[1] ?? null;
  })();

  return (
    <div className="h-full flex flex-col bg-card md:bg-bg">
      {/* Sticky header: collapse toggle + primary destination */}
      <div className="shrink-0 px-3 pt-2 pb-3 border-b border-border">
        {onCollapse && (
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="h-9 w-9 flex items-center justify-center text-text-soft hover:text-text rounded-lg hover:bg-card md:hover:bg-card transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v2" />
                <path d="M9 9v1" />
                <path d="M9 14v1" />
                <path d="M9 19v2" />
              </svg>
            </button>
          </div>
        )}
        <Link
          href="/chat"
          onClick={onRequestClose}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            pathname === "/chat"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card md:bg-card text-text hover:border-primary/40"
          }`}
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-accent to-primary text-white text-[10px] font-semibold shrink-0"
            aria-hidden="true"
          >
            S
          </span>
          Talk with Sam
        </Link>
      </div>

      {/* Scrollable middle — sections */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
        {SECTIONS.map((section) => {
          const items = buckets[section.key];
          const isOpen = open[section.key];
          return (
            <section key={section.key}>
              <button
                type="button"
                onClick={() => toggle(section.key)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-soft hover:bg-bg md:hover:bg-card transition-colors"
                aria-expanded={isOpen}
              >
                <span
                  className={`w-5 h-5 flex items-center justify-center text-text-muted transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <polygon points="2,1 9,5 2,9" />
                  </svg>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                  {section.label}
                </span>
                {items.length > 0 && (
                  <span className="text-xs text-text-muted tabular-nums">
                    {items.length}
                  </span>
                )}
              </button>

              {isOpen && (
                <ul className="mt-1 space-y-0.5">
                  {loading ? (
                    <li className="px-5 py-1.5 text-xs text-text-muted">
                      Loading…
                    </li>
                  ) : items.length === 0 ? (
                    <li className="px-5 py-1.5 text-xs text-text-muted leading-relaxed">
                      {section.emptyHint}
                    </li>
                  ) : (
                    items.map((item) => {
                      const isActive = activeTaskId === item.id;
                      const isDone = completedIds.has(item.id);
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/chat/task/${item.id}`}
                            onClick={onRequestClose}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-text hover:bg-bg md:hover:bg-card"
                            }`}
                          >
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${section.dotClass}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`flex-1 truncate ${
                                isDone ? "line-through text-text-muted" : ""
                              }`}
                            >
                              {item.text}
                            </span>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Sticky footer — account chip. Sign-out lives on /account. */}
      <div className="shrink-0 border-t border-border px-3 py-3">
        <Link
          href="/account"
          onClick={onRequestClose}
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
            pathname === "/account"
              ? "bg-primary/10"
              : "hover:bg-bg md:hover:bg-card"
          }`}
        >
          <span className="w-8 h-8 rounded-full bg-accent-soft text-primary text-sm font-semibold flex items-center justify-center shrink-0">
            {emailInitial}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-text truncate">
              Account
            </span>
            <span className="block text-xs text-text-muted">Settings</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
