import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      <AppHeader variant="app" />
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
