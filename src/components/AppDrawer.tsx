"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/supabase/useAuth";
import { useTaskState, type ListKey } from "@/lib/task-state";
import type { NoteItem } from "@/components/LiveLists";

type Props = {
  /** Close the drawer (mobile only — desktop keeps it open). */
  onRequestClose?: () => void;
};

type SectionKey = ListKey;

const SECTIONS: ReadonlyArray<{
  key: SectionKey;
  label: string;
  defaultOpen: boolean;
  emptyHint: string;
  dotClass: string;
}> = [
  {
    key: "goals",
    label: "Goals",
    defaultOpen: true,
    emptyHint: "No goals yet. Mention one in chat and Sam will pick it up.",
    dotClass: "bg-accent",
  },
  {
    key: "tasks",
    label: "To-dos",
    defaultOpen: true,
    emptyHint: "No to-dos yet. Sam will note concrete actions as they come up.",
    dotClass: "bg-primary",
  },
  {
    key: "issues",
    label: "Issues",
    defaultOpen: false,
    emptyHint: "No issues noted yet.",
    dotClass: "bg-accent-soft",
  },
];

export default function AppDrawer({ onRequestClose }: Props) {
  const pathname = usePathname();
  const { user, supabase } = useAuth();
  const { issues, goals, tasks, completedIds, loading } = useTaskState();

  const buckets: Record<SectionKey, NoteItem[]> = { issues, goals, tasks };

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    goals: true,
    tasks: true,
    issues: false,
  });

  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  };

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? "?";
  const activeTaskId = (() => {
    const match = pathname?.match(/^\/chat\/task\/([^/?#]+)/);
    return match?.[1] ?? null;
  })();

  return (
    <div className="h-full flex flex-col bg-card md:bg-bg">
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2">
        <Link
          href="/chat"
          onClick={onRequestClose}
          className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/chat"
              ? "bg-primary/10 text-primary"
              : "text-text hover:bg-bg md:hover:bg-card"
          }`}
        >
          Home
        </Link>

        <div className="mt-4 space-y-2">
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
                    className={`w-5 h-5 flex items-center justify-center text-text-muted text-[11px] transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ▸
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
      </div>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <Link
          href="/account"
          onClick={onRequestClose}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg md:hover:bg-card transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-accent-soft text-primary text-sm font-semibold flex items-center justify-center">
            {emailInitial}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-text truncate">
              Account
            </span>
            <span className="block text-xs text-text-muted">Settings</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-1 px-2 py-1.5 text-left text-xs text-text-muted hover:text-text-soft transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
