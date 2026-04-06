"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, CreateProjectPayload } from "@/lib/types";
import { fetchProjects, createProject } from "@/lib/api";

interface UseProjectsReturn {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;
  selectProject: (project: Project) => void;
  addProject: (payload: CreateProjectPayload) => Promise<Project>;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProject = useCallback((project: Project) => {
    setActiveProject(project);
  }, []);

  const addProject = useCallback(
    async (payload: CreateProjectPayload): Promise<Project> => {
      const newProject = await createProject(payload);
      setProjects((prev) => [...prev, newProject]);
      setActiveProject(newProject);
      return newProject;
    },
    []
  );

  const refresh = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  return {
    projects,
    activeProject,
    loading,
    error,
    selectProject,
    addProject,
    refresh,
  };
}
