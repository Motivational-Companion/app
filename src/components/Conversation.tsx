"use client";

import { useConversation } from "@elevenlabs/react";
import type { DisconnectionDetails, Mode, Status } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";

type Message = {
  role: "user" | "agent";
  text: string;
  timestamp: number;
};

type DebugEvent = {
  time: string;
  type: string;
  detail: string;
};

export default function Conversation({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const log = (type: string, detail: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${type}: ${detail}`);
    setDebugEvents((prev) => [...prev.slice(-30), { time, type, detail }]);
  };

  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      log("CONNECT", `Connected. ID: ${conversationId}`);
      setError(null);
    },
    onDisconnect: (details: DisconnectionDetails) => {
      log("DISCONNECT", `Reason: ${details.reason}${
        details.reason === "error" ? ` — ${details.message}` : ""
      }`);
      if (details.reason === "error") {
        setError(`Disconnected: ${details.message}`);
      }
    },
    onMessage: (payload: { message: string; source: string; role: string }) => {
      log("MESSAGE", `[${payload.role || payload.source}] ${payload.message.slice(0, 80)}...`);
      setMessages((prev) => [
        ...prev,
        {
          role: payload.role === "agent" || payload.source === "ai" ? "agent" : "user",
          text: payload.message,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: (message: string, context?: unknown) => {
      log("ERROR", `${message} ${context ? JSON.stringify(context).slice(0, 200) : ""}`);
      setError(message);
    },
    onStatusChange: ({ status }: { status: Status }) => {
      log("STATUS", status);
    },
    onModeChange: ({ mode }: { mode: Mode }) => {
      log("MODE", mode);
    },
    onDebug: (info: unknown) => {
      log("DEBUG", JSON.stringify(info).slice(0, 200));
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = useCallback(async () => {
    setError(null);
    log("ACTION", "Requesting microphone...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAllowed(true);
      log("ACTION", `Mic granted. Tracks: ${stream.getAudioTracks().length}, active: ${stream.active}`);

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (!agentId || agentId === "your-agent-id-here") {
        setError("Agent ID not configured. Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local");
        return;
      }

      log("ACTION", `Starting session with agent ${agentId}, connectionType: websocket`);

      const conversationId = await conversation.startSession({
        agentId,
        connectionType: "websocket",
      });

      log("ACTION", `startSession resolved. Conversation ID: ${conversationId}`);
      setHasStarted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `startSession failed: ${msg}`);
      setError(msg);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("not allowed")) {
        setMicAllowed(false);
      }
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    log("ACTION", "Ending session...");
    try {
      await conversation.endSession();
    } catch (err) {
      log("ERROR", `endSession failed: ${err}`);
    }
    setHasStarted(false);
  }, [conversation]);

  // Pre-conversation: landing screen
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg px-6 text-center relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 text-text-soft text-xl px-2 py-1 hover:text-text transition-colors"
          >
            &#8592;
          </button>
        )}

        <div className="mb-12">
          <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-dark font-display text-3xl">S</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-text mb-3">Meet Sam</h1>
          <p className="text-text-soft text-lg max-w-sm leading-relaxed">
            Your coaching companion. Talk through what&apos;s on your mind and walk away with a clear plan.
          </p>
        </div>

        <div className="mb-12 max-w-sm w-full">
          <div className="space-y-4">
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
        </div>

        <button
          onClick={startConversation}
          className="w-full max-w-sm h-14 bg-primary text-white rounded-2xl text-lg font-semibold
                     hover:bg-primary-dark active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          Talk to Sam
        </button>

        {micAllowed === false && (
          <p className="mt-4 text-sm text-red-600 max-w-sm">
            Microphone access is required. Please allow microphone access in your browser settings and try again.
          </p>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl max-w-sm w-full text-left">
            <p className="text-sm text-red-700 font-medium">Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        <p className="mt-6 text-xs text-text-muted max-w-sm">
          Your conversation is private. Sam uses voice to listen and respond naturally.
        </p>

        {/* Debug panel on landing too */}
        {debugEvents.length > 0 && (
          <DebugPanel events={debugEvents} show={showDebug} onToggle={() => setShowDebug(!showDebug)} />
        )}
      </div>
    );
  }

  // Active conversation
  return (
    <div className="flex flex-col h-[100dvh] bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
            <span className="text-primary-dark font-semibold text-lg">S</span>
          </div>
          <div>
            <h2 className="font-semibold text-text text-sm">Sam</h2>
            <StatusIndicator status={conversation.status} isSpeaking={conversation.isSpeaking} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-text-muted hover:text-text px-2 py-1 rounded border border-border"
          >
            {showDebug ? "Hide" : "Debug"}
          </button>
          <button
            onClick={endConversation}
            className="text-sm text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg hover:bg-border/50"
          >
            End
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Debug panel */}
      {showDebug && <DebugPanel events={debugEvents} show={showDebug} onToggle={() => setShowDebug(!showDebug)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && conversation.status === "connected" && (
          <p className="text-center text-text-muted text-sm py-8">
            Waiting for Sam to speak...
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice indicator */}
      <div className="px-6 py-8 flex flex-col items-center gap-4 border-t border-border bg-card/50">
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
    </div>
  );
}

function DebugPanel({
  events,
  show,
  onToggle,
}: {
  events: DebugEvent[];
  show: boolean;
  onToggle: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [events]);

  if (!show) return null;

  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
          <span className="text-xs text-gray-400 font-mono">Debug Log</span>
          <button onClick={onToggle} className="text-xs text-gray-500 hover:text-gray-300">
            &#10005;
          </button>
        </div>
        <div ref={scrollRef} className="px-3 py-2 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {events.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0">{e.time}</span>
              <span
                className={`shrink-0 ${
                  e.type === "ERROR"
                    ? "text-red-400"
                    : e.type === "CONNECT"
                    ? "text-green-400"
                    : e.type === "MESSAGE"
                    ? "text-blue-400"
                    : "text-gray-400"
                }`}
              >
                {e.type}
              </span>
              <span className="text-gray-300 break-all">{e.detail}</span>
            </div>
          ))}
          {events.length === 0 && <span className="text-gray-600">No events yet.</span>}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-br-sm"
            : "bg-card border border-border text-text rounded-bl-sm"
        }`}
      >
        {message.text}
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
