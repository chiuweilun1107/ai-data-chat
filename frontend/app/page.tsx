"use client";

import { useCallback, useState } from "react";
import type { CreateProjectPayload, Panel } from "@/lib/types";
import { refreshPanel as apiRefreshPanel, saveTemplate } from "@/lib/api";
import { useProjects } from "@/hooks/useProjects";
import { usePanels } from "@/hooks/usePanels";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import FloatingChat from "@/components/FloatingChat";
import PanelEditChat from "@/components/PanelEditChat";
import NewProjectModal from "@/components/NewProjectModal";
import SaveTemplateModal from "@/components/SaveTemplateModal";

export default function Home() {
  const {
    projects,
    activeProject,
    loading: projectsLoading,
    selectProject,
    addProject,
  } = useProjects();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    panels,
    loading: panelsLoading,
    addPanel,
    updatePanel,
    removePanel,
  } = usePanels(activeProject?.id ?? null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [savingTemplate, setSavingTemplate] = useState<Panel | null>(null);

  const handleNewProject = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleSaveProject = useCallback(
    async (payload: CreateProjectPayload) => {
      await addProject(payload);
    },
    [addProject]
  );

  const handlePanelCreated = useCallback(
    (panel: Panel) => {
      const exists = panels.some((p) => p.id === panel.id);
      if (exists) {
        updatePanel(panel);
      } else {
        addPanel(panel);
      }
    },
    [panels, addPanel, updatePanel]
  );

  const handleRefreshPanel = useCallback(
    async (panelId: string) => {
      try {
        const refreshed = await apiRefreshPanel(panelId);
        updatePanel(refreshed);
      } catch {
        // refresh failed silently
      }
    },
    [updatePanel]
  );

  const handleRefreshAll = useCallback(async () => {
    await Promise.allSettled(
      panels.map(async (p) => {
        try {
          const refreshed = await apiRefreshPanel(String(p.id));
          updatePanel(refreshed);
        } catch {
          // skip
        }
      })
    );
  }, [panels, updatePanel]);

  const handleDeletePanel = useCallback(
    async (panelId: string) => {
      await removePanel(panelId);
    },
    [removePanel]
  );

  return (
    <main className="h-screen flex">
      <Sidebar
        projects={projects}
        activeProject={activeProject}
        loading={projectsLoading}
        onSelectProject={selectProject}
        onNewProject={handleNewProject}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-text-primary">
              {activeProject ? activeProject.name : "Dashboard"}
            </h2>
            {activeProject && (
              <p className="text-[10px] text-text-hint mt-0.5">
                {panels.length} panel{panels.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <Dashboard
          panels={panels}
          loading={panelsLoading}
          onDeletePanel={handleDeletePanel}
          onRefreshPanel={handleRefreshPanel}
          onRefreshAll={handleRefreshAll}
          onEditPanel={(panel: Panel) => setEditingPanel(panel)}
          onSaveAsTemplate={(panel: Panel) => setSavingTemplate(panel)}
        />
      </div>

      {/* General AI Chat — floating icon */}
      <FloatingChat
        projectId={activeProject?.id ?? null}
        projectName={activeProject?.name ?? null}
        onPanelCreated={handlePanelCreated}
        editingPanel={null}
        onClearEditingPanel={() => {}}
      />

      {/* Panel Edit Chat — separate dedicated window */}
      {editingPanel && activeProject && (
        <PanelEditChat
          panel={editingPanel}
          projectId={String(activeProject.id)}
          onUpdate={(updated) => {
            updatePanel(updated);
            setEditingPanel(null);
          }}
          onClose={() => setEditingPanel(null)}
        />
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProject}
      />

      {/* Save as Template Modal */}
      {savingTemplate && (
        <SaveTemplateModal
          panel={savingTemplate}
          onClose={() => setSavingTemplate(null)}
          onSaved={() => setSavingTemplate(null)}
        />
      )}
    </main>
  );
}
