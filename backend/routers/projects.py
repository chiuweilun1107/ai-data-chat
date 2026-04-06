"""
Project CRUD + DB connection test + schema retrieval.
"""

from fastapi import APIRouter, HTTPException
from database import get_db
from models import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ErrorResponse,
    TestConnectionResponse,
    SchemaResponse,
)
from core.db import test_connection, get_schema_info
from config import DEFAULT_DB_SCHEMAS

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _project_to_conn_params(row) -> dict:
    """Convert a project DB row to conn_params dict."""
    return {
        "host": row["db_host"],
        "port": row["db_port"],
        "user": row["db_user"],
        "password": row["db_password"],
        "dbname": row["db_name"],
    }


def _get_project_or_404(conn, project_id: int):
    """Fetch project by ID or raise 404."""
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return row


@router.get("", response_model=list[ProjectResponse])
def list_projects():
    """List all projects."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        return [
            ProjectResponse(
                id=r["id"],
                name=r["name"],
                db_host=r["db_host"],
                db_port=r["db_port"],
                db_user=r["db_user"],
                db_name=r["db_name"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate):
    """Create a new project with DB connection info."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO projects (name, db_host, db_port, db_user, db_password, db_name)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (body.name, body.db_host, body.db_port, body.db_user, body.db_password, body.db_name),
        )
        project_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            db_host=row["db_host"],
            db_port=row["db_port"],
            db_user=row["db_user"],
            db_name=row["db_name"],
            created_at=row["created_at"],
        )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int):
    """Get project details (without password)."""
    with get_db() as conn:
        row = _get_project_or_404(conn, project_id)
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            db_host=row["db_host"],
            db_port=row["db_port"],
            db_user=row["db_user"],
            db_name=row["db_name"],
            created_at=row["created_at"],
        )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, body: ProjectUpdate):
    """Update project fields."""
    with get_db() as conn:
        row = _get_project_or_404(conn, project_id)

        updates = {}
        if body.name is not None:
            updates["name"] = body.name
        if body.db_host is not None:
            updates["db_host"] = body.db_host
        if body.db_port is not None:
            updates["db_port"] = body.db_port
        if body.db_user is not None:
            updates["db_user"] = body.db_user
        if body.db_password is not None:
            updates["db_password"] = body.db_password
        if body.db_name is not None:
            updates["db_name"] = body.db_name

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [project_id]
        conn.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)

        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            db_host=row["db_host"],
            db_port=row["db_port"],
            db_user=row["db_user"],
            db_name=row["db_name"],
            created_at=row["created_at"],
        )


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int):
    """Delete a project and all associated data (panels, chat messages)."""
    with get_db() as conn:
        _get_project_or_404(conn, project_id)
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))


@router.post("/{project_id}/test-connection", response_model=TestConnectionResponse)
def test_project_connection(project_id: int):
    """Test if the project's DB connection works."""
    with get_db() as conn:
        row = _get_project_or_404(conn, project_id)
        conn_params = _project_to_conn_params(row)

    success, message = test_connection(conn_params)
    return TestConnectionResponse(success=success, message=message)


@router.get("/{project_id}/schema", response_model=SchemaResponse)
def get_project_schema(project_id: int):
    """Get the database schema for the project's connected DB."""
    with get_db() as conn:
        row = _get_project_or_404(conn, project_id)
        conn_params = _project_to_conn_params(row)

    try:
        schema_text = get_schema_info(conn_params, DEFAULT_DB_SCHEMAS)
        return SchemaResponse(schema_text=schema_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無法取得 schema: {e}")
