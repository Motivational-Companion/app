import Anthropic from "@anthropic-ai/sdk";
import {
  SAM_TEXT_SYSTEM_PROMPT,
  SAM_FIRST_MESSAGE,
  EXTRACT_ACTION_PLAN_TOOL,
  NOTE_ISSUE_TOOL,
  NOTE_GOAL_TOOL,
  NOTE_TASK_TOOL,
} from "@/lib/sam-prompt";

const anthropic = new Anthropic();

const NOTE_TOOLS = new Set(["note_issue", "note_goal", "note_task"]);

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Build the conversation messages for Claude
        let conversationMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );

        const allTools = [
          EXTRACT_ACTION_PLAN_TOOL,
          NOTE_ISSUE_TOOL,
          NOTE_GOAL_TOOL,
          NOTE_TASK_TOOL,
        ];

        // Loop to handle tool use: Claude may call note tools, we process them
        // and let Claude continue talking
        let maxRounds = 5;
        while (maxRounds-- > 0) {
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: SAM_TEXT_SYSTEM_PROMPT,
            messages: conversationMessages,
            tools: allTools,
          });

          // Stream text chunks to client
          stream.on("text", (text) => {
            send({ type: "text", content: text });
          });

          const finalMessage = await stream.finalMessage();

          // Check if Claude called any tools
          const toolUseBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
              b.type === "tool_use"
          );

          // Check for extract_action_plan (final plan)
          const planBlock = toolUseBlocks.find(
            (b) => b.name === "extract_action_plan"
          );
          if (planBlock) {
            send({ type: "plan", data: planBlock.input });
          }

          // Check for inline note tools
          const noteBlocks = toolUseBlocks.filter((b) =>
            NOTE_TOOLS.has(b.name)
          );

          if (noteBlocks.length > 0) {
            // Send each note to the client for UI updates
            for (const block of noteBlocks) {
              send({
                type: "note",
                tool: block.name,
                data: block.input,
              });
            }

            // If there's no plan yet, continue the conversation by sending
            // tool results back to Claude so it can keep talking
            if (!planBlock && finalMessage.stop_reason === "tool_use") {
              // Build the assistant message with all content blocks
              conversationMessages = [
                ...conversationMessages,
                { role: "assistant", content: finalMessage.content },
                {
                  role: "user",
                  content: noteBlocks.map((block) => ({
                    type: "tool_result" as const,
                    tool_use_id: block.id,
                    content: "Noted. The user can see it on their screen now.",
                  })),
                },
              ];
              // Loop again so Claude can continue responding
              continue;
            }
          }

          // Done (either no tools, or we had plan, or stop_reason != tool_use)
          send({
            type: "done",
            stop_reason: finalMessage.stop_reason,
          });
          break;
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`
          )
        );
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

export async function GET() {
  return Response.json({
    status: "ok",
    first_message: SAM_FIRST_MESSAGE,
  });
}
