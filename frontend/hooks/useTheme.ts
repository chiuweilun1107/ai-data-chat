"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

// ── System preference media query ─────────────────────────
const mql =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function getSystemDark(): boolean {
  return mql?.matches ?? true;
}

// ── Resolve effective theme ("light" | "dark") ────────────
function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemDark() ? "dark" : "light";
  return mode;
}

// ── Apply class to <html> ─────────────────────────────────
function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// ── Read from localStorage (safe for SSR) ─────────────────
function readStored(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "light" || val === "dark" || val === "system") return val;
  return "system";
}

// ── External store for system dark preference ─────────────
function subscribeSystemDark(cb: () => void) {
  mql?.addEventListener("change", cb);
  return () => mql?.removeEventListener("change", cb);
}

function getSystemDarkSnapshot(): boolean {
  return getSystemDark();
}

function getSystemDarkServerSnapshot(): boolean {
  return true; // SSR default: dark
}

// ── Hook ──────────────────────────────────────────────────
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readStored);

  // Track system preference changes so "system" mode reacts
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    getSystemDarkServerSnapshot
  );

  const resolved: "light" | "dark" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  // Apply class whenever resolved theme changes
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(resolveTheme(next));
  }, []);

  return { mode, resolved, setMode } as const;
}
