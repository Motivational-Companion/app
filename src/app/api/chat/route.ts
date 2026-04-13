/**
 * Chat API route. Dispatches to the active provider based on the
 * CHAT_PROVIDER env var.
 *
 *   CHAT_PROVIDER=anthropic  (default)  -> Claude Sonnet via @anthropic-ai/sdk
 *   CHAT_PROVIDER=moonshot              -> Kimi K2.5 via OpenAI-compatible HTTP
 *
 * Both providers emit the same SSE event shape to the client:
 *   { type: "text", content }        - streaming token
 *   { type: "note", tool, data }     - tool call for note_issue/goal/task
 *   { type: "done", stop_reason }    - end of turn
 *   { type: "error", message }       - unrecoverable error
 *
 * Swapping providers requires no client changes — TextConversation.tsx
 * already parses this shape.
 */
import { handleAnthropicChat } from "./providers/anthropic";
import { handleMoonshotChat } from "./providers/moonshot";
import type { ChatRequestBody } from "./providers/shared";
import { SAM_FIRST_MESSAGE } from "@/lib/sam-prompt";

type ProviderId = "anthropic" | "moonshot";

function resolveProvider(): ProviderId {
  const raw = (process.env.CHAT_PROVIDER ?? "").toLowerCase().trim();
  return raw === "moonshot" ? "moonshot" : "anthropic";
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  const provider = resolveProvider();
  return provider === "moonshot"
    ? handleMoonshotChat(body)
    : handleAnthropicChat(body);
}

export async function GET() {
  return Response.json({
    status: "ok",
    provider: resolveProvider(),
    first_message: SAM_FIRST_MESSAGE,
  });
}
