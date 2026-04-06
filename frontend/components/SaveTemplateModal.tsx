"use client";

import { useEffect, useRef, useState } from "react";
import type { Panel } from "@/lib/types";
import { saveTemplate } from "@/lib/api";

interface SaveTemplateModalProps {
  panel: Panel;
  onClose: () => void;
  onSaved: () => void;
}

const CHART_TYPES = [
  "Bar", "Line", "Candlestick", "Pie", "Scatter",
  "Heatmap", "Area", "Waterfall", "Treemap", "Radar", "Other",
];

export default function SaveTemplateModal({
  panel,
  onClose,
  onSaved,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(panel.title);
  const [chartType, setChartType] = useState("Bar");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.select(), 100);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await saveTemplate({
        name: name.trim(),
        chart_type: chartType,
        style_description: description.trim() || `${chartType} style from "${panel.title}"`,
        sample_chart_code: panel.chart_code || "",
      } as Record<string, unknown>);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-card rounded-lg w-full max-w-sm mx-4 shadow-2xl fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-medium text-text-primary">Save as Template</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Template Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-card bg-surface-input border border-surface-border text-text-primary focus:outline-none focus:border-text-hint transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-card bg-surface-input border border-surface-border text-text-primary focus:outline-none focus:border-text-hint transition-colors"
            >
              {CHART_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Style Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. grouped bars, red-green colors, sorted descending"
              className="w-full px-3 py-2 text-sm rounded-card bg-surface-input border border-surface-border text-text-primary placeholder:text-text-hint focus:outline-none focus:border-text-hint transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-card text-xs bg-danger/10 text-danger">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-card text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm rounded-card bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
