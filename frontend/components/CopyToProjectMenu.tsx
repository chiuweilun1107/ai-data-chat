"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { fetchProjects, importPanels } from "@/lib/api";

interface CopyToProjectMenuProps {
  panelId: number;
  currentProjectId: string;
  /** Position anchor: top of the trigger button */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onCopied?: () => void;
}

export default function CopyToProjectMenu({
  panelId,
  currentProjectId,
  anchorRef,
  onClose,
  onCopied,
}: CopyToProjectMenuProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Load projects
  useEffect(() => {
    fetchProjects()
      .then((data) => {
        setProjects(
          data.filter((p) => String(p.id) !== currentProjectId)
        );
      })
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, [currentProjectId]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleCopy = useCallback(
    async (targetProjectId: string) => {
      setCopying(targetProjectId);
      setError("");
      try {
        await importPanels(targetProjectId, [panelId]);
        setSuccessId(targetProjectId);
        onCopied?.();
        // Auto-close after brief feedback
        setTimeout(() => onClose(), 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Copy failed");
      } finally {
        setCopying(null);
      }
    },
    [panelId, onCopied, onClose]
  );

  return (
    <div
      ref={menuRef}
      className="absolute right-full top-0 mr-1 z-30 w-48 py-1 bg-surface-card border border-surface-border rounded-lg shadow-xl fade-in"
      role="menu"
      aria-label="Copy to project"
    >
      <div className="px-3 py-1.5 text-[10px] text-text-hint font-medium uppercase tracking-wide">
        Copy to project
      </div>

      {loading && (
        <div className="px-3 py-3 text-[11px] text-text-hint text-center">
          Loading...
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="px-3 py-3 text-[11px] text-text-hint text-center">
          No other projects
        </div>
      )}

      {!loading &&
        projects.map((project) => (
          <button
            key={project.id}
            onClick={() => handleCopy(String(project.id))}
            disabled={copying !== null}
            className={`
              w-full px-3 py-2 text-left text-xs transition-colors
              flex items-center gap-2
              ${
                successId === String(project.id)
                  ? "text-accent bg-accent-light"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }
              disabled:opacity-50
            `}
            role="menuitem"
          >
            {copying === String(project.id) ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="animate-spin shrink-0"
              >
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="14 14"
                  strokeLinecap="round"
                />
              </svg>
            ) : successId === String(project.id) ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M2.5 6.5l2.5 2.5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="shrink-0"
              >
                <rect
                  x="3.5"
                  y="3.5"
                  width="7"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M8.5 3.5V2.5a1 1 0 00-1-1h-5a1 1 0 00-1 1v5a1 1 0 001 1h1"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            )}
            <span className="truncate">{project.name}</span>
          </button>
        ))}

      {error && (
        <div className="px-3 py-1.5 text-[10px] text-danger">{error}</div>
      )}
    </div>
  );
}
