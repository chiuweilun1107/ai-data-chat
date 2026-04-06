"use client";

import { useCallback, useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import type { Panel } from "@/lib/types";
import { updatePanel as apiUpdatePanel } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const Plot = lazy(() => import("react-plotly.js"));

interface ChartSettings {
  fontSize: number;
  titleSize: number;
  fontColor: string;
  showLegend: boolean;
  showGrid: boolean;
}

const DEFAULT_CHART_SETTINGS: ChartSettings = {
  fontSize: 11,
  titleSize: 14,
  fontColor: "",
  showLegend: true,
  showGrid: true,
};

interface PanelCardProps {
  panel: Panel;
  onDelete: (panelId: string) => void;
  onRefresh?: (panelId: string) => void;
  onEdit?: (panel: Panel) => void;
  onSaveAsTemplate?: (panel: Panel) => void;
}

export default function PanelCard({
  panel,
  onDelete,
  onRefresh,
  onEdit,
  onSaveAsTemplate,
}: PanelCardProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(() => {
    if (panel.settings) {
      try {
        return { ...DEFAULT_CHART_SETTINGS, ...JSON.parse(panel.settings) };
      } catch {
        return { ...DEFAULT_CHART_SETTINGS };
      }
    }
    return { ...DEFAULT_CHART_SETTINGS };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { resolved: theme } = useTheme();

  // Debounced save: persist chartSettings to backend 500ms after last change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      apiUpdatePanel(panel.id, { settings: JSON.stringify(chartSettings) } as Partial<Panel>).catch(() => {
        // settings save failed silently
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [chartSettings, panel.id]);

  const plotlyLayout = useMemo(() => {
    const isDark = theme === "dark";
    const base = (panel.chart_json?.layout || {}) as Record<string, unknown>;
    const xaxis = (base.xaxis || {}) as Record<string, unknown>;
    const yaxis = (base.yaxis || {}) as Record<string, unknown>;
    const gridColor = isDark ? "#3a3a3a" : "#e5e7eb";
    const defaultFontColor = isDark ? "#ececec" : "#000000";
    const activeFontColor = chartSettings.fontColor || defaultFontColor;
    return {
      ...base,
      template: isDark ? "plotly_dark" : "plotly_white",
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { color: activeFontColor, size: chartSettings.fontSize },
      title: base.title ? { ...(typeof base.title === "object" ? base.title : { text: base.title }), font: { size: chartSettings.titleSize, color: activeFontColor } } : undefined,
      margin: { t: 32, r: 16, b: 48, l: 56 },
      autosize: true,
      showlegend: chartSettings.showLegend,
      xaxis: {
        ...xaxis,
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        showgrid: chartSettings.showGrid,
      },
      yaxis: {
        ...yaxis,
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        showgrid: chartSettings.showGrid,
      },
    };
  }, [panel.chart_json, theme, chartSettings]);

  const plotlyData = useMemo(() => {
    return (panel.chart_json?.data || []) as Array<Record<string, unknown>>;
  }, [panel.chart_json]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setMenuOpen(false);
    try {
      await onDelete(panel.id);
    } catch {
      setDeleting(false);
    }
  }, [onDelete, panel.id]);

  const handleRefresh = useCallback(() => {
    setMenuOpen(false);
    onRefresh?.(panel.id);
  }, [onRefresh, panel.id]);

  const getPlotDiv = () => {
    return chartRef.current?.querySelector(".js-plotly-plot") as HTMLElement | null;
  };

  const handleResetZoom = useCallback(() => {
    setMenuOpen(false);
    const el = getPlotDiv();
    if (el && (window as unknown as Record<string, unknown>).Plotly) {
      (window as unknown as { Plotly: { relayout: (el: HTMLElement, update: Record<string, unknown>) => void } }).Plotly.relayout(el, {
        "xaxis.autorange": true,
        "yaxis.autorange": true,
      });
    }
  }, []);

  const handleDownload = useCallback(() => {
    setMenuOpen(false);
    const el = getPlotDiv();
    if (el && (window as unknown as Record<string, unknown>).Plotly) {
      (window as unknown as { Plotly: { downloadImage: (el: HTMLElement, opts: Record<string, unknown>) => void } }).Plotly.downloadImage(el, {
        format: "png",
        width: 1200,
        height: 600,
        filename: panel.title || "chart",
      });
    }
  }, [panel.title]);

  const handleFullscreen = useCallback(() => {
    setMenuOpen(false);
    setFullscreen((prev) => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    setMenuOpen(false);
    onEdit?.(panel);
  }, [onEdit, panel]);

  return (
    <div
      ref={containerRef}
      className={`
        bg-surface-card rounded-card relative group
        ${fullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      {fullscreen && (
        <div className="fixed inset-0 bg-black/60 -z-10" onClick={handleFullscreen} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3
          className={`text-sm font-medium text-text-primary truncate pr-2 ${onEdit ? "cursor-pointer hover:text-accent transition-colors" : ""}`}
          onClick={() => onEdit?.(panel)}
        >
          {panel.title}
        </h3>

        {/* Dots menu button */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`
              p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary
              transition-opacity duration-150
              ${hovered ? "opacity-100" : "opacity-0"}
            `}
            aria-label="Panel options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="1.2" fill="currentColor" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="13" r="1.2" fill="currentColor" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-40 py-1 bg-surface-card border border-surface-border rounded-lg shadow-xl">
              {onEdit && (
                <button onClick={handleEdit} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5V8.5l7-7z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Edit chart
                </button>
              )}
              {onRefresh && (
                <button onClick={handleRefresh} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1.75 7a5.25 5.25 0 019.03-3.64M12.25 7a5.25 5.25 0 01-9.03 3.64" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  Refresh data
                </button>
              )}
              <button onClick={handleResetZoom} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                Reset zoom
              </button>
              <button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v1M6 10v1M10.66 3l-.87.5M2.21 8.5l-.87.5M10.66 9l-.87-.5M2.21 3.5l-.87-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" /></svg>
                Chart settings
              </button>
              <button onClick={handleDownload} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Download PNG
              </button>
              <button onClick={handleFullscreen} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
              {onSaveAsTemplate && (
                <button onClick={() => { setMenuOpen(false); onSaveAsTemplate(panel); }} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 10.5h-7a1 1 0 01-1-1v-7a1 1 0 011-1h5l3 3v5a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10.5V6.5h4v4" stroke="currentColor" strokeWidth="1" /><path d="M4 1.5v2h3" stroke="currentColor" strokeWidth="1" /></svg>
                  Save as template
                </button>
              )}
              <div className="border-t border-surface-border my-1" />
              <button onClick={handleDelete} disabled={deleting} className="w-full px-3 py-2 text-left text-xs text-danger hover:bg-danger/10 transition-colors flex items-center gap-2 disabled:opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M5 5.5v3M7 5.5v3M3 3l.5 7a1 1 0 001 1h3a1 1 0 001-1L9 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart — responsive height */}
      <div ref={chartRef} className="px-2 pb-2 overflow-hidden rounded-b-card" style={{ height: fullscreen ? "calc(100% - 48px)" : "clamp(200px, 30vw, 400px)" }}>
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
              displayModeBar: false,
              displaylogo: false,
              responsive: true,
              scrollZoom: true,
            }}
            useResizeHandler
            style={{ width: "100%", height: "100%" }}
          />
        </Suspense>
      </div>

      {/* Chart Settings — floating modal */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
          <div className="absolute top-12 right-4 z-50 w-56 bg-surface-card border border-surface-border rounded-lg shadow-xl p-4 space-y-3 fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">Chart Settings</span>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] text-text-secondary">Font size</label>
              <div className="flex items-center gap-2">
                <input type="range" min={8} max={20} value={chartSettings.fontSize}
                  onChange={(e) => setChartSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                  className="w-16 accent-accent" />
                <span className="text-[10px] text-text-hint w-5 text-right">{chartSettings.fontSize}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] text-text-secondary">Title size</label>
              <div className="flex items-center gap-2">
                <input type="range" min={10} max={28} value={chartSettings.titleSize}
                  onChange={(e) => setChartSettings((s) => ({ ...s, titleSize: Number(e.target.value) }))}
                  className="w-16 accent-accent" />
                <span className="text-[10px] text-text-hint w-5 text-right">{chartSettings.titleSize}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] text-text-secondary">Font color</label>
              <div className="flex items-center gap-1.5">
                <input type="color"
                  value={chartSettings.fontColor || (theme === "dark" ? "#ececec" : "#000000")}
                  onChange={(e) => setChartSettings((s) => ({ ...s, fontColor: e.target.value }))}
                  className="w-6 h-6 rounded border border-surface-border cursor-pointer" />
                {chartSettings.fontColor && (
                  <button onClick={() => setChartSettings((s) => ({ ...s, fontColor: "" }))}
                    className="text-[10px] text-accent hover:underline">Reset</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                <input type="checkbox" checked={chartSettings.showLegend}
                  onChange={(e) => setChartSettings((s) => ({ ...s, showLegend: e.target.checked }))}
                  className="accent-accent" />
                Legend
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                <input type="checkbox" checked={chartSettings.showGrid}
                  onChange={(e) => setChartSettings((s) => ({ ...s, showGrid: e.target.checked }))}
                  className="accent-accent" />
                Grid
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
