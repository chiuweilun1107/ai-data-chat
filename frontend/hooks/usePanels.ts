"use client";

import { useCallback, useEffect, useState } from "react";
import type { Panel } from "@/lib/types";
import { fetchPanels, deletePanel as apiDeletePanel } from "@/lib/api";

interface UsePanelsReturn {
  panels: Panel[];
  loading: boolean;
  error: string | null;
  addPanel: (panel: Panel) => void;
  updatePanel: (panel: Panel) => void;
  removePanel: (panelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePanels(projectId: string | null): UsePanelsReturn {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPanels = useCallback(async () => {
    if (!projectId) {
      setPanels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPanels(projectId);
      setPanels(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load panels";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const addPanel = useCallback((panel: Panel) => {
    setPanels((prev) => [...prev, panel]);
  }, []);

  const updatePanel = useCallback((panel: Panel) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panel.id ? panel : p))
    );
  }, []);

  const removePanel = useCallback(async (panelId: string) => {
    await apiDeletePanel(panelId);
    setPanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const refresh = useCallback(async () => {
    await loadPanels();
  }, [loadPanels]);

  return {
    panels,
    loading,
    error,
    addPanel,
    updatePanel,
    removePanel,
    refresh,
  };
}
