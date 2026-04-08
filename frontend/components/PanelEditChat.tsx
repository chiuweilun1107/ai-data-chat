"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Panel, PlotlyData } from "@/lib/types";
import { sendChatMessage, createPanel, fetchPanelChatHistory } from "@/lib/api";

interface PanelEditChatProps {
  panel: Panel;
  projectId: string;
  onPanelCreated: (panel: Panel) => void;
  onClose: () => void;
}

interface EditMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function PanelEditChat({
  panel,
  projectId,
  onPanelCreated,
  onClose,
}: PanelEditChatProps) {
  const [messages, setMessages] = useState<EditMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Load panel chat history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await fetchPanelChatHistory(panel.id);
        if (!cancelled) {
          setMessages(history.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })));
        }
      } catch { /* empty is fine */ }
    })();
    return () => { cancelled = true; };
  }, [panel.id]);

  // Initialize position
  useEffect(() => {
    setPosition({
      x: Math.max(100, window.innerWidth / 2 - 200),
      y: Math.max(100, window.innerHeight / 2 - 250),
    });
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };
    const handleMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!(input || "").trim() || sending) return;

    const userMsg: EditMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const contextMessage = [
        `[圖表編輯模式] 面板標題：${panel.title}`,
        `現有 SQL：${panel.sql}`,
        `現有繪圖程式碼：${panel.chart_code}`,
        `用戶輸入：${userMsg.content}`,
        ``,
        `## 回應規則（必須遵守）`,
        `1. 只有當用戶明確要求「修改、變更、調整」圖表樣式或資料時，才使用 generate_analysis 工具生成新的 SQL 和圖表程式碼`,
        `2. 如果用戶是在「提問、詢問原因、聊天、打招呼」，請只用純文字回答，絕對不要呼叫 generate_analysis 工具`,
        `3. 判斷標準：用戶的意圖是「改圖」還是「問問題」？問問題 → 純文字回答`,
      ].join("\n");

      const response = await sendChatMessage(projectId, {
        message: contextMessage,
        is_edit: true,
        panel_id: panel.id,
      });

      const isChartGenerated = response.chart_json && typeof response.chart_json === "object" && Array.isArray((response.chart_json as PlotlyData).data) && (response.chart_json as PlotlyData).data.length > 0;

      const assistantMsg: EditMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: isChartGenerated
          ? (response.explanation || "New chart created.")
          : (response.explanation || response.text_response || "I can only help with chart modifications here."),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (isChartGenerated) {
        const newPanel = await createPanel(projectId, {
          title: panel.title,
          sql: response.sql || panel.sql,
          chart_code: response.chart_code || panel.chart_code,
          chart_json: response.chart_json as PlotlyData,
        });
        onPanelCreated(newPanel);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Failed"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, panel, projectId, onPanelCreated]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (position.x === -1) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Edit window */}
      <div
        style={{ left: position.x, top: position.y }}
        className="
          fixed z-50 w-[400px]
          bg-surface-primary rounded-2xl
          shadow-2xl shadow-black/40
          border border-surface-border
          flex flex-col overflow-hidden
          animate-slide-up
        "
      >
        {/* Draggable header */}
        <div
          className="
            px-4 py-2.5 border-b border-surface-border
            flex items-center justify-between
            cursor-grab active:cursor-grabbing shrink-0
            select-none
          "
          onMouseDown={handleMouseDown}
        >
          <div className="pointer-events-none flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent">
                EDIT
              </span>
              <h2 className="text-sm font-medium text-text-primary truncate">
                {panel.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors pointer-events-auto ml-2"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-h-[300px] min-h-[100px]">
          {messages.length === 0 && !sending && (
            <p className="text-xs text-text-hint text-center py-4">
              Describe how you want to change this chart
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${msg.role === "user" ? "text-right" : ""}`}
            >
              <span
                className={`
                  inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm
                  ${msg.role === "user"
                    ? "bg-surface-hover text-text-primary"
                    : "text-text-secondary"
                  }
                `}
              >
                {msg.content}
              </span>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-1 px-1">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-hint" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3">
          <div className="relative flex items-end gap-2 bg-surface-input rounded-pill border border-surface-border focus-within:border-text-hint transition-colors px-4 py-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. change to blue, add title..."
              disabled={sending}
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-hint resize-none outline-none max-h-[80px]"
            />
            <button
              onClick={handleSend}
              disabled={sending || !(input || "").trim()}
              className="shrink-0 w-7 h-7 rounded-full bg-accent hover:bg-accent-hover disabled:bg-surface-border disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M7 2l-4 4M7 2l4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
