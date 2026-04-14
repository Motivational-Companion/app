"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AppDrawer from "@/components/AppDrawer";
import { TaskStateProvider } from "@/lib/task-state";

export default function ChatLayout({ children }: { children: ReactNode }) {
  // Drawer is open by default on desktop, closed on mobile. One state
  // serves both surfaces; CSS decides whether it's a slide-over or a
  // persistent sidebar.
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDrawerOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  return (
    <TaskStateProvider>
      <div className="min-h-[100dvh] bg-bg flex">
        {/* Desktop drawer — persistent, collapsible */}
        <aside
          className={`hidden ${drawerOpen ? "md:flex" : "md:hidden"} md:flex-col w-[280px] shrink-0 border-r border-border h-[100dvh] sticky top-0`}
        >
          <AppDrawer onRequestClose={() => setDrawerOpen(false)} />
        </aside>

        {/* Mobile drawer — slide-over */}
        {drawerOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-20"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside className="md:hidden fixed left-0 top-0 bottom-0 w-[280px] z-30 shadow-xl">
              <AppDrawer onRequestClose={() => setDrawerOpen(false)} />
            </aside>
          </>
        )}

        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          {/* Thin sticky top bar — just the drawer toggle. No logo,
              no account chip (both live in the drawer). */}
          <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur px-2 py-2">
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? "Close sidebar" : "Open sidebar"}
              className="h-9 w-9 flex items-center justify-center text-text-soft hover:text-text rounded-lg hover:bg-card transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
          <main className="flex-1 min-h-0 min-w-0">{children}</main>
        </div>
      </div>
    </TaskStateProvider>
  );
}
