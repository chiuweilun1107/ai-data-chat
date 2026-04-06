"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";

interface SidebarProps {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

const DB_TYPE_LABELS: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mssql: "MSSQL",
};

export default function Sidebar({
  projects,
  activeProject,
  loading,
  onSelectProject,
  onNewProject,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="w-[200px] min-w-[200px] bg-surface-sidebar h-full flex flex-col border-r border-surface-border">
      {/* Header */}
      <div className="px-4 py-4 border-b border-surface-border">
        <h1 className="text-sm font-semibold text-text-primary tracking-wide">
          AI Data Chat
        </h1>
      </div>

      {/* Project List */}
      <nav className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-3">
            <div className="h-4 bg-surface-card rounded animate-pulse mb-2" />
            <div className="h-4 bg-surface-card rounded animate-pulse w-3/4" />
          </div>
        ) : projects.length === 0 ? (
          <p className="px-4 py-3 text-xs text-text-hint">
            No projects yet
          </p>
        ) : (
          projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const isHovered = hoveredId === project.id;

            return (
              <button
                key={project.id}
                onClick={() => onSelectProject(project)}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  w-full text-left px-4 py-2.5 transition-colors duration-150
                  ${
                    isActive
                      ? "bg-surface-hover text-text-primary"
                      : isHovered
                      ? "bg-surface-card text-text-primary"
                      : "text-text-secondary"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="text-sm truncate">{project.name}</div>
                <div className="text-[10px] text-text-hint mt-0.5">
                  {DB_TYPE_LABELS[project.db_type] || project.db_type}
                </div>
              </button>
            );
          })
        )}
      </nav>

      {/* New Project Button */}
      <div className="p-3 border-t border-surface-border">
        <button
          onClick={onNewProject}
          className="
            w-full py-2 px-3 text-sm rounded-card
            border border-dashed border-text-hint
            text-text-secondary hover:text-text-primary
            hover:border-text-secondary
            transition-colors duration-150
            flex items-center justify-center gap-1.5
          "
          aria-label="Create new project"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Project
        </button>
      </div>
    </aside>
  );
}
