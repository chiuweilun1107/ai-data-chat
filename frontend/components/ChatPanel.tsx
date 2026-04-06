"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChatMessage as ChatMessageType,
  Panel,
  PlotlyData,
  Template,
} from "@/lib/types";
import {
  sendChatMessage,
  fetchChatHistory,
  fetchTemplates,
} from "@/lib/api";
import ChatMessage, { TypingIndicator } from "./ChatMessage";
import TemplateSelector from "./TemplateSelector";

interface ChatPanelProps {
  projectId: string | null;
  onPanelCreated: (panel: Panel) => void;
  editingPanel?: Panel | null;
  onClearEditingPanel?: () => void;
  embedded?: boolean;
}

export default function ChatPanel({
  projectId,
  onPanelCreated,
  editingPanel = null,
  onClearEditingPanel,
  embedded = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history when project changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const history = await fetchChatHistory(projectId);
        if (!cancelled) setMessages(history);
      } catch {
        // Silently handle - empty chat is fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Load templates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const data = await fetchTemplates();
        if (!cancelled) setTemplates(data);
      } catch {
        // Templates are optional
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    if (!projectId || !(input || "").trim() || sending) return;

    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      // If editing a panel, inject context so AI modifies instead of creating new
      let messageToSend = userMessage.content;
      if (editingPanel) {
        messageToSend = [
          `[修改現有圖表] 面板標題：${editingPanel.title}`,
          `現有 SQL：${editingPanel.sql}`,
          `現有繪圖程式碼：${editingPanel.chart_code}`,
          `用戶要求：${userMessage.content}`,
          `請根據用戶要求修改圖表，保持相同的查詢邏輯除非用戶要求改變。`,
        ].join("\n");
      }

      const response = await sendChatMessage(projectId, {
        message: messageToSend,
        ...(activeTemplate ? { template_id: activeTemplate.id } : {}),
      });

      const assistantMessage: ChatMessageType = {
        id: response.message_id || `resp-${Date.now()}`,
        role: "assistant",
        content: response.explanation,
        sql: response.sql,
        chart_code: response.chart_code,
        chart_json: response.chart_json,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If editing, update existing panel instead of creating new
      if (editingPanel && response.chart_json) {
        const updatedPanel: Panel = {
          ...editingPanel,
          sql: response.sql || editingPanel.sql,
          chart_code: response.chart_code || editingPanel.chart_code,
          chart_json: response.chart_json as PlotlyData,
        };
        onPanelCreated(updatedPanel);
        onClearEditingPanel?.();
      } else if (response.panel_id && response.chart_json) {
        // New panel
        const newPanel: Panel = {
          id: response.panel_id,
          project_id: projectId,
          title: userMessage.content.slice(0, 60),
          sql: response.sql,
          chart_code: response.chart_code || "",
          chart_json: response.chart_json as PlotlyData,
          position_x: 0,
          position_y: 0,
          width: 6,
          height: 4,
          created_at: new Date().toISOString(),
        };
        onPanelCreated(newPanel);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to send message";
      const errorMessage: ChatMessageType = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMsg}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [projectId, input, sending, onPanelCreated, activeTemplate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send when IME is composing (e.g. selecting Chinese characters)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setActiveTemplate(template);
    setInput("");
    inputRef.current?.focus();
  };

  const clearTemplate = () => {
    setActiveTemplate(null);
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const noProject = !projectId;

  return (
    <div className={embedded ? "flex-1 flex flex-col min-h-0" : "w-[350px] min-w-[350px] bg-surface-primary h-full flex flex-col border-l border-surface-border"}>
      {/* Header — only show when not embedded (parent handles it) */}
      {!embedded && (
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-medium text-text-primary">Chat</h2>
          {noProject && (
            <p className="text-[10px] text-text-hint mt-0.5">
              Select a project to start chatting
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {noProject ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-hint text-center">
              Select or create a project to begin
            </p>
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xs text-text-hint mb-2">
                Ask a question about your data
              </p>
              <p className="text-[10px] text-text-hint">
                e.g. &quot;Show me monthly revenue trends&quot;
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {sending && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 pb-3">
        {/* Template Selector */}
        <div className="mb-1.5">
          <TemplateSelector
            templates={templates}
            loading={templatesLoading}
            onSelect={handleTemplateSelect}
          />
        </div>

        {/* Active template tag */}
        {activeTemplate && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-full
              bg-accent/15 text-accent
              text-xs font-medium
            ">
              {activeTemplate.name}
              <button
                onClick={clearTemplate}
                className="hover:text-white transition-colors"
                aria-label="Remove template"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Input Box */}
        <div
          className={`
            relative flex items-end gap-2
            bg-surface-input rounded-pill
            border border-surface-border
            focus-within:border-text-hint
            transition-colors px-4 py-2.5
            ${noProject ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            disabled={noProject || sending}
            rows={1}
            className="
              flex-1 bg-transparent text-sm text-text-primary
              placeholder:text-text-hint
              resize-none outline-none
              max-h-[120px]
            "
            aria-label="Chat input"
          />
          <button
            onClick={handleSend}
            disabled={noProject || sending || !(input || "").trim()}
            className="
              shrink-0 w-7 h-7 rounded-full
              bg-accent hover:bg-accent-hover
              disabled:bg-surface-border disabled:cursor-not-allowed
              flex items-center justify-center
              transition-colors duration-150
            "
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 12V2M7 2l-4 4M7 2l4 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
