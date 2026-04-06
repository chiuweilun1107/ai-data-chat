"""
Pydantic models for request/response validation.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ─── Project ───────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    db_type: str = Field(default="postgresql")
    db_host: str = Field(..., min_length=1)
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_user: str = Field(..., min_length=1)
    db_password: str = Field(..., min_length=1)
    db_name: str = Field(..., min_length=1)
    schema_notes: str = Field(default="")


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    db_host: str | None = None
    db_port: int | None = Field(None, ge=1, le=65535)
    db_user: str | None = None
    db_password: str | None = None
    db_name: str | None = None
    schema_notes: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    db_type: str = "postgresql"
    db_host: str
    db_port: int
    db_user: str
    db_name: str
    schema_notes: str = ""
    created_at: str

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    """Includes password for internal use (e.g., test connection)."""
    db_password: str


# ─── Panel ─────────────────────────────────────────────────

class PanelCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    sql: str = Field(default="")
    chart_code: str = Field(default="")
    chart_json: str = Field(default="")
    position_x: int = Field(default=0, ge=0)
    position_y: int = Field(default=0, ge=0)
    width: int = Field(default=6, ge=1, le=12)
    height: int = Field(default=4, ge=1, le=20)
    settings: str = Field(default="")


class PanelUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    sql: str | None = None
    chart_code: str | None = None
    chart_json: str | None = None
    position_x: int | None = Field(None, ge=0)
    position_y: int | None = Field(None, ge=0)
    width: int | None = Field(None, ge=1, le=12)
    height: int | None = Field(None, ge=1, le=20)
    settings: str | None = None


class PanelResponse(BaseModel):
    id: int
    project_id: int
    title: str
    sql: str
    chart_code: str
    chart_json: str
    position_x: int
    position_y: int
    width: int
    height: int
    settings: str = ""
    created_at: str


# ─── Chat ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    template_id: int | None = None
    is_edit: bool = False


class ChatMessageResponse(BaseModel):
    id: int
    project_id: int
    role: str
    content: str
    sql: str
    chart_code: str
    chart_json: str
    created_at: str


class ChatResponse(BaseModel):
    """AI analysis result returned to frontend."""
    explanation: str = ""
    sql: str = ""
    chart_code: str = ""
    chart_json: str = ""
    data: list[dict] | None = None
    text_response: str = ""
    error: str = ""


# ─── Template ──────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    chart_type: str = Field(..., min_length=1)
    style_description: str = Field(default="")
    sample_chart_code: str = Field(default="")


class TemplateResponse(BaseModel):
    id: int
    name: str
    chart_type: str
    style_description: str
    sample_chart_code: str
    is_builtin: bool
    created_at: str


# ─── Panel Import ─────────────────────────────────────────

class PanelImport(BaseModel):
    panel_ids: list[int] = Field(..., min_length=1)


# ─── Common ────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: str | None = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


class SchemaResponse(BaseModel):
    schema_text: str
