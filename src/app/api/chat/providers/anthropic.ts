/**
 * Anthropic (Claude) chat provider. Uses @anthropic-ai/sdk directly with
 * native tool_use format. Streams text chunks and emits note events to
 * the client as Claude calls the note_issue / note_goal / note_task
 * tools. Loops up to 5 rounds so Claude can keep talking after it notes
 * items via tool_result messages.
 *
 * This is the original implementation from the pre-refactor route.ts,
 * moved into its own provider module so the Moonshot provider can sit
 * alongside it behind a CHAT_PROVIDER env var feature flag.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  NOTE_ISSUE_TOOL,
  NOTE_GOAL_TOOL,
  NOTE_TASK_TOOL,
} from "@/lib/sam-prompt";
import {
  type ChatMode,
  type ChatRequestBody,
  type NotedItem,
  buildSystemPrompt,
  isDuplicateNote,
  makeSseResponse,
} from "./shared";

const anthropic = new Anthropic();

const NOTE_TOOLS = new Set(["note_issue", "note_goal", "note_task"]);
const MAX_TOOL_ROUNDS = 5;

export async function handleAnthropicChat(
  body: ChatRequestBody
): Promise<Response> {
  const { messages, onboardingContext, mode, taskContext, existingTasks } =
    body;
  const chatMode: ChatMode = mode === "checkin" ? "checkin" : "chat";

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  return makeSseResponse(async (send) => {
    let conversationMessages: Anthropic.MessageParam[] = messages.map(
      (m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    const allTools = [NOTE_ISSUE_TOOL, NOTE_GOAL_TOOL, NOTE_TASK_TOOL];
    const notedItems: NotedItem[] = [];

    let roundsLeft = MAX_TOOL_ROUNDS;
    while (roundsLeft-- > 0) {
      const systemPrompt = buildSystemPrompt(
        chatMode,
        onboardingContext,
        taskContext,
        existingTasks
      );

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationMessages,
        tools: allTools,
      });

      stream.on("text", (text) => {
        send({ type: "text", content: text });
      });

      const finalMessage = await stream.finalMessage();

      const toolUseBlocks = finalMessage.content.filter(
        (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
          b.type === "tool_use"
      );
      const noteBlocks = toolUseBlocks.filter((b) => NOTE_TOOLS.has(b.name));

      if (noteBlocks.length > 0) {
        for (const block of noteBlocks) {
          const input = block.input as { title: string };
          if (!isDuplicateNote(notedItems, input.title || "")) {
            send({ type: "note", tool: block.name, data: block.input });
            notedItems.push({ tool: block.name, title: input.title || "" });
          }
        }

        if (finalMessage.stop_reason === "tool_use") {
          const alreadyNoted = notedItems
            .map((n) => `${n.tool}: ${n.title}`)
            .join(", ");

          conversationMessages = [
            ...conversationMessages,
            { role: "assistant", content: finalMessage.content },
            {
              role: "user",
              content: noteBlocks.map((block) => ({
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: `Noted. The user can see it on their screen now. Already noted so far: ${alreadyNoted}. Do NOT call these tools again for items already noted.`,
              })),
            },
          ];
          continue;
        }
      }

      send({ type: "done", stop_reason: finalMessage.stop_reason ?? "stop" });
      return;
    }
  });
}
