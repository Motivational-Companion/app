"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, OnboardingData } from "@/lib/types";
import { SAM_FIRST_MESSAGE, buildReflectiveFirstMessage, SAM_CHECKIN_FIRST_MESSAGE } from "@/lib/sam-prompt";
import LiveLists, { type NoteItem } from "@/components/LiveLists";
import { useAuth } from "@/lib/supabase/useAuth";
import {
  createConversation,
  saveMessage,
  endConversation,
  loadActiveTasks,
} from "@/lib/supabase/data";
import { trackEvent } from "@/lib/analytics";

type Props = {
  onBack?: () => void;
  onboardingData?: OnboardingData | null;
  chatMode?: "chat" | "checkin";
  onNoteAdded?: (listKey: "issues" | "goals" | "tasks", item: NoteItem) => void;
  existingTasks?: string;
};

export default function TextConversation({ onBack, onboardingData, chatMode = "chat", onNoteAdded, existingTasks }: Props) {
  const firstMessage = chatMode === "checkin"
    ? SAM_CHECKIN_FIRST_MESSAGE
    : onboardingData
      ? buildReflectiveFirstMessage(onboardingData)
      : SAM_FIRST_MESSAGE;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: firstMessage },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskContext, setTaskContext] = useState<string | null>(null);

  // Live lists
  const [issues, setIssues] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<NoteItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  // Inline note cards that appear in the chat flow
  type NoteCard = {
    id: string;
    category: "issue" | "goal" | "task";
    text: string;
    timeframe?: string;
    afterMessageIndex: number;
  };
  const [noteCards, setNoteCards] = useState<NoteCard[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Supabase persistence (invisible to user) ──
  const { user, supabase } = useAuth();
  const conversationIdRef = useRef<string | null>(null);

  // Create a conversation record on mount when authenticated
  useEffect(() => {
    if (user && supabase && !conversationIdRef.current) {
      createConversation(supabase, user.id, "text").then((id) => {
        conversationIdRef.current = id;
        // Save the initial assistant greeting
        if (id) {
          saveMessage(supabase, id, "assistant", firstMessage);
        }
      });
    }
  }, [user, supabase, firstMessage]);

  // Load active tasks for check-in mode context
  useEffect(() => {
    if (chatMode === "checkin" && user && supabase) {
      loadActiveTasks(supabase, user.id).then((result) => {
        const lines: string[] = [];
        for (const item of result.tasks) {
          lines.push(`- ${item.text}${item.timeframe ? ` (${item.timeframe})` : ""}`);
        }
        for (const item of result.goals) {
          lines.push(`- Goal: ${item.text}`);
        }
        if (lines.length > 0) {
          setTaskContext(lines.join("\n"));
        }
      });
    }
  }, [chatMode, user, supabase]);

  const getListSetter = (key: "issues" | "goals" | "tasks") =>
    key === "issues" ? setIssues : key === "goals" ? setGoals : setTasks;

  const handleRemove = useCallback(
    (listKey: "issues" | "goals" | "tasks", id: string) => {
      getListSetter(listKey)((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  const handleReorder = useCallback(
    (listKey: "issues" | "goals" | "tasks", id: string, direction: "up" | "down") => {
      getListSetter(listKey)((prev) => {
        const idx = prev.findIndex((item) => item.id === id);
        if (idx < 0) return prev;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        return next;
      });
    },
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isStreaming]);

  const handleNote = useCallback(
    (tool: string, data: { title: string; timeframe?: string }) => {
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\b(a|an|the|my|your|get|to)\b/g, "").replace(/\s+/g, " ").trim();
      const isDuplicate = (prev: NoteItem[]) => {
        const incoming = normalize(data.title);
        return prev.some((item) => {
          const existing = normalize(item.text);
          return existing === incoming || existing.includes(incoming) || incoming.includes(existing);
        });
      };

      const setter =
        tool === "note_issue" ? setIssues : tool === "note_goal" ? setGoals : setTasks;

      setter((prev) => {
        if (isDuplicate(prev)) return prev;
        const item: NoteItem = {
          id: crypto.randomUUID(),
          text: data.title,
          timeframe: data.timeframe,
          addedAt: Date.now(),
        };
        setLastAdded(item.id);
        trackEvent("task_extracted", { category: tool, title: data.title });

        // Show inline card in chat
        const category = tool === "note_issue" ? "issue" as const : tool === "note_goal" ? "goal" as const : "task" as const;
        setNoteCards((cards) => [...cards, {
          id: item.id,
          category,
          text: data.title,
          timeframe: data.timeframe,
          afterMessageIndex: messages.length - 1,
        }]);

        // Notify parent (board persistence)
        const listKey = tool === "note_issue" ? "issues" as const : tool === "note_goal" ? "goals" as const : "tasks" as const;
        if (onNoteAdded) onNoteAdded(listKey, item);

        return [...prev, item];
      });
    },
    [onNoteAdded]
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

    // Track first user message as chat_started
    if (messages.length === 1) {
      trackEvent("chat_started", { mode: chatMode });
    }

    // Persist user message (fire-and-forget)
    if (user && supabase && conversationIdRef.current) {
      saveMessage(supabase, conversationIdRef.current, "user", text);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          ...(onboardingData ? { onboardingContext: onboardingData } : {}),
          ...(chatMode === "checkin" ? { mode: "checkin" } : {}),
          ...(taskContext ? { taskContext } : {}),
          ...(existingTasks ? { existingTasks } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantText = "";
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
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Persist assistant message (fire-and-forget)
      if (user && supabase && conversationIdRef.current && assistantText) {
        saveMessage(supabase, conversationIdRef.current, "assistant", assistantText);
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
  }, [input, messages, isStreaming, handleNote, onboardingData, user, supabase, issues, goals, tasks, existingTasks]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalNotes = issues.length + goals.length + tasks.length;
  const [listExpanded, setListExpanded] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] h-[100dvh] md:h-[85vh] bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={() => {
                  if (user && supabase && conversationIdRef.current) {
                    endConversation(supabase, conversationIdRef.current);
                  }
                  onBack();
                }}
                className="text-text-soft text-xl px-1 py-1 mr-1"
              >
                &#8592;
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <span className="text-white font-semibold">S</span>
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
            {messages.map((msg, i) => {
              const cardsAfter = noteCards.filter((c) => c.afterMessageIndex === i);
              return (
                <div key={i}>
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0 mr-2 mt-1">
                        <span className="text-white text-xs font-semibold">
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
                  {cardsAfter.map((card) => (
                    <div
                      key={card.id}
                      className="ml-9 mt-2 flex items-center gap-2.5 bg-bg border border-border rounded-xl px-3 py-2 animate-[fadeSlideIn_0.3s_ease-out]"
                    >
                      <span className="text-sm">
                        {card.category === "issue" ? "\uD83D\uDFE1" : card.category === "goal" ? "\uD83C\uDFAF" : "\u2705"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                          {card.category === "issue" ? "Issue noted" : card.category === "goal" ? "Goal added" : "To-do added"}
                        </p>
                        <p className="text-sm text-text truncate">{card.text}</p>
                      </div>
                      {card.timeframe && (
                        <span className="text-xs text-text-muted shrink-0">{card.timeframe}</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

        </div>

        {/* Collapsible list bar */}
        {totalNotes > 0 && (
          <div className="border-t border-border shrink-0">
            <button
              onClick={() => setListExpanded(!listExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg/50 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Your List
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  {totalNotes}
                </span>
                <span className={`text-text-muted text-xs transition-transform ${listExpanded ? "rotate-180" : ""}`}>
                  &#9650;
                </span>
              </span>
            </button>
            {listExpanded && (
              <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
                <LiveLists
                  issues={issues}
                  goals={goals}
                  tasks={tasks}
                  onRemove={handleRemove}
                  onReorder={handleReorder}
                  lastAdded={lastAdded}
                />
              </div>
            )}
          </div>
        )}

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

