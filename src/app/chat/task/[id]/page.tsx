"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

/**
 * Task detail pane. Placeholder in this commit — the real UI
 * (title, description, due date, subtasks, scoped chat) lands in
 * the next commit.
 */
export default function TaskDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="h-full flex flex-col max-w-[780px] mx-auto w-full px-6 py-10">
      <Link href="/chat" className="text-sm text-text-muted hover:text-text mb-4">
        &larr; Home
      </Link>
      <h1 className="font-display text-2xl font-semibold text-text mb-2">
        Task detail
      </h1>
      <p className="text-sm text-text-muted mb-6">
        Task id: <code className="text-text">{id}</code>
      </p>
      <p className="text-sm text-text-soft">
        Coming in the next commit: inline title, description, due date,
        subtasks, and a scoped chat thread for this task.
      </p>
    </div>
  );
}
