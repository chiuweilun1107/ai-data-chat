"use client";

import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`fade-in ${isUser ? "flex justify-end" : ""}`}>
      <div
        className={`
          max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed
          ${
            isUser
              ? "bg-surface-hover text-text-primary"
              : "text-text-primary"
          }
        `}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* SQL Display (for assistant messages) */}
        {!isUser && message.sql && (
          <div className="mt-2 bg-surface-sidebar rounded px-3 py-2 text-xs font-mono text-text-secondary overflow-x-auto">
            <div className="text-[10px] text-text-hint mb-1 uppercase tracking-wider">
              SQL
            </div>
            {message.sql}
          </div>
        )}

        {/* Chart Added Indicator */}
        {!isUser && message.panel_id && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M4.5 7l1.75 1.75L9.5 5.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Added to dashboard
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-3">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
    </div>
  );
}
