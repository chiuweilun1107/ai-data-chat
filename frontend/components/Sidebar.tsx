"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";

interface SidebarProps {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const DB_TYPE_LABELS: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mssql: "MSSQL",
};

/* ── SVG Icons ────────────────────────────────────────────── */

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.17 3.17l1.06 1.06M11.77 11.77l1.06 1.06M3.17 12.83l1.06-1.06M11.77 4.23l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M12.4 9.6A5 5 0 016.4 3.6 5 5 0 108 13a5 5 0 004.4-3.4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 14h5M8 11v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Theme Switcher ──────────────────────────────────────── */

type ThemeMode = "light" | "dark" | "system";

function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { mode, setMode } = useTheme();

  const options: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <SunIcon />, label: "Light" },
    { value: "dark", icon: <MoonIcon />, label: "Dark" },
    { value: "system", icon: <MonitorIcon />, label: "System" },
  ];

  if (collapsed) {
    // Cycle through modes on click: system -> light -> dark -> system
    const cycle: Record<ThemeMode, ThemeMode> = {
      system: "light",
      light: "dark",
      dark: "system",
    };
    const currentOpt = options.find((o) => o.value === mode)!;

    return (
      <div className="flex justify-center">
        <button
          onClick={() => setMode(cycle[mode])}
          className="p-1.5 rounded-lg text-text-hint hover:text-text-secondary hover:bg-surface-hover transition-colors"
          aria-label={`Theme: ${currentOpt.label}. Click to change.`}
          title={currentOpt.label}
        >
          {currentOpt.icon}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0.5 bg-surface-card rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setMode(opt.value)}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150
            ${
              mode === opt.value
                ? "bg-surface-hover text-text-primary"
                : "text-text-hint hover:text-text-secondary"
            }
          `}
          aria-label={`${opt.label} theme`}
          title={opt.label}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────── */

export default function Sidebar({
  projects,
  activeProject,
  loading,
  onSelectProject,
  onNewProject,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside
      className="bg-surface-sidebar h-full flex flex-col border-r border-surface-border transition-[width,min-width] duration-200 ease-in-out overflow-hidden"
      style={{
        width: collapsed ? 48 : 200,
        minWidth: collapsed ? 48 : 200,
      }}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
        {!collapsed && (
          <h1 className="text-sm font-semibold text-text-primary tracking-wide truncate">
            AI Data Chat
          </h1>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Project List */}
      <nav className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-3 py-3">
            <div className="h-4 bg-surface-card rounded animate-pulse mb-2" />
            <div className="h-4 bg-surface-card rounded animate-pulse w-3/4" />
          </div>
        ) : projects.length === 0 ? (
          !collapsed && (
            <p className="px-4 py-3 text-xs text-text-hint">
              No projects yet
            </p>
          )
        ) : (
          projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const isHovered = hoveredId === project.id;

            if (collapsed) {
              // Collapsed: show first character as avatar
              const initial = (project.name || "?").charAt(0).toUpperCase();
              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`
                    w-full flex items-center justify-center py-2 transition-colors duration-150
                    ${
                      isActive
                        ? "bg-surface-hover text-text-primary"
                        : isHovered
                        ? "bg-surface-card text-text-primary"
                        : "text-text-secondary"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                  title={project.name}
                >
                  <span className="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-md bg-surface-card">
                    {initial}
                  </span>
                </button>
              );
            }

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

      {/* Theme Switcher */}
      <div className={`${collapsed ? "px-1" : "px-3"} pb-2`}>
        <ThemeSwitcher collapsed={collapsed} />
      </div>

      {/* New Project Button */}
      <div className={`${collapsed ? "p-1" : "p-3"} border-t border-surface-border`}>
        {collapsed ? (
          <button
            onClick={onNewProject}
            className="w-full flex items-center justify-center py-2 rounded-card text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-150"
            aria-label="Create new project"
            title="New Project"
          >
            <PlusIcon className="shrink-0" />
          </button>
        ) : (
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
            <PlusIcon className="shrink-0" />
            New Project
          </button>
        )}
      </div>
    </aside>
  );
}
