"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllPanels, importPanels, type ProjectPanelGroup } from "@/lib/api";

interface ImportPanelsModalProps {
  open: boolean;
  currentProjectId: string;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportPanelsModal({
  open,
  currentProjectId,
  onClose,
  onImported,
}: ImportPanelsModalProps) {
  const [groups, setGroups] = useState<ProjectPanelGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch all panels when modal opens
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setError("");
    setSuccessMsg("");
    setLoading(true);

    fetchAllPanels()
      .then((data) => {
        // Exclude current project
        const filtered = data.filter(
          (g) => String(g.project_id) !== currentProjectId
        );
        setGroups(filtered);
        // Auto-expand all projects
        setExpandedProjects(new Set(filtered.map((g) => g.project_id)));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load panels");
      })
      .finally(() => setLoading(false));
  }, [open, currentProjectId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const toggleProject = useCallback((projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const togglePanel = useCallback((panelId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  }, []);

  const toggleAllInProject = useCallback(
    (group: ProjectPanelGroup) => {
      const panelIds = group.panels.map((p) => p.id);
      const allSelected = panelIds.every((id) => selected.has(id));

      setSelected((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          panelIds.forEach((id) => next.delete(id));
        } else {
          panelIds.forEach((id) => next.add(id));
        }
        return next;
      });
    },
    [selected]
  );

  const handleImport = useCallback(async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await importPanels(
        currentProjectId,
        Array.from(selected)
      );
      setSuccessMsg(`Successfully imported ${result.imported} panel${result.imported !== 1 ? "s" : ""}`);
      setSelected(new Set());
      onImported();
      // Auto-close after brief delay
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [selected, currentProjectId, onImported, onClose]);

  if (!open) return null;

  const totalPanels = groups.reduce((sum, g) => sum + g.panels.length, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Import panels from other projects"
    >
      <div className="bg-surface-card rounded-lg w-full max-w-lg mx-4 shadow-2xl fade-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text-primary">
              Import Panels
            </h2>
            <p className="text-[10px] text-text-hint mt-0.5">
              Copy panels from other projects into this dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
            aria-label="Close"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-xs text-text-hint">Loading projects...</div>
            </div>
          )}

          {!loading && totalPanels === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-xs text-text-secondary">
                  No panels available in other projects
                </p>
                <p className="text-[10px] text-text-hint mt-1">
                  Create charts in other projects first
                </p>
              </div>
            </div>
          )}

          {!loading && groups.map((group) => (
            <div key={group.project_id} className="mb-3">
              {/* Project header */}
              <button
                onClick={() => toggleProject(group.project_id)}
                className="w-full flex items-center gap-2 py-2 text-left group/proj"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  className={`text-text-hint transition-transform ${
                    expandedProjects.has(group.project_id) ? "rotate-90" : ""
                  }`}
                >
                  <path
                    d="M3 1l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs font-medium text-text-primary group-hover/proj:text-accent transition-colors">
                  {group.project_name}
                </span>
                <span className="text-[10px] text-text-hint">
                  {group.panels.length} panel{group.panels.length !== 1 ? "s" : ""}
                </span>

                {/* Select all toggle for this project */}
                {group.panels.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInProject(group);
                    }}
                    className="ml-auto text-[10px] text-accent hover:text-accent-hover transition-colors"
                  >
                    {group.panels.every((p) => selected.has(p.id))
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                )}
              </button>

              {/* Panel list */}
              {expandedProjects.has(group.project_id) && (
                <div className="ml-5 space-y-1">
                  {group.panels.map((panel) => (
                    <label
                      key={panel.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-card hover:bg-surface-hover cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(panel.id)}
                        onChange={() => togglePanel(panel.id)}
                        className="accent-accent rounded shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-text-primary truncate block">
                          {panel.title}
                        </span>
                        {panel.sql && (
                          <span className="text-[10px] text-text-hint truncate block mt-0.5">
                            {panel.sql.slice(0, 60)}
                            {panel.sql.length > 60 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Messages */}
          {error && (
            <div className="px-3 py-2 rounded-card text-xs bg-danger/10 text-danger mt-2">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="px-3 py-2 rounded-card text-xs bg-accent-light text-accent mt-2">
              {successMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border shrink-0">
          <span className="text-[10px] text-text-hint">
            {selected.size} panel{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-card text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="px-4 py-2 text-sm rounded-card bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {importing
                ? "Importing..."
                : `Import Selected (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
