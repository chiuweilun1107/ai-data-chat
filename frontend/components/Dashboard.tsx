"use client";

import { useCallback, useEffect, useRef, useState, DragEvent } from "react";
import type { Panel } from "@/lib/types";
import PanelCard from "./PanelCard";

const INTERVAL_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
];

interface DashboardProps {
  panels: Panel[];
  loading: boolean;
  onDeletePanel: (panelId: string) => void;
  onRefreshPanel?: (panelId: string) => void;
  onRefreshAll?: () => void;
  onEditPanel?: (panel: Panel) => void;
  onSaveAsTemplate?: (panel: Panel) => void;
  onReorderPanels?: (panelIds: string[]) => Promise<void>;
  onImportPanels?: () => void;
  onCopiedToProject?: () => void;
}

export default function Dashboard({
  panels,
  loading,
  onDeletePanel,
  onRefreshPanel,
  onRefreshAll,
  onEditPanel,
  onSaveAsTemplate,
  onReorderPanels,
  onImportPanels,
  onCopiedToProject,
}: DashboardProps) {
  const [autoInterval, setAutoInterval] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((e: DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Needed for Firefox
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx && onReorderPanels) {
      const reordered = [...panels];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);
      onReorderPanels(reordered.map((p) => p.id));
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, panels, onReorderPanels]);

  const handleManualRefresh = useCallback(async () => {
    if (!onRefreshAll || panels.length === 0) return;
    setRefreshing(true);
    await onRefreshAll();
    setRefreshing(false);
    if (autoInterval > 0) setCountdown(autoInterval);
  }, [onRefreshAll, panels.length, autoInterval]);

  // Auto refresh timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (autoInterval > 0 && panels.length > 0 && onRefreshAll) {
      setCountdown(autoInterval);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      timerRef.current = setInterval(async () => {
        setRefreshing(true);
        await onRefreshAll();
        setRefreshing(false);
        setCountdown(autoInterval);
      }, autoInterval * 1000);
    } else {
      setCountdown(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoInterval, panels.length, onRefreshAll]);
  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface-card rounded-card h-[300px] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (panels.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar — same as non-empty state */}
        {onImportPanels && (
          <div className="flex items-center mb-4">
            <button
              onClick={onImportPanels}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                text-[11px] text-text-secondary
                border border-surface-border
                hover:bg-surface-hover hover:text-text-primary
                transition-colors
              "
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Add Panel
            </button>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-card flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-text-hint">
                <rect x="3" y="3" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="16" y="3" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="16" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="16" y="16" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm mb-1">
              Dashboard is empty
            </p>
            <p className="text-text-hint text-xs">
              Use the chat panel on the right to ask questions about your data.
              Charts will appear here automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-3 mb-4">
        {/* Add Panel (import) button */}
        {onImportPanels && (
          <button
            onClick={onImportPanels}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-[11px] text-text-secondary
              border border-surface-border
              hover:bg-surface-hover hover:text-text-primary
              transition-colors mr-auto
            "
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Add Panel
          </button>
        )}

        {/* Auto refresh selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-hint">Auto refresh</span>
          <div className="flex rounded-md border border-surface-border overflow-hidden">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAutoInterval(opt.value)}
                className={`
                  px-2 py-1 text-[11px] transition-colors
                  ${autoInterval === opt.value
                    ? "bg-accent text-white"
                    : "bg-surface-card text-text-hint hover:text-text-secondary"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {autoInterval > 0 && countdown > 0 && (
            <span className="text-[10px] text-text-hint tabular-nums ml-1">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Manual refresh button */}
        <button
          onClick={handleManualRefresh}
          disabled={refreshing || panels.length === 0}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-md
            text-[11px] text-text-secondary
            border border-surface-border
            hover:bg-surface-hover hover:text-text-primary
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <svg
            width="12" height="12" viewBox="0 0 14 14" fill="none"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M1.75 7a5.25 5.25 0 019.03-3.64M12.25 7a5.25 5.25 0 01-9.03 3.64" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M10.5 1.75v2.1h-2.1M3.5 12.25v-2.1h2.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh now"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {panels.map((panel, idx) => (
          <div
            key={panel.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`
              rounded-card
              ${dragIdx === idx ? "opacity-40 transition-opacity duration-150" : ""}
              ${overIdx === idx && dragIdx !== idx ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-primary" : ""}
            `}
          >
            <PanelCard
              panel={panel}
              onDelete={onDeletePanel}
              onRefresh={onRefreshPanel}
              onEdit={onEditPanel}
              onSaveAsTemplate={onSaveAsTemplate}
              onCopiedToProject={onCopiedToProject}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
