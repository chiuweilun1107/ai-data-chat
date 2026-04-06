"use client";

import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`fade-in group ${isUser ? "flex justify-end" : ""}`}>
      <div
        className={`
          max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed relative
          ${isUser ? "bg-surface-hover text-text-primary" : "text-text-primary"}
        `}
      >
        {/* Message Content */}
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Action bar — hover to show */}
        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy message */}
          <button
            onClick={() => handleCopy(message.content)}
            className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
            aria-label="Copy message"
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1" />
                <path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1" />
              </svg>
            )}
          </button>

          {/* Toggle SQL (assistant only) */}
          {!isUser && message.sql && (
            <button
              onClick={() => setShowSql(!showSql)}
              className={`
                px-1.5 py-0.5 rounded text-[10px] font-mono
                transition-colors
                ${showSql
                  ? "bg-accent/15 text-accent"
                  : "hover:bg-surface-hover text-text-hint hover:text-text-secondary"
                }
              `}
            >
              SQL
            </button>
          )}
        </div>

        {/* SQL — collapsible */}
        {!isUser && message.sql && showSql && (
          <div className="mt-2 bg-surface-sidebar rounded-md px-3 py-2 text-xs font-mono text-text-secondary overflow-x-auto relative group/sql">
            <button
              onClick={() => handleCopy(message.sql!)}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary opacity-0 group-hover/sql:opacity-100 transition-opacity"
              aria-label="Copy SQL"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1" />
                <path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
            <pre className="whitespace-pre-wrap break-all">{message.sql}</pre>
          </div>
        )}

        {/* Chart Added Indicator */}
        {!isUser && message.chart_json && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 7l1.75 1.75L9.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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
