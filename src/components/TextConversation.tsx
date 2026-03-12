"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, ActionPlan } from "@/lib/types";
import { SAM_FIRST_MESSAGE } from "@/lib/sam-prompt";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isStreaming]);

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

      // Add empty assistant message that we'll stream into
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
        // Brief pause so user can read Sam's closing message
        setTimeout(() => onPlanReady(plan!), 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Remove the empty streaming message if there was an error
      setMessages((prev) => {
        if (prev[prev.length - 1]?.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, onPlanReady]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-text-soft text-xl px-1 py-1 mr-1"
            >
              &#8592;
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
            <span className="text-primary-dark font-semibold text-lg">S</span>
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
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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

      {/* Input */}
      <div className="px-4 pb-6 pt-3 border-t border-border bg-card/50">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
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
  );
}
