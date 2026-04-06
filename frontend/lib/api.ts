import type {
  Project,
  CreateProjectPayload,
  TestConnectionResult,
  Panel,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Template,
  DBSchema,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Generic Fetch Wrapper ────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new ApiError(body, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ── Projects ─────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  return request<Project[]>("/api/projects");
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<Project> {
  return request<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function testConnection(
  projectId: string
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(
    `/api/projects/${projectId}/test-connection`,
    { method: "POST" }
  );
}

export async function testConnectionDirect(
  payload: CreateProjectPayload
): Promise<TestConnectionResult> {
  return request<TestConnectionResult>("/api/projects/test-connection", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSchema(projectId: string): Promise<DBSchema> {
  return request<DBSchema>(`/api/projects/${projectId}/schema`);
}

// ── Panels ───────────────────────────────────────────────

export async function fetchPanels(projectId: string): Promise<Panel[]> {
  return request<Panel[]>(`/api/projects/${projectId}/panels`);
}

export async function createPanel(
  projectId: string,
  panel: Partial<Panel>
): Promise<Panel> {
  return request<Panel>(`/api/projects/${projectId}/panels`, {
    method: "POST",
    body: JSON.stringify(panel),
  });
}

export async function updatePanel(
  panelId: string,
  panel: Partial<Panel>
): Promise<Panel> {
  return request<Panel>(`/api/panels/${panelId}`, {
    method: "PUT",
    body: JSON.stringify(panel),
  });
}

export async function deletePanel(panelId: string): Promise<void> {
  return request<void>(`/api/panels/${panelId}`, { method: "DELETE" });
}

// ── Chat ─────────────────────────────────────────────────

export async function sendChatMessage(
  projectId: string,
  payload: ChatRequest
): Promise<ChatResponse> {
  return request<ChatResponse>(`/api/projects/${projectId}/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchChatHistory(
  projectId: string
): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/api/projects/${projectId}/chat/history`);
}

// ── Templates ────────────────────────────────────────────

export async function fetchTemplates(): Promise<Template[]> {
  return request<Template[]>("/api/templates");
}

export async function saveTemplate(
  template: Partial<Template>
): Promise<Template> {
  return request<Template>("/api/templates", {
    method: "POST",
    body: JSON.stringify(template),
  });
}
