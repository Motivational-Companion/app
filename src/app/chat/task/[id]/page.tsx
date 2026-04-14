"use client";

import { useParams } from "next/navigation";
import TaskDetailPane from "@/components/TaskDetailPane";

export default function TaskDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  if (!id) return null;
  return <TaskDetailPane taskId={id} />;
}
