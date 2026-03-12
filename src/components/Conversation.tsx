"use client";

import { useConversation } from "@elevenlabs/react";
import type { DisconnectionDetails, Mode, Status } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";

type NoteItem = {
  id: string;
  text: string;
  addedAt: number;
};

type TaskItem = NoteItem & {
  timeframe?: string;
};

export default function Conversation({ onBack }: { onBack?: () => void }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live lists
  const [issues, setIssues] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  // Flash animation for newly added items
  useEffect(() => {
    if (lastAdded) {
      const t = setTimeout(() => setLastAdded(null), 1500);
      return () => clearTimeout(t);
    }
  }, [lastAdded]);

  const conversation = useConversation({
    clientTools: {
      note_issue: async (params: { title: string }) => {
        const item: NoteItem = {
          id: crypto.randomUUID(),
          text: params.title,
          addedAt: Date.now(),
        };
        setIssues((prev) => [...prev, item]);
        setLastAdded(item.id);
        return "Noted.";
      },
      note_goal: async (params: { title: string }) => {
        const item: NoteItem = {
          id: crypto.randomUUID(),
          text: params.title,
          addedAt: Date.now(),
        };
        setGoals((prev) => [...prev, item]);
        setLastAdded(item.id);
        return "Noted.";
      },
      note_task: async (params: { title: string; timeframe?: string }) => {
        const item: TaskItem = {
          id: crypto.randomUUID(),
          text: params.title,
          timeframe: params.timeframe,
          addedAt: Date.now(),
        };
        setTasks((prev) => [...prev, item]);
        setLastAdded(item.id);
        return "Noted.";
      },
    },
    onConnect: () => setError(null),
    onDisconnect: (details: DisconnectionDetails) => {
      if (details.reason === "error") {
        setError(`Disconnected: ${details.message}`);
      }
    },
    onMessage: () => {},
    onError: (message: string) => setError(message),
    onStatusChange: (_payload: { status: Status }) => {},
    onModeChange: (_payload: { mode: Mode }) => {},
  });

  const startConversation = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAllowed(true);
      stream; // consumed by ElevenLabs internally

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId || agentId === "your-agent-id-here") {
        setError("Agent ID not configured.");
        return;
      }

      await conversation.startSession({
        agentId,
        connectionType: "websocket",
      });

      setHasStarted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("not allowed")) {
        setMicAllowed(false);
      }
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // ignore
    }
    setHasStarted(false);
  }, [conversation]);

  const totalItems = issues.length + goals.length + tasks.length;

  // ── Pre-conversation landing ──
  if (!hasStarted) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
        <div className="w-full max-w-[480px] min-h-[100dvh] md:min-h-0 bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col items-center px-6 py-12 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-5 left-5 text-text-soft text-xl px-2 py-1 hover:text-text transition-colors"
            >
              &#8592;
            </button>
          )}

          <div className="mb-10 text-center">
            <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
              <span className="text-primary-dark font-display text-3xl">S</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-text mb-3">Meet Sam</h1>
            <p className="text-text-soft text-lg max-w-sm leading-relaxed">
              Your coaching companion. Talk through what&apos;s on your mind and walk away with a clear plan.
            </p>
          </div>

          <div className="mb-10 w-full space-y-4">
            {[
              { step: "1", text: "Share what's on your mind" },
              { step: "2", text: "Sam helps you find clarity" },
              { step: "3", text: "Walk away with a clear action plan" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 text-left">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-primary text-sm font-semibold">{item.step}</span>
                </div>
                <p className="text-text-soft text-base">{item.text}</p>
              </div>
            ))}
          </div>

          <button
            onClick={startConversation}
            className="w-full h-14 bg-primary text-white rounded-2xl text-lg font-semibold
                       hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            Talk to Sam
          </button>

          {micAllowed === false && (
            <p className="mt-4 text-sm text-red-600 text-center">
              Microphone access is required. Please allow it in your browser settings.
            </p>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl w-full text-left">
              <p className="text-sm text-red-700 font-medium">Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          )}

          <p className="mt-6 text-xs text-text-muted text-center">
            Your conversation is private. Sam uses voice to listen and respond naturally.
          </p>
        </div>
      </div>
    );
  }

  // ── Active conversation ──
  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] min-h-[100dvh] md:min-h-0 md:max-h-[90vh] bg-card md:rounded-3xl md:shadow-xl md:border md:border-border flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center">
              <span className="text-primary-dark font-semibold">S</span>
            </div>
            <div>
              <h2 className="font-semibold text-text text-sm">Sam</h2>
              <StatusIndicator status={conversation.status} isSpeaking={conversation.isSpeaking} />
            </div>
          </div>
          <button
            onClick={endConversation}
            className="text-sm text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-border/50"
          >
            End
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 shrink-0">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Voice orb area */}
        <div className="py-6 flex flex-col items-center gap-3 shrink-0">
          <VoiceOrb status={conversation.status} isSpeaking={conversation.isSpeaking} />
          <p className="text-sm text-text-muted">
            {conversation.isSpeaking
              ? "Sam is speaking..."
              : conversation.status === "connected"
              ? "Listening to you..."
              : conversation.status === "connecting"
              ? "Connecting..."
              : `Status: ${conversation.status}`}
          </p>
        </div>

        {/* Live lists */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {totalItems === 0 && conversation.status === "connected" && (
            <p className="text-center text-text-muted text-sm py-4">
              As you talk, Sam will note down your issues, goals, and to-dos here.
            </p>
          )}

          {issues.length > 0 && (
            <ListSection
              title="Issues"
              emoji="!"
              color="text-red-500"
              bgColor="bg-red-50"
              borderColor="border-red-100"
              items={issues}
              lastAdded={lastAdded}
            />
          )}

          {goals.length > 0 && (
            <ListSection
              title="Goals"
              emoji="&#9733;"
              color="text-amber-500"
              bgColor="bg-amber-50"
              borderColor="border-amber-100"
              items={goals}
              lastAdded={lastAdded}
            />
          )}

          {tasks.length > 0 && (
            <TaskSection tasks={tasks} lastAdded={lastAdded} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function ListSection({
  title,
  emoji,
  color,
  bgColor,
  borderColor,
  items,
  lastAdded,
}: {
  title: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  items: NoteItem[];
  lastAdded: string | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [items.length]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm ${color}`} dangerouslySetInnerHTML={{ __html: emoji }} />
        <h3 className="text-xs font-semibold text-text-soft uppercase tracking-wider">{title}</h3>
        <span className="text-xs text-text-muted">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-2.5 rounded-xl text-sm text-text border ${borderColor} ${bgColor} transition-all duration-500 ${
              lastAdded === item.id ? "animate-slide-in ring-2 ring-primary/30" : ""
            }`}
          >
            {item.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function TaskSection({
  tasks,
  lastAdded,
}: {
  tasks: TaskItem[];
  lastAdded: string | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [tasks.length]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-primary">&#10003;</span>
        <h3 className="text-xs font-semibold text-text-soft uppercase tracking-wider">To-Dos</h3>
        <span className="text-xs text-text-muted">({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-2.5 rounded-xl text-sm border border-primary/10 bg-primary/5 transition-all duration-500 ${
              lastAdded === item.id ? "animate-slide-in ring-2 ring-primary/30" : ""
            }`}
          >
            <span className="text-text">{item.text}</span>
            {item.timeframe && (
              <span className="ml-2 text-xs text-text-muted">{item.timeframe}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function StatusIndicator({
  status,
  isSpeaking,
}: {
  status: string;
  isSpeaking: boolean;
}) {
  const dotColor =
    status === "connected"
      ? "bg-success"
      : status === "connecting"
      ? "bg-yellow-400"
      : "bg-text-muted";
  const label = isSpeaking
    ? "Speaking"
    : status === "connected"
    ? "Listening"
    : status === "connecting"
    ? "Connecting..."
    : status;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function VoiceOrb({
  status,
  isSpeaking,
}: {
  status: string;
  isSpeaking: boolean;
}) {
  const isListening = status === "connected" && !isSpeaking;

  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <div className="absolute w-24 h-24 rounded-full bg-accent/20 animate-pulse-ring-outer" />
      )}
      {isListening && (
        <div className="absolute w-20 h-20 rounded-full bg-accent/30 animate-pulse-ring" />
      )}
      <div
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
          isSpeaking
            ? "bg-primary shadow-lg shadow-primary/30"
            : isListening
            ? "bg-accent shadow-lg shadow-accent/30"
            : "bg-text-muted"
        }`}
      >
        {isSpeaking ? (
          <div className="flex items-center gap-1">
            {[0, 0.2, 0.4, 0.2, 0].map((delay, i) => (
              <div
                key={i}
                className="w-1 bg-white rounded-full animate-wave"
                style={{ animationDelay: `${delay}s`, height: "12px" }}
              />
            ))}
          </div>
        ) : isListening ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        ) : (
          <div className="w-3 h-3 rounded-full bg-white/50" />
        )}
      </div>
    </div>
  );
}
