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
        {/* Desktop drawer — persistent, collapsible. No onRequestClose
            on link clicks (only the explicit collapse button closes it
            on desktop), so navigating to a task keeps the drawer open. */}
        <aside
          className={`hidden ${drawerOpen ? "md:flex" : "md:hidden"} md:flex-col w-[300px] shrink-0 border-r border-border h-[100dvh] sticky top-0`}
        >
          <AppDrawer onCollapse={() => setDrawerOpen(false)} />
        </aside>

        {/* Mobile drawer — slide-over. Closes on link click. */}
        {drawerOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-20"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside className="md:hidden fixed left-0 top-0 bottom-0 w-[300px] z-30 shadow-xl">
              <AppDrawer
                onCollapse={() => setDrawerOpen(false)}
                onRequestClose={() => setDrawerOpen(false)}
              />
            </aside>
          </>
        )}

        <div className="flex-1 min-h-0 min-w-0 relative">
          {/* Open-drawer toggle. Only renders when the drawer is closed
              — when open, the same control lives inside the drawer's
              sticky header (so the icon is always next to the drawer's
              edge, never over the chat). */}
          {!drawerOpen && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open sidebar"
              className="absolute top-2 left-2 z-30 h-9 w-9 flex items-center justify-center text-text-soft hover:text-text rounded-lg bg-bg/70 backdrop-blur hover:bg-card transition-colors"
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
          )}
          <main
            className={`h-full min-h-[100dvh] min-w-0 ${
              drawerOpen ? "" : "pl-12"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </TaskStateProvider>
  );
}
