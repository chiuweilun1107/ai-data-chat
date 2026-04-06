"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import type { Panel } from "@/lib/types";

const Plot = lazy(() => import("react-plotly.js"));

interface PanelCardProps {
  panel: Panel;
  onDelete: (panelId: string) => void;
  onRefresh?: (panelId: string) => void;
}

export default function PanelCard({
  panel,
  onDelete,
  onRefresh,
}: PanelCardProps) {
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plotlyLayout = useMemo(() => {
    const base = (panel.chart_json?.layout || {}) as Record<string, unknown>;
    const xaxis = (base.xaxis || {}) as Record<string, unknown>;
    const yaxis = (base.yaxis || {}) as Record<string, unknown>;
    return {
      template: "plotly_dark",
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { color: "#ececec", size: 11 },
      margin: { t: 32, r: 16, b: 40, l: 48 },
      autosize: true,
      ...base,
      xaxis: {
        ...xaxis,
        gridcolor: "#3a3a3a",
        zerolinecolor: "#3a3a3a",
      },
      yaxis: {
        ...yaxis,
        gridcolor: "#3a3a3a",
        zerolinecolor: "#3a3a3a",
      },
    };
  }, [panel.chart_json]);

  const plotlyData = useMemo(() => {
    return (panel.chart_json?.data || []) as Array<Record<string, unknown>>;
  }, [panel.chart_json]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(panel.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      className="bg-surface-card rounded-card overflow-hidden relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3 className="text-sm font-medium text-text-primary truncate pr-2">
          {panel.title}
        </h3>

        {/* Action Buttons */}
        <div
          className={`flex items-center gap-1 transition-opacity duration-150 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {onRefresh && (
            <button
              onClick={() => onRefresh(panel.id)}
              className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
              aria-label={`Refresh ${panel.title}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1.75 7a5.25 5.25 0 019.03-3.64M12.25 7a5.25 5.25 0 01-9.03 3.64"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.5 1.75v2.1h-2.1M3.5 12.25v-2.1h2.1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded hover:bg-danger/10 text-text-hint hover:text-danger transition-colors disabled:opacity-50"
            aria-label={`Delete ${panel.title}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-2 h-[260px]">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-xs text-text-hint">Loading chart...</div>
            </div>
          }
        >
          <Plot
            data={plotlyData}
            layout={plotlyLayout}
            config={{
              displayModeBar: true,
              displaylogo: false,
              responsive: true,
              modeBarButtonsToRemove: [
                "toImage",
                "sendDataToCloud",
                "lasso2d",
                "select2d",
              ],
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
          />
        </Suspense>
      </div>
    </div>
  );
}
