import Anthropic from "@anthropic-ai/sdk";
import { SAM_TEXT_SYSTEM_PROMPT, SAM_FIRST_MESSAGE, EXTRACT_ACTION_PLAN_TOOL } from "@/lib/sam-prompt";

const anthropic = new Anthropic();

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
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: SAM_TEXT_SYSTEM_PROMPT,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          tools: [EXTRACT_ACTION_PLAN_TOOL],
        });

        stream.on("text", (text) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: text })}\n\n`
            )
          );
        });

        const finalMessage = await stream.finalMessage();

        for (const block of finalMessage.content) {
          if (
            block.type === "tool_use" &&
            block.name === "extract_action_plan"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "plan", data: block.input })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", stop_reason: finalMessage.stop_reason })}\n\n`
          )
        );
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
