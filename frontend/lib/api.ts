import type {
  Project,
  CreateProjectPayload,
  TestConnectionResult,
  Panel,
  PlotlyData,
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
  const raw = await request<Record<string, unknown>[]>(`/api/projects/${projectId}/panels`);
  return raw.map((item) => {
    let chartJson: PlotlyData = { data: [], layout: {} };
    if (item.chart_json && typeof item.chart_json === "string") {
      try {
        chartJson = JSON.parse(item.chart_json as string);
      } catch {
        // keep default
      }
    } else if (item.chart_json && typeof item.chart_json === "object") {
      chartJson = item.chart_json as PlotlyData;
    }
    return {
      ...item,
      id: String(item.id),
      project_id: String(item.project_id),
      chart_json: chartJson,
    } as Panel;
  });
}

export async function createPanel(
  projectId: string,
  panel: Partial<Panel>
): Promise<Panel> {
  // Backend expects chart_json as string
  const payload = {
    ...panel,
    chart_json: typeof panel.chart_json === "object"
      ? JSON.stringify(panel.chart_json)
      : panel.chart_json || "",
  };
  return request<Panel>(`/api/projects/${projectId}/panels`, {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function refreshPanel(panelId: string): Promise<Panel> {
  const raw = await request<Record<string, unknown>>(`/api/panels/${panelId}/refresh`, {
    method: "POST",
  });
  let chartJson: PlotlyData = { data: [], layout: {} };
  if (raw.chart_json && typeof raw.chart_json === "string") {
    try {
      chartJson = JSON.parse(raw.chart_json as string);
    } catch {
      // keep default
    }
  } else if (raw.chart_json && typeof raw.chart_json === "object") {
    chartJson = raw.chart_json as PlotlyData;
  }
  return {
    ...raw,
    id: String(raw.id),
    project_id: String(raw.project_id),
    chart_json: chartJson,
  } as Panel;
}

// ── Chat ─────────────────────────────────────────────────

export async function sendChatMessage(
  projectId: string,
  payload: ChatRequest
): Promise<ChatResponse> {
  const raw = await request<Record<string, unknown>>(`/api/projects/${projectId}/chat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Parse chart_json from string to object
  let chartJson: PlotlyData | undefined;
  if (raw.chart_json && typeof raw.chart_json === "string") {
    try {
      chartJson = JSON.parse(raw.chart_json as string);
    } catch {
      chartJson = undefined;
    }
  } else if (raw.chart_json && typeof raw.chart_json === "object") {
    chartJson = raw.chart_json as PlotlyData;
  }

  // Auto-create panel if chart was generated
  let panelId = "";
  if (chartJson && raw.sql) {
    try {
      const panel = await createPanel(projectId, {
        title: (raw.explanation as string || payload.message).slice(0, 60),
        sql: raw.sql as string,
        chart_code: raw.chart_code as string || "",
        chart_json: chartJson,
      } as Partial<Panel>);
      panelId = String(panel.id);
    } catch {
      // Panel creation failed, still return chat result
    }
  }

  // If there's an error, prepend it to explanation
  const error = raw.error as string || "";
  let explanation = (raw.explanation as string) || (raw.text_response as string) || "";
  if (error && !chartJson) {
    explanation = explanation ? `${explanation}\n\n⚠ ${error}` : `⚠ ${error}`;
  }

  return {
    explanation,
    sql: (raw.sql as string) || "",
    chart_code: (raw.chart_code as string) || "",
    chart_json: chartJson as PlotlyData,
    panel_id: panelId,
    message_id: `msg-${Date.now()}`,
  };
}

export async function fetchChatHistory(
  projectId: string
): Promise<ChatMessage[]> {
  const raw = await request<Record<string, unknown>[]>(`/api/projects/${projectId}/chat/history`);
  return raw.map((item) => {
    let chartJson: PlotlyData | undefined;
    if (item.chart_json && typeof item.chart_json === "string") {
      try {
        const parsed = JSON.parse(item.chart_json as string);
        // Only set if it's a valid plotly object with data
        if (parsed && typeof parsed === "object" && parsed.data) {
          chartJson = parsed;
        }
      } catch {
        // ignore invalid JSON
      }
    } else if (item.chart_json && typeof item.chart_json === "object") {
      chartJson = item.chart_json as PlotlyData;
    }
    return {
      id: String(item.id),
      role: item.role as "user" | "assistant",
      content: (item.content as string) || "",
      sql: (item.sql as string) || undefined,
      chart_code: (item.chart_code as string) || undefined,
      chart_json: chartJson,
      created_at: item.created_at as string,
    } as ChatMessage;
  });
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
