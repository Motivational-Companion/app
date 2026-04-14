"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import AppDrawer from "@/components/AppDrawer";
import { TaskStateProvider } from "@/lib/task-state";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <TaskStateProvider>
      <div className="min-h-[100dvh] bg-bg flex flex-col">
        <AppHeader
          variant="app"
          onToggleDrawer={() => setDrawerOpen((v) => !v)}
        />
        <div className="flex-1 min-h-0 flex">
          {/* Desktop drawer — persistent sidebar */}
          <aside className="hidden md:flex md:flex-col w-[280px] shrink-0 border-r border-border">
            <AppDrawer />
          </aside>

          {/* Mobile drawer — slide-over */}
          {drawerOpen && (
            <>
              <div
                className="md:hidden fixed inset-0 top-14 bg-black/30 z-20"
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <aside className="md:hidden fixed left-0 top-14 bottom-0 w-[280px] z-30 shadow-xl">
                <AppDrawer onRequestClose={() => setDrawerOpen(false)} />
              </aside>
            </>
          )}

          <main className="flex-1 min-h-0 min-w-0">{children}</main>
        </div>
      </div>
    </TaskStateProvider>
  );
}
