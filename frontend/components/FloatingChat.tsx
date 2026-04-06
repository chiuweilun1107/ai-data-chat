"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Panel } from "@/lib/types";
import ChatPanel from "./ChatPanel";

interface FloatingChatProps {
  projectId: string | null;
  projectName: string | null;
  onPanelCreated: (panel: Panel) => void;
  editingPanel: Panel | null;
  onClearEditingPanel: () => void;
}

interface Position {
  x: number;
  y: number;
}

export default function FloatingChat({
  projectId,
  projectName,
  onPanelCreated,
  editingPanel,
  onClearEditingPanel,
}: FloatingChatProps) {
  const [open, setOpen] = useState(false);

  // Auto-open chat when editing a panel
  useEffect(() => {
    if (editingPanel) {
      setOpen(true);
    }
  }, [editingPanel]);

  // Icon position (bottom-right default)
  const [iconPos, setIconPos] = useState<Position>({ x: -1, y: -1 });
  // Window position
  const [winPos, setWinPos] = useState<Position>({ x: -1, y: -1 });
  // Window size
  const [winSize, setWinSize] = useState({ w: 380, h: 520 });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragTarget = useRef<"icon" | "window">("icon");

  // Initialize positions on mount
  useEffect(() => {
    setIconPos({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    setWinPos({ x: window.innerWidth - 400, y: window.innerHeight - 560 });
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, target: "icon" | "window") => {
      e.preventDefault();
      dragging.current = true;
      dragTarget.current = target;
      const pos = target === "icon" ? iconPos : winPos;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    },
    [iconPos, winPos]
  );

  const handleResizeDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizing.current = true;
      dragOffset.current = { x: e.clientX, y: e.clientY };
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        if (dragTarget.current === "icon") {
          setIconPos({ x: newX, y: newY });
        } else {
          setWinPos({ x: newX, y: newY });
        }
      }
      if (resizing.current) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        dragOffset.current = { x: e.clientX, y: e.clientY };
        setWinSize((prev) => ({
          w: Math.max(320, Math.min(800, prev.w + dx)),
          h: Math.max(400, Math.min(900, prev.h + dy)),
        }));
      }
    };

    const handleMouseUp = () => {
      dragging.current = false;
      resizing.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Don't render until positions are initialized
  if (iconPos.x === -1) return null;

  // Floating icon
  if (!open) {
    return (
      <div
        style={{ left: iconPos.x, top: iconPos.y }}
        className="fixed z-50 select-none"
        onMouseDown={(e) => handleMouseDown(e, "icon")}
      >
        <button
          onClick={() => setOpen(true)}
          className="
            w-14 h-14 rounded-full
            bg-accent hover:bg-accent-hover
            text-white
            shadow-lg shadow-black/30
            flex items-center justify-center
            transition-transform duration-150
            hover:scale-110 active:scale-95
            cursor-grab active:cursor-grabbing
          "
          aria-label="Open AI Chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Floating chat window
  return (
    <div
      style={{
        left: winPos.x,
        top: winPos.y,
        width: winSize.w,
        height: winSize.h,
      }}
      className="
        fixed z-50
        bg-surface-primary
        rounded-2xl
        shadow-2xl shadow-black/40
        border border-surface-border
        flex flex-col
        overflow-hidden
        animate-slide-up
        select-none
      "
    >
      {/* Draggable header */}
      <div
        className="
          px-4 py-2.5
          border-b border-surface-border
          flex items-center justify-between
          cursor-grab active:cursor-grabbing
          shrink-0
        "
        onMouseDown={(e) => handleMouseDown(e, "window")}
      >
        <div className="pointer-events-none">
          <h2 className="text-sm font-medium text-text-primary">
            {editingPanel ? "Edit Chart" : "AI Assistant"}
          </h2>
          <p className="text-[10px] text-text-hint mt-0.5">
            {editingPanel ? editingPanel.title : (projectName || "Select a project")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Minimize to icon */}
          <button
            onClick={() => { setOpen(false); onClearEditingPanel(); }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors pointer-events-auto"
            aria-label="Minimize chat"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {/* Close */}
          <button
            onClick={() => { setOpen(false); onClearEditingPanel(); }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors pointer-events-auto"
            aria-label="Close chat"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat content */}
      <ChatPanel
        projectId={projectId}
        onPanelCreated={onPanelCreated}
        editingPanel={editingPanel}
        onClearEditingPanel={onClearEditingPanel}
        embedded
      />

      {/* Resize handle (bottom-right corner) */}
      <div
        className="
          absolute bottom-0 right-0
          w-4 h-4 cursor-nwse-resize
        "
        onMouseDown={handleResizeDown}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="absolute bottom-1 right-1 text-text-hint opacity-40"
        >
          <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
