"use client";

import type { Panel } from "@/lib/types";
import PanelCard from "./PanelCard";

interface DashboardProps {
  panels: Panel[];
  loading: boolean;
  onDeletePanel: (panelId: string) => void;
}

export default function Dashboard({
  panels,
  loading,
  onDeletePanel,
}: DashboardProps) {
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-card flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect
                x="3"
                y="3"
                width="9"
                height="9"
                rx="2"
                stroke="#666"
                strokeWidth="1.5"
              />
              <rect
                x="16"
                y="3"
                width="9"
                height="9"
                rx="2"
                stroke="#666"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="16"
                width="9"
                height="9"
                rx="2"
                stroke="#666"
                strokeWidth="1.5"
              />
              <rect
                x="16"
                y="16"
                width="9"
                height="9"
                rx="2"
                stroke="#666"
                strokeWidth="1.5"
              />
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
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            onDelete={onDeletePanel}
          />
        ))}
      </div>
    </div>
  );
}
