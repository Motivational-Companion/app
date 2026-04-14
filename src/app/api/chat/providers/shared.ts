/**
 * Shared helpers for the chat API route. The provider-specific files
 * (anthropic.ts, moonshot.ts) both use these to build the system prompt,
 * detect duplicate notes, and emit the common SSE event shape to the
 * client.
 *
 * The event shape the client (TextConversation.tsx) expects:
 *   { type: "text", content: string }
 *   { type: "note", tool: string, data: { title: string, timeframe?: string } }
 *   { type: "done", stop_reason: string }
 *   { type: "error", message: string }
 */
import {
  SAM_TEXT_SYSTEM_PROMPT,
  SAM_CHECKIN_SYSTEM_PROMPT,
} from "@/lib/sam-prompt";

export type ChatMode = "chat" | "checkin";

export type NotedItem = { tool: string; title: string };

export type TaskFocusPayload = {
  taskId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  subtasks?: Array<{ title: string; status: string }>;
  parent?: { title: string; listType: "issue" | "goal" | "task" } | null;
};

export type ChatRequestBody = {
  messages: Array<{ role: string; content: string }>;
  onboardingContext?: Record<string, unknown>;
  mode?: string;
  taskContext?: string;
  existingTasks?: string;
  taskFocus?: TaskFocusPayload;
};

/**
 * Build the full system prompt for the given chat mode, merging in the
 * optional onboarding context, active-task context, and existing-board
 * context so Sam stays coherent across conversations.
 */
export function buildSystemPrompt(
  chatMode: ChatMode,
  onboardingContext?: Record<string, unknown>,
  taskContext?: string,
  existingTasks?: string,
  taskFocus?: TaskFocusPayload
): string {
  let systemPrompt =
    chatMode === "checkin" ? SAM_CHECKIN_SYSTEM_PROMPT : SAM_TEXT_SYSTEM_PROMPT;

  if (onboardingContext) {
    const context = buildOnboardingContext(onboardingContext);
    if (context) {
      systemPrompt += `\n\n## User Context (from onboarding quiz)\nThe user already shared the following before this conversation. Use this to personalize your approach, but don't repeat it back to them all at once. Weave it in naturally.\n${context}`;
    }
  }

  if (taskContext) {
    systemPrompt += `\n\n## Current Tasks\nThese are the user's active tasks from previous conversations. Reference them during the check-in to ask what got done and what didn't.\n${taskContext}`;
  }

  if (existingTasks) {
    systemPrompt += `\n\n## Existing Board Items\nThe user already has these items on their board (format: "[id] title"):\n${existingTasks}\nDo NOT re-note items that are already on their board. Only use note tools for NEW items. If the user refines one of the existing items (changes scope, deadline, or phrasing), call the matching note tool with that item's id so the row updates in place instead of duplicating.`;
  }

  if (taskFocus) {
    const subtasks =
      taskFocus.subtasks && taskFocus.subtasks.length > 0
        ? taskFocus.subtasks
            .map((s) => `- [${s.status === "completed" ? "x" : " "}] ${s.title}`)
            .join("\n")
        : "(none yet)";
    const due = taskFocus.dueDate ? `\nDue: ${taskFocus.dueDate}` : "";
    const desc = taskFocus.description
      ? `\n\nCurrent description:\n${taskFocus.description}`
      : "\n\n(No description yet.)";
    const parent = taskFocus.parent
      ? `\nThis task rolls up to the ${taskFocus.parent.listType}: "${taskFocus.parent.title}".`
      : "";
    systemPrompt += `\n\n## Current Task Focus\nYou are helping the user work on this specific task. Stay focused on it. Ask clarifying questions about scope, timeline, and approach. Break it into concrete subtasks if that helps the user move.${parent}\n\nTask: "${taskFocus.title}"${due}${desc}\n\nSubtasks:\n${subtasks}\n\nWhen the conversation reveals meaningful new detail (scope, timeline, approach, constraints), call the update_task_description tool with a refined description that captures the full context. This description is what the user (and you) will read when returning to this task later, so write it as durable context, not as a summary of this chat.`;
  }

  return systemPrompt;
}

function buildOnboardingContext(ctx: Record<string, unknown>): string {
  const parts: string[] = [];

  if (ctx.bringYouHere) {
    const labels: Record<string, string> = {
      overwhelmed: "feeling overwhelmed",
      stuck: "feeling stuck",
      clarity: "seeking clarity",
      accountable: "wanting accountability",
    };
    parts.push(
      `They came here because they're ${labels[ctx.bringYouHere as string] || ctx.bringYouHere}.`
    );
  }

  if (Array.isArray(ctx.lookLike) && ctx.lookLike.length > 0) {
    parts.push(`What that looks like for them: ${ctx.lookLike.join(", ")}.`);
  }

  if (Array.isArray(ctx.obstacles) && ctx.obstacles.length > 0) {
    parts.push(`Their obstacles: ${ctx.obstacles.join(", ")}.`);
  }

  if (Array.isArray(ctx.triedBefore) && ctx.triedBefore.length > 0) {
    parts.push(`They've tried: ${ctx.triedBefore.join(", ")}.`);
  }

  if (ctx.vision) {
    parts.push(`Their 90-day vision: "${ctx.vision}"`);
  }

  if (ctx.priorityArea) {
    const areas: Record<string, string> = {
      career: "career and work",
      health: "health and wellbeing",
      growth: "personal growth",
      relationships: "relationships and family",
    };
    parts.push(
      `Priority area: ${areas[ctx.priorityArea as string] || ctx.priorityArea}.`
    );
  }

  if (ctx.coachingStyle) {
    const styles: Record<string, string> = {
      warm: "warm and encouraging",
      direct: "direct and no-nonsense",
      thoughtful: "thoughtful and strategic",
    };
    parts.push(
      `Preferred coaching style: ${styles[ctx.coachingStyle as string] || ctx.coachingStyle}.`
    );
  }

  if (ctx.checkinTime) {
    parts.push(`Preferred check-in time: ${ctx.checkinTime}.`);
  }

  return parts.join(" ");
}

/**
 * Detect whether a new note title is a near-duplicate of something
 * already noted in this conversation. We compare normalized lowercase
 * strings and accept either substring direction so small rephrasings
 * ("gym tomorrow" vs "go to gym tomorrow") dedupe correctly.
 */
export function isDuplicateNote(
  notedItems: NotedItem[],
  title: string
): boolean {
  const incoming = title.toLowerCase().trim();
  if (!incoming) return false;
  return notedItems.some((n) => {
    const existing = n.title.toLowerCase().trim();
    return (
      existing === incoming ||
      existing.includes(incoming) ||
      incoming.includes(existing)
    );
  });
}

/**
 * Wrap an async provider function so any thrown error is converted to
 * an error SSE event and the stream is closed cleanly. Keeps the
 * per-provider code focused on the happy path.
 */
export function makeSseResponse(
  generate: (send: (data: Record<string, unknown>) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await generate(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
