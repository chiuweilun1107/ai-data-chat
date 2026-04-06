"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateProjectPayload } from "@/lib/types";
import { testConnectionDirect } from "@/lib/api";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateProjectPayload) => Promise<void>;
}

const DB_TYPES = [
  { value: "postgresql", label: "PostgreSQL", defaultPort: 5432 },
  { value: "mysql", label: "MySQL", defaultPort: 3306 },
  { value: "mssql", label: "MSSQL", defaultPort: 1433 },
  { value: "sqlite", label: "SQLite", defaultPort: 0 },
];

interface FormState {
  name: string;
  db_type: string;
  db_host: string;
  db_port: string;
  db_name: string;
  db_user: string;
  db_password: string;
}

const initialForm: FormState = {
  name: "Stock Analytics",
  db_type: "postgresql",
  db_host: "100.96.229.13",
  db_port: "54322",
  db_name: "postgres",
  db_user: "postgres",
  db_password: "postgres",
};

export default function NewProjectModal({
  open,
  onClose,
  onSave,
}: NewProjectModalProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setTestResult(null);
      setError(null);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
    setError(null);
  };

  const handleDbTypeChange = (dbType: string) => {
    const dbInfo = DB_TYPES.find((d) => d.value === dbType);
    setForm((prev) => ({
      ...prev,
      db_type: dbType,
      db_port: dbInfo ? String(dbInfo.defaultPort) : prev.db_port,
    }));
    setTestResult(null);
  };

  const buildPayload = useCallback((): CreateProjectPayload => {
    return {
      name: form.name.trim(),
      db_type: form.db_type,
      db_host: form.db_host.trim(),
      db_port: parseInt(form.db_port, 10) || 5432,
      db_name: form.db_name.trim(),
      db_user: form.db_user.trim(),
      db_password: form.db_password,
    };
  }, [form]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await testConnectionDirect(buildPayload());
      setTestResult(result);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Connection test failed";
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testResult?.success) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(buildPayload());
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create project";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isSqlite = form.db_type === "sqlite";
  const canTest =
    form.name.trim() &&
    form.db_name.trim() &&
    (isSqlite || (form.db_host.trim() && form.db_user.trim()));

  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Create new project"
    >
      <div
        ref={modalRef}
        className="bg-surface-card rounded-lg w-full max-w-md mx-4 shadow-2xl fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-base font-medium text-text-primary">
            New Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-hint hover:text-text-secondary transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-xs text-text-secondary mb-1"
            >
              Project Name
            </label>
            <input
              ref={nameInputRef}
              id="project-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="My Analytics Dashboard"
              className="
                w-full px-3 py-2 text-sm rounded-card
                bg-surface-input border border-surface-border
                text-text-primary placeholder:text-text-hint
                focus:outline-none focus:border-text-hint
                transition-colors
              "
            />
          </div>

          {/* DB Type */}
          <div>
            <label
              htmlFor="db-type"
              className="block text-xs text-text-secondary mb-1"
            >
              Database Type
            </label>
            <select
              id="db-type"
              value={form.db_type}
              onChange={(e) => handleDbTypeChange(e.target.value)}
              className="
                w-full px-3 py-2 text-sm rounded-card
                bg-surface-input border border-surface-border
                text-text-primary
                focus:outline-none focus:border-text-hint
                transition-colors
              "
            >
              {DB_TYPES.map((db) => (
                <option key={db.value} value={db.value}>
                  {db.label}
                </option>
              ))}
            </select>
          </div>

          {/* Host & Port (not for SQLite) */}
          {!isSqlite && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label
                  htmlFor="db-host"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Host
                </label>
                <input
                  id="db-host"
                  type="text"
                  value={form.db_host}
                  onChange={(e) => updateField("db_host", e.target.value)}
                  placeholder="localhost"
                  className="
                    w-full px-3 py-2 text-sm rounded-card
                    bg-surface-input border border-surface-border
                    text-text-primary placeholder:text-text-hint
                    focus:outline-none focus:border-text-hint
                    transition-colors
                  "
                />
              </div>
              <div className="w-20">
                <label
                  htmlFor="db-port"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Port
                </label>
                <input
                  id="db-port"
                  type="text"
                  value={form.db_port}
                  onChange={(e) => updateField("db_port", e.target.value)}
                  placeholder="5432"
                  className="
                    w-full px-3 py-2 text-sm rounded-card
                    bg-surface-input border border-surface-border
                    text-text-primary placeholder:text-text-hint
                    focus:outline-none focus:border-text-hint
                    transition-colors
                  "
                />
              </div>
            </div>
          )}

          {/* Database Name */}
          <div>
            <label
              htmlFor="db-name"
              className="block text-xs text-text-secondary mb-1"
            >
              {isSqlite ? "Database File Path" : "Database Name"}
            </label>
            <input
              id="db-name"
              type="text"
              value={form.db_name}
              onChange={(e) => updateField("db_name", e.target.value)}
              placeholder={isSqlite ? "/path/to/database.db" : "my_database"}
              className="
                w-full px-3 py-2 text-sm rounded-card
                bg-surface-input border border-surface-border
                text-text-primary placeholder:text-text-hint
                focus:outline-none focus:border-text-hint
                transition-colors
              "
            />
          </div>

          {/* User & Password (not for SQLite) */}
          {!isSqlite && (
            <>
              <div>
                <label
                  htmlFor="db-user"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Username
                </label>
                <input
                  id="db-user"
                  type="text"
                  value={form.db_user}
                  onChange={(e) => updateField("db_user", e.target.value)}
                  placeholder="postgres"
                  className="
                    w-full px-3 py-2 text-sm rounded-card
                    bg-surface-input border border-surface-border
                    text-text-primary placeholder:text-text-hint
                    focus:outline-none focus:border-text-hint
                    transition-colors
                  "
                />
              </div>
              <div>
                <label
                  htmlFor="db-password"
                  className="block text-xs text-text-secondary mb-1"
                >
                  Password
                </label>
                <input
                  id="db-password"
                  type="password"
                  value={form.db_password}
                  onChange={(e) => updateField("db_password", e.target.value)}
                  placeholder="Enter password"
                  className="
                    w-full px-3 py-2 text-sm rounded-card
                    bg-surface-input border border-surface-border
                    text-text-primary placeholder:text-text-hint
                    focus:outline-none focus:border-text-hint
                    transition-colors
                  "
                />
              </div>
            </>
          )}

          {/* Test Connection Result */}
          {testResult && (
            <div
              className={`
                px-3 py-2 rounded-card text-xs
                ${
                  testResult.success
                    ? "bg-accent-light text-accent"
                    : "bg-danger/10 text-danger"
                }
              `}
            >
              {testResult.message}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-card text-xs bg-danger/10 text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="
              px-4 py-2 text-sm rounded-card
              text-text-secondary hover:text-text-primary
              hover:bg-surface-hover transition-colors
            "
          >
            Cancel
          </button>
          <button
            onClick={handleTestConnection}
            disabled={!canTest || testing}
            className="
              px-4 py-2 text-sm rounded-card
              border border-surface-border
              text-text-secondary hover:text-text-primary
              hover:bg-surface-hover
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={!testResult?.success || saving}
            className="
              px-4 py-2 text-sm rounded-card
              bg-accent hover:bg-accent-hover text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {saving ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
