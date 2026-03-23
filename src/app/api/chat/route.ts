import Anthropic from "@anthropic-ai/sdk";
import {
  SAM_TEXT_SYSTEM_PROMPT,
  SAM_CHECKIN_SYSTEM_PROMPT,
  SAM_FIRST_MESSAGE,
  NOTE_ISSUE_TOOL,
  NOTE_GOAL_TOOL,
  NOTE_TASK_TOOL,
} from "@/lib/sam-prompt";

const anthropic = new Anthropic();

const NOTE_TOOLS = new Set(["note_issue", "note_goal", "note_task"]);

// Track noted items to prevent duplicates across tool-use rounds
type NotedItem = { tool: string; title: string };

function buildOnboardingContext(ctx: Record<string, unknown>): string {
  const parts: string[] = [];

  if (ctx.bringYouHere) {
    const labels: Record<string, string> = {
      overwhelmed: "feeling overwhelmed",
      stuck: "feeling stuck",
      clarity: "seeking clarity",
      accountable: "wanting accountability",
    };
    parts.push(`They came here because they're ${labels[ctx.bringYouHere as string] || ctx.bringYouHere}.`);
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
    parts.push(`Priority area: ${areas[ctx.priorityArea as string] || ctx.priorityArea}.`);
  }

  if (ctx.coachingStyle) {
    const styles: Record<string, string> = {
      warm: "warm and encouraging",
      direct: "direct and no-nonsense",
      thoughtful: "thoughtful and strategic",
    };
    parts.push(`Preferred coaching style: ${styles[ctx.coachingStyle as string] || ctx.coachingStyle}.`);
  }

  if (ctx.checkinTime) {
    parts.push(`Preferred check-in time: ${ctx.checkinTime}.`);
  }

  return parts.join(" ");
}

export async function POST(req: Request) {
  const { messages, onboardingContext, mode, taskContext, existingTasks } = await req.json();

  const chatMode: "chat" | "checkin" = mode === "checkin" ? "checkin" : "chat";

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
          NOTE_ISSUE_TOOL,
          NOTE_GOAL_TOOL,
          NOTE_TASK_TOOL,
        ];

        // Track all noted items to prevent duplicates across rounds
        const notedItems: NotedItem[] = [];

        // Loop to handle tool use: Claude may call note tools, we process them
        // and let Claude continue talking
        let maxRounds = 5;
        while (maxRounds-- > 0) {
          // Build system prompt based on mode
          let systemPrompt = chatMode === "checkin"
            ? SAM_CHECKIN_SYSTEM_PROMPT
            : SAM_TEXT_SYSTEM_PROMPT;

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
            systemPrompt += `\n\n## Existing Board Items\nThe user already has these items on their board:\n${existingTasks}\nDo NOT re-note items that are already on their board. Only use note tools for NEW items that come up in this conversation.`;
          }

          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
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

          // Check for inline note tools
          const noteBlocks = toolUseBlocks.filter((b) =>
            NOTE_TOOLS.has(b.name)
          );

          if (noteBlocks.length > 0) {
            // Send each note to the client, skipping duplicates
            for (const block of noteBlocks) {
              const input = block.input as { title: string };
              const normalTitle = input.title?.toLowerCase().trim() || "";
              const isDup = notedItems.some((n) => {
                const existing = n.title.toLowerCase().trim();
                return existing === normalTitle || existing.includes(normalTitle) || normalTitle.includes(existing);
              });

              if (!isDup) {
                send({
                  type: "note",
                  tool: block.name,
                  data: block.input,
                });
                notedItems.push({ tool: block.name, title: input.title || "" });
              }
            }

            // Continue the conversation by sending tool results back to Claude
            // so it can keep talking after noting items
            if (finalMessage.stop_reason === "tool_use") {
              // Tell Claude what's already been noted so it doesn't repeat
              const alreadyNoted = notedItems.map((n) => `${n.tool}: ${n.title}`).join(", ");

              // Build the assistant message with all content blocks
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
