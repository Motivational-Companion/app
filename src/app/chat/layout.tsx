import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-bg to-accent-soft/20 flex flex-col">
      <AppHeader variant="app" />
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
