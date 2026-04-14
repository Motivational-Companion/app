/**
 * Moonshot (Kimi K2.5) chat provider. Uses Moonshot's OpenAI-compatible
 * Chat Completions API directly via fetch — no SDK dependency. Streams
 * text deltas and parses tool_calls in the same SSE format the client
 * already expects from the Anthropic provider.
 *
 * Tool format note: Moonshot follows OpenAI's "tools" parameter format,
 * which uses `parameters` instead of Anthropic's `input_schema`. We
 * convert each Sam tool definition once at module load.
 *
 * Streaming note: tool call arguments arrive in chunks across multiple
 * SSE deltas (one piece per chunk). We buffer them per tool-call index
 * until the stream finishes, then JSON.parse the complete argument
 * string before emitting the note event.
 *
 * Activation: set CHAT_PROVIDER=moonshot in the Vercel env. Requires
 * MOONSHOT_API_KEY to be set as well.
 */
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

const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const MOONSHOT_MODEL = "kimi-k2.5";
const MAX_TOOL_ROUNDS = 5;

const NOTE_TOOL_NAMES = new Set(["note_issue", "note_goal", "note_task"]);

type SamTool = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[] };
};

type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: { type: "object"; properties: Record<string, unknown>; required: string[] };
  };
};

function toOpenAITool(tool: SamTool): OpenAITool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

const ALL_TOOLS: OpenAITool[] = [
  toOpenAITool(NOTE_ISSUE_TOOL),
  toOpenAITool(NOTE_GOAL_TOOL),
  toOpenAITool(NOTE_TASK_TOOL),
];

function isParseable(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type StreamDelta = {
  choices?: Array<{
    index?: number;
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
};

export async function handleMoonshotChat(
  body: ChatRequestBody
): Promise<Response> {
  const { messages, onboardingContext, mode, taskContext, existingTasks, taskFocus } =
    body;
  const chatMode: ChatMode = mode === "checkin" ? "checkin" : "chat";

  if (!process.env.MOONSHOT_API_KEY) {
    return Response.json(
      { error: "MOONSHOT_API_KEY not configured" },
      { status: 500 }
    );
  }

  return makeSseResponse(async (send) => {
    const systemPrompt = buildSystemPrompt(
      chatMode,
      onboardingContext,
      taskContext,
      existingTasks,
      taskFocus
    );

    let conversationMessages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const notedItems: NotedItem[] = [];
    let roundsLeft = MAX_TOOL_ROUNDS;

    while (roundsLeft-- > 0) {
      const result = await streamOnce(
        conversationMessages,
        send,
        notedItems
      );

      // Normal end of turn: model finished without calling tools
      if (result.toolCalls.length === 0) {
        send({ type: "done", stop_reason: result.finishReason ?? "stop" });
        return;
      }

      // Model tried to call tools but we couldn't parse any of them.
      // Surface it as an error rather than silently closing with a
      // misleading stop_reason.
      if (
        result.finishReason === "tool_calls" &&
        result.toolParseFailures > 0 &&
        result.toolCalls.every(
          (tc) =>
            !tc.function.arguments ||
            !isParseable(tc.function.arguments)
        )
      ) {
        throw new Error(
          "Moonshot returned tool calls with unparseable arguments"
        );
      }

      // Model finished naturally (no more tool calls expected)
      if (result.finishReason !== "tool_calls") {
        send({ type: "done", stop_reason: result.finishReason ?? "stop" });
        return;
      }

      // Append assistant message with tool calls + a tool result for each
      // call so Moonshot can keep talking on the next round
      const alreadyNoted = notedItems
        .map((n) => `${n.tool}: ${n.title}`)
        .join(", ");

      conversationMessages = [
        ...conversationMessages,
        {
          role: "assistant",
          content: null,
          tool_calls: result.toolCalls,
        },
        ...result.toolCalls.map<OpenAIMessage>((tc) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: `Noted. The user can see it on their screen now. Already noted so far: ${alreadyNoted}. Do NOT call these tools again for items already noted.`,
        })),
      ];
    }

    send({ type: "done", stop_reason: "max_rounds" });
  });
}

/**
 * Run a single round of streaming. Forwards text deltas to the client
 * via the `send` SSE callback, accumulates tool call argument chunks,
 * emits note events as soon as a tool call's arguments fully parse,
 * and returns the complete tool calls + finish reason for the caller's
 * outer loop. `toolParseFailures` is incremented when a tool call
 * arrives with unparseable arguments so the caller can distinguish
 * "model ended with tool_calls but we couldn't parse any" from a
 * legitimate no-tool turn.
 */
async function streamOnce(
  messages: OpenAIMessage[],
  send: (data: Record<string, unknown>) => void,
  notedItems: NotedItem[]
): Promise<{
  finishReason: string | null;
  toolCalls: OpenAIToolCall[];
  toolParseFailures: number;
}> {
  const res = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`,
    },
    body: JSON.stringify({
      model: MOONSHOT_MODEL,
      messages,
      tools: ALL_TOOLS,
      tool_choice: "auto",
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Moonshot API error ${res.status}: ${errorText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Tool call buffers, keyed by index. Arguments arrive in chunks.
  const toolCallBuffer = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();
  let finishReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines (\n\n per the spec). Split
    // on that boundary and keep whatever is left over as the next buffer
    // — it may be a partial frame we'll complete on the next chunk.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      // A frame may legally contain multiple lines (e.g. "data: a\ndata: b")
      // which the SSE spec says should be concatenated. Moonshot sends one
      // data line per frame in practice, but handle both.
      const dataLines = frame
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim());
      if (dataLines.length === 0) continue;

      const payload = dataLines.join("\n");
      if (payload === "[DONE]") continue;

      let chunk: StreamDelta;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (delta?.content) {
        send({ type: "text", content: delta.content });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const existing = toolCallBuffer.get(idx);
          if (!existing) {
            toolCallBuffer.set(idx, {
              id: tc.id ?? "",
              name: tc.function?.name ?? "",
              arguments: tc.function?.arguments ?? "",
            });
          } else {
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments)
              existing.arguments += tc.function.arguments;
          }
        }
      }

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
  }

  // Materialize tool calls and emit note events for any that fully
  // parsed and are recognized note tools
  const toolCalls: OpenAIToolCall[] = [];
  let toolParseFailures = 0;
  for (const tc of toolCallBuffer.values()) {
    toolCalls.push({
      id: tc.id,
      type: "function",
      function: { name: tc.name, arguments: tc.arguments },
    });

    if (NOTE_TOOL_NAMES.has(tc.name)) {
      try {
        const parsed = JSON.parse(tc.arguments) as { title?: string };
        const title = typeof parsed.title === "string" ? parsed.title : "";
        if (title && !isDuplicateNote(notedItems, title)) {
          send({ type: "note", tool: tc.name, data: parsed });
          notedItems.push({ tool: tc.name, title });
        }
      } catch {
        // Malformed tool args — track the failure so the caller can
        // surface it to the client instead of silently closing.
        toolParseFailures += 1;
      }
    }
  }

  return { finishReason, toolCalls, toolParseFailures };
}
