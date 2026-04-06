"""
Panel CRUD + refresh (re-execute SQL).
"""

from fastapi import APIRouter, HTTPException
from database import get_db
from models import PanelCreate, PanelUpdate, PanelResponse
from core.db import get_connection
from core.sql_executor import safe_execute
from core.chart_generator import execute_chart_code, ChartExecutionError
import pandas as pd

router = APIRouter(tags=["panels"])


def _get_project_or_404(conn, project_id: int):
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return row


def _get_panel_or_404(conn, panel_id: int):
    row = conn.execute("SELECT * FROM panels WHERE id = ?", (panel_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Panel {panel_id} not found")
    return row


def _row_to_panel(row) -> PanelResponse:
    return PanelResponse(
        id=row["id"],
        project_id=row["project_id"],
        title=row["title"],
        sql=row["sql"],
        chart_code=row["chart_code"],
        chart_json=row["chart_json"],
        position_x=row["position_x"],
        position_y=row["position_y"],
        width=row["width"],
        height=row["height"],
        created_at=row["created_at"],
    )


def _project_to_conn_params(row) -> dict:
    return {
        "host": row["db_host"],
        "port": row["db_port"],
        "user": row["db_user"],
        "password": row["db_password"],
        "dbname": row["db_name"],
    }


@router.get("/api/projects/{project_id}/panels", response_model=list[PanelResponse])
def list_panels(project_id: int):
    """List all panels for a project, ordered by position."""
    with get_db() as conn:
        _get_project_or_404(conn, project_id)
        rows = conn.execute(
            "SELECT * FROM panels WHERE project_id = ? ORDER BY position_y, position_x",
            (project_id,),
        ).fetchall()
        return [_row_to_panel(r) for r in rows]


@router.post("/api/projects/{project_id}/panels", response_model=PanelResponse, status_code=201)
def create_panel(project_id: int, body: PanelCreate):
    """Create a new panel in a project."""
    with get_db() as conn:
        _get_project_or_404(conn, project_id)
        cursor = conn.execute(
            """INSERT INTO panels (project_id, title, sql, chart_code, chart_json,
                                   position_x, position_y, width, height)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                project_id,
                body.title,
                body.sql,
                body.chart_code,
                body.chart_json,
                body.position_x,
                body.position_y,
                body.width,
                body.height,
            ),
        )
        row = conn.execute("SELECT * FROM panels WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return _row_to_panel(row)


@router.put("/api/panels/{panel_id}", response_model=PanelResponse)
def update_panel(panel_id: int, body: PanelUpdate):
    """Update panel fields (title, position, size, etc.)."""
    with get_db() as conn:
        _get_panel_or_404(conn, panel_id)

        updates = {}
        for field_name in ("title", "sql", "chart_code", "chart_json",
                           "position_x", "position_y", "width", "height"):
            value = getattr(body, field_name)
            if value is not None:
                updates[field_name] = value

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [panel_id]
        conn.execute(f"UPDATE panels SET {set_clause} WHERE id = ?", values)

        row = conn.execute("SELECT * FROM panels WHERE id = ?", (panel_id,)).fetchone()
        return _row_to_panel(row)


@router.delete("/api/panels/{panel_id}", status_code=204)
def delete_panel(panel_id: int):
    """Delete a panel."""
    with get_db() as conn:
        _get_panel_or_404(conn, panel_id)
        conn.execute("DELETE FROM panels WHERE id = ?", (panel_id,))


@router.post("/api/panels/{panel_id}/refresh", response_model=PanelResponse)
def refresh_panel(panel_id: int):
    """Re-execute the panel's SQL and regenerate chart JSON with fresh data."""
    with get_db() as conn:
        panel = _get_panel_or_404(conn, panel_id)

        if not panel["sql"]:
            raise HTTPException(status_code=400, detail="Panel has no SQL to execute")

        # Get the project's DB connection
        project = _get_project_or_404(conn, panel["project_id"])
        conn_params = _project_to_conn_params(project)

    # Execute SQL outside the SQLite context
    try:
        df = safe_execute(conn_params, panel["sql"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL 執行失敗: {e}")

    # Regenerate chart JSON
    chart_json = ""
    if panel["chart_code"] and not df.empty:
        try:
            chart_json = execute_chart_code(panel["chart_code"], df)
        except ChartExecutionError as e:
            raise HTTPException(status_code=400, detail=f"圖表生成失敗: {e}")

    # Update chart_json in DB
    with get_db() as conn:
        conn.execute(
            "UPDATE panels SET chart_json = ? WHERE id = ?",
            (chart_json, panel_id),
        )
        row = conn.execute("SELECT * FROM panels WHERE id = ?", (panel_id,)).fetchone()
        return _row_to_panel(row)
