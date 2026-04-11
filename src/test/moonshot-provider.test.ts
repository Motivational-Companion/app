import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleMoonshotChat } from "@/app/api/chat/providers/moonshot";
import type { ChatRequestBody } from "@/app/api/chat/providers/shared";

/**
 * These tests exercise the Moonshot provider end-to-end by mocking
 * global.fetch with a canned SSE stream and parsing the resulting
 * SSE events back out of the Response body. This gives real coverage
 * of the streaming + tool-call parsing path without hitting the
 * Moonshot API or requiring a real key.
 */

function makeSseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
}

function sseLine(delta: unknown): string {
  return `data: ${JSON.stringify(delta)}\n\n`;
}

async function collectEvents(res: Response): Promise<Array<Record<string, unknown>>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<Record<string, unknown>> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        events.push(JSON.parse(payload));
      } catch {
        // ignore
      }
    }
  }
  return events;
}

describe("handleMoonshotChat", () => {
  const ORIGINAL_KEY = process.env.MOONSHOT_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.MOONSHOT_API_KEY = "test-key";
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.MOONSHOT_API_KEY;
    else process.env.MOONSHOT_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  const baseBody: ChatRequestBody = {
    messages: [{ role: "user", content: "hi" }],
  };

  it("returns 500 when MOONSHOT_API_KEY is missing", async () => {
    delete process.env.MOONSHOT_API_KEY;
    const res = await handleMoonshotChat(baseBody);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("MOONSHOT_API_KEY");
  });

  it("forwards streaming text deltas as type=text SSE events", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [{ index: 0, delta: { content: "Hello" } }],
          }),
          sseLine({
            choices: [{ index: 0, delta: { content: " world" } }],
          }),
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    const res = await handleMoonshotChat(baseBody);
    const events = await collectEvents(res);

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents).toHaveLength(2);
    expect(textEvents[0]).toEqual({ type: "text", content: "Hello" });
    expect(textEvents[1]).toEqual({ type: "text", content: " world" });

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toEqual({ type: "done", stop_reason: "stop" });
  });

  it("emits a note event when a tool call fully arrives in one chunk", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_1",
                      type: "function",
                      function: {
                        name: "note_task",
                        arguments: '{"title":"Draft outline","timeframe":"today"}',
                      },
                    },
                  ],
                },
              },
            ],
          }),
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    // Mock the second round (after tool result) as an empty stream
    // so the loop terminates after one call
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [
              { index: 0, delta: { content: "Noted." }, finish_reason: "stop" },
            ],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    const res = await handleMoonshotChat(baseBody);
    const events = await collectEvents(res);

    const noteEvent = events.find((e) => e.type === "note");
    expect(noteEvent).toBeDefined();
    expect(noteEvent?.tool).toBe("note_task");
    expect(noteEvent?.data).toEqual({
      title: "Draft outline",
      timeframe: "today",
    });

    // Confirm the second-round text came through
    expect(events.some((e) => e.type === "text" && e.content === "Noted.")).toBe(
      true
    );
  });

  it("reassembles tool call arguments across multiple chunks", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_2",
                      type: "function",
                      function: { name: "note_goal", arguments: '{"title":"' },
                    },
                  ],
                },
              },
            ],
          }),
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: "Launch" },
                    },
                  ],
                },
              },
            ],
          }),
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: ' consulting"}' },
                    },
                  ],
                },
              },
            ],
          }),
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    const res = await handleMoonshotChat(baseBody);
    const events = await collectEvents(res);

    const noteEvent = events.find((e) => e.type === "note");
    expect(noteEvent).toBeDefined();
    expect(noteEvent?.tool).toBe("note_goal");
    expect(noteEvent?.data).toEqual({ title: "Launch consulting" });
  });

  it("deduplicates case-insensitive and substring note titles across rounds", async () => {
    // Round 1: note "Draft outline"
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_a",
                      type: "function",
                      function: {
                        name: "note_task",
                        arguments: '{"title":"Draft outline"}',
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );
    // Round 2: model tries to note a longer version that contains the
    // existing title as a substring — should dedupe
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_b",
                      type: "function",
                      function: {
                        name: "note_task",
                        arguments: '{"title":"Draft outline for tomorrow"}',
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );
    // Round 3: stop
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    const res = await handleMoonshotChat(baseBody);
    const events = await collectEvents(res);

    const noteEvents = events.filter((e) => e.type === "note");
    expect(noteEvents).toHaveLength(1);
    expect((noteEvents[0].data as { title: string }).title).toBe("Draft outline");
  });

  it("emits a type=error event when Moonshot returns a non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Quota exceeded", { status: 429 })
    );

    const res = await handleMoonshotChat(baseBody);
    const events = await collectEvents(res);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(String(errorEvent?.message)).toContain("429");
  });

  it("sends tools in OpenAI function format", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    await handleMoonshotChat(baseBody);

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.model).toBe("kimi-k2.5");
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
    for (const tool of body.tools) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toMatch(/^note_(issue|goal|task)$/);
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe("object");
    }
  });

  it("prepends the system prompt as a system message", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeSseBody([
          sseLine({
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
          "data: [DONE]\n\n",
        ]),
        { status: 200 }
      )
    );

    await handleMoonshotChat({
      messages: [{ role: "user", content: "hi" }],
      mode: "checkin",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.messages[0].role).toBe("system");
    expect(typeof body.messages[0].content).toBe("string");
    expect(body.messages[0].content.length).toBeGreaterThan(100);
  });
});
