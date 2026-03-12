"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, ActionPlan } from "@/lib/types";
import { SAM_FIRST_MESSAGE } from "@/lib/sam-prompt";

type NoteItem = {
  id: string;
  text: string;
  tool: string;
  addedAt: number;
  timeframe?: string;
};

type Props = {
  onBack?: () => void;
  onPlanReady: (plan: ActionPlan) => void;
};

export default function TextConversation({ onBack, onPlanReady }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: SAM_FIRST_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live lists
  const [issues, setIssues] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<NoteItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listsRef = useRef<HTMLDivElement>(null);

  // Flash animation
  useEffect(() => {
    if (lastAdded) {
      const t = setTimeout(() => setLastAdded(null), 1500);
      return () => clearTimeout(t);
    }
  }, [lastAdded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isStreaming]);

  const handleNote = useCallback(
    (tool: string, data: { title: string; timeframe?: string }) => {
      const item: NoteItem = {
        id: crypto.randomUUID(),
        text: data.title,
        tool,
        timeframe: data.timeframe,
        addedAt: Date.now(),
      };

      if (tool === "note_issue") setIssues((prev) => [...prev, item]);
      else if (tool === "note_goal") setGoals((prev) => [...prev, item]);
      else if (tool === "note_task") setTasks((prev) => [...prev, item]);

      setLastAdded(item.id);
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantText = "";
      let plan: ActionPlan | null = null;
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === "text") {
              assistantText += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            } else if (event.type === "note") {
              handleNote(event.tool, event.data);
            } else if (event.type === "plan") {
              plan = event.data as ActionPlan;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (plan) {
        setTimeout(() => onPlanReady(plan!), 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((prev) => {
        if (prev[prev.length - 1]?.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, onPlanReady, handleNote]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalNotes = issues.length + goals.length + tasks.length;

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] h-[100dvh] md:h-[85vh] bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-text-soft text-xl px-1 py-1 mr-1"
              >
                &#8592;
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center">
              <span className="text-primary-dark font-semibold">S</span>
            </div>
            <div>
              <h2 className="font-semibold text-text text-sm">Sam</h2>
              <p className="text-xs text-text-muted">
                {isStreaming ? "Typing..." : "Online"}
              </p>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 shrink-0">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Main content: chat + lists */}
        <div className="flex-1 overflow-y-auto">
          {/* Messages */}
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center shrink-0 mr-2 mt-1">
                    <span className="text-primary-dark text-xs font-semibold">
                      S
                    </span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-card border border-border text-text rounded-bl-sm"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Live lists */}
          {totalNotes > 0 && (
            <div ref={listsRef} className="px-4 pb-4 space-y-3">
              <div className="border-t border-border pt-3">
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">
                  Your List
                </p>

                {issues.length > 0 && (
                  <NoteList
                    title="Issues"
                    icon="!"
                    color="text-red-500"
                    bg="bg-red-50"
                    border="border-red-100"
                    items={issues}
                    lastAdded={lastAdded}
                  />
                )}

                {goals.length > 0 && (
                  <NoteList
                    title="Goals"
                    icon="&#9733;"
                    color="text-amber-500"
                    bg="bg-amber-50"
                    border="border-amber-100"
                    items={goals}
                    lastAdded={lastAdded}
                  />
                )}

                {tasks.length > 0 && (
                  <NoteList
                    title="To-Dos"
                    icon="&#10003;"
                    color="text-primary"
                    bg="bg-primary/5"
                    border="border-primary/10"
                    items={tasks}
                    lastAdded={lastAdded}
                    showTimeframe
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-5 pt-3 border-t border-border shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text
                         placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors
                         disabled:opacity-50 max-h-32"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center
                         hover:bg-primary-dark active:scale-95 transition-all
                         disabled:bg-border disabled:text-text-muted disabled:cursor-default"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteList({
  title,
  icon,
  color,
  bg,
  border,
  items,
  lastAdded,
  showTimeframe,
}: {
  title: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  items: NoteItem[];
  lastAdded: string | null;
  showTimeframe?: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`text-xs ${color}`}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
        <span className="text-xs font-semibold text-text-soft uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-text-muted">({items.length})</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-2 rounded-xl text-sm text-text border ${border} ${bg} transition-all duration-500 ${
              lastAdded === item.id
                ? "animate-slide-in ring-2 ring-primary/30"
                : ""
            }`}
          >
            {item.text}
            {showTimeframe && item.timeframe && (
              <span className="ml-2 text-xs text-text-muted">
                {item.timeframe}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
