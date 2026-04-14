/**
 * Anthropic (Claude) chat provider. Uses @anthropic-ai/sdk directly with
 * native tool_use format. Streams text chunks and emits note + task_update
 * events to the client as Claude calls the note_issue / note_goal /
 * note_task / update_task_description tools. Loops up to 5 rounds so
 * Claude can keep talking after it uses tools via tool_result messages.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  NOTE_ISSUE_TOOL,
  NOTE_GOAL_TOOL,
  NOTE_TASK_TOOL,
  UPDATE_TASK_DESCRIPTION_TOOL,
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
const TASK_UPDATE_TOOL = "update_task_description";
const MAX_TOOL_ROUNDS = 5;

export async function handleAnthropicChat(
  body: ChatRequestBody
): Promise<Response> {
  const {
    messages,
    onboardingContext,
    mode,
    taskContext,
    existingTasks,
    taskFocus,
  } = body;
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

    // Task-focus chats expose the update_task_description tool on top
    // of the note tools. Global brain-dump chats only get the note tools.
    const allTools = taskFocus
      ? [NOTE_ISSUE_TOOL, NOTE_GOAL_TOOL, NOTE_TASK_TOOL, UPDATE_TASK_DESCRIPTION_TOOL]
      : [NOTE_ISSUE_TOOL, NOTE_GOAL_TOOL, NOTE_TASK_TOOL];
    const notedItems: NotedItem[] = [];

    let roundsLeft = MAX_TOOL_ROUNDS;
    while (roundsLeft-- > 0) {
      const systemPrompt = buildSystemPrompt(
        chatMode,
        onboardingContext,
        taskContext,
        existingTasks,
        taskFocus
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
      const taskUpdateBlocks = toolUseBlocks.filter(
        (b) => b.name === TASK_UPDATE_TOOL
      );

      for (const block of noteBlocks) {
        const input = block.input as { title: string };
        if (!isDuplicateNote(notedItems, input.title || "")) {
          send({ type: "note", tool: block.name, data: block.input });
          notedItems.push({ tool: block.name, title: input.title || "" });
        }
      }

      for (const block of taskUpdateBlocks) {
        const input = block.input as { description: string };
        if (taskFocus && typeof input.description === "string") {
          send({
            type: "task_update",
            taskId: taskFocus.taskId,
            description: input.description,
          });
        }
      }

      const usedAnyTool = noteBlocks.length > 0 || taskUpdateBlocks.length > 0;

      if (usedAnyTool && finalMessage.stop_reason === "tool_use") {
        const alreadyNoted = notedItems
          .map((n) => `${n.tool}: ${n.title}`)
          .join(", ");
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of noteBlocks) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Noted. The user can see it on their screen now. Already noted so far: ${alreadyNoted}. Do NOT call these tools again for items already noted.`,
          });
        }
        for (const block of taskUpdateBlocks) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content:
              "Description updated. The pane shows it live. Keep the conversation natural.",
          });
        }

        conversationMessages = [
          ...conversationMessages,
          { role: "assistant", content: finalMessage.content },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      send({ type: "done", stop_reason: finalMessage.stop_reason ?? "stop" });
      return;
    }
  });
}
