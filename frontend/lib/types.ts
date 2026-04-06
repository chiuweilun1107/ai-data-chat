// ── Project ──────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  db_type: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  name: string;
  db_type: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
}

export interface TestConnectionPayload {
  db_type: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

// ── Panel ────────────────────────────────────────────────

export interface PlotlyData {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

export interface Panel {
  id: string;
  project_id: string;
  title: string;
  chart_type: string;
  chart_json: PlotlyData;
  sql: string;
  order: number;
  created_at: string;
  updated_at: string;
}

// ── Chat ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  chart_json?: PlotlyData;
  panel_id?: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  template_id?: string;
}

export interface ChatResponse {
  explanation: string;
  sql: string;
  chart_code: string;
  chart_json: PlotlyData;
  panel_id: string;
  message_id: string;
}

// ── Template ─────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
}

// ── DB Schema ────────────────────────────────────────────

export interface DBColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DBTable {
  name: string;
  columns: DBColumn[];
}

export interface DBSchema {
  tables: DBTable[];
}
