"use client";

import { useCallback, useState } from "react";
import type { CreateProjectPayload, Panel } from "@/lib/types";
import { useProjects } from "@/hooks/useProjects";
import { usePanels } from "@/hooks/usePanels";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import ChatPanel from "@/components/ChatPanel";
import NewProjectModal from "@/components/NewProjectModal";

export default function Home() {
  const {
    projects,
    activeProject,
    loading: projectsLoading,
    selectProject,
    addProject,
  } = useProjects();

  const {
    panels,
    loading: panelsLoading,
    addPanel,
    removePanel,
  } = usePanels(activeProject?.id ?? null);

  const [modalOpen, setModalOpen] = useState(false);

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
      addPanel(panel);
    },
    [addPanel]
  );

  const handleDeletePanel = useCallback(
    async (panelId: string) => {
      await removePanel(panelId);
    },
    [removePanel]
  );

  return (
    <main className="h-screen flex">
      {/* Left Sidebar */}
      <Sidebar
        projects={projects}
        activeProject={activeProject}
        loading={projectsLoading}
        onSelectProject={selectProject}
        onNewProject={handleNewProject}
      />

      {/* Center Dashboard */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dashboard Title Bar */}
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

        {/* Dashboard Content */}
        <Dashboard
          panels={panels}
          loading={panelsLoading}
          onDeletePanel={handleDeletePanel}
        />
      </div>

      {/* Right Chat Panel */}
      <ChatPanel
        projectId={activeProject?.id ?? null}
        onPanelCreated={handlePanelCreated}
      />

      {/* New Project Modal */}
      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProject}
      />
    </main>
  );
}
