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
  sql: string;
  chart_code: string;
  chart_json: PlotlyData;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  settings?: string; // JSON string of chart settings
  created_at: string;
}

// ── Chat ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  chart_code?: string;
  chart_json?: PlotlyData;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  template_id?: string;
  is_edit?: boolean;
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
  chart_type: string;
  style_description: string;
  sample_sql: string;
  sample_chart_code: string;
  is_builtin: boolean;
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
