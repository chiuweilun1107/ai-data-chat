"""
AI chat endpoint — send a natural language question, get SQL + chart back.
"""

from fastapi import APIRouter, HTTPException
from database import get_db
from models import ChatRequest, ChatResponse, ChatMessageResponse
from core.orchestrator import run_analysis

router = APIRouter(tags=["chat"])


def _get_project_or_404(conn, project_id: int):
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return row


def _project_to_conn_params(row) -> dict:
    return {
        "host": row["db_host"],
        "port": row["db_port"],
        "user": row["db_user"],
        "password": row["db_password"],
        "dbname": row["db_name"],
    }


@router.post("/api/projects/{project_id}/chat", response_model=ChatResponse)
def send_chat(project_id: int, body: ChatRequest):
    """
    Send a natural language question to AI.
    Returns SQL, chart JSON (Plotly), explanation, and data.
    """
    with get_db() as conn:
        project = _get_project_or_404(conn, project_id)
        conn_params = _project_to_conn_params(project)

        # Fetch recent chat history (last 10 messages for context)
        if body.panel_id:
            history_rows = conn.execute(
                """SELECT role, content, sql, chart_code
                   FROM chat_messages
                   WHERE panel_id = ?
                   ORDER BY id DESC LIMIT 10""",
                (body.panel_id,),
            ).fetchall()
        else:
            history_rows = conn.execute(
                """SELECT role, content, sql, chart_code
                   FROM chat_messages
                   WHERE project_id = ? AND panel_id IS NULL
                   ORDER BY id DESC LIMIT 10""",
                (project_id,),
            ).fetchall()

        chat_history = [
            {
                "role": r["role"],
                "content": r["content"],
                "sql": r["sql"],
                "chart_code": r["chart_code"],
            }
            for r in reversed(history_rows)
        ]

        # Load template if specified
        template = None
        if body.template_id:
            tmpl_row = conn.execute(
                "SELECT * FROM templates WHERE id = ?", (body.template_id,)
            ).fetchone()
            if tmpl_row:
                template = {
                    "name": tmpl_row["name"],
                    "chart_type": tmpl_row["chart_type"],
                    "style_description": tmpl_row["style_description"],
                    "sample_sql": tmpl_row["sample_sql"] if "sample_sql" in tmpl_row.keys() else "",
                    "sample_chart_code": tmpl_row["sample_chart_code"],
                }

        # Save user message
        conn.execute(
            """INSERT INTO chat_messages (project_id, panel_id, role, content)
               VALUES (?, ?, 'user', ?)""",
            (project_id, body.panel_id, body.message),
        )

    # Run analysis (outside SQLite transaction since it calls external DB + LLM)
    schema_notes = project["schema_notes"] if "schema_notes" in project.keys() else ""
    result = run_analysis(
        db_config=conn_params,
        user_message=body.message,
        chat_history=chat_history,
        template=template,
        schema_notes=schema_notes,
    )

    # Save assistant response
    assistant_content = result.explanation or result.text_response
    with get_db() as conn:
        conn.execute(
            """INSERT INTO chat_messages (project_id, panel_id, role, content, sql, chart_code, chart_json)
               VALUES (?, ?, 'assistant', ?, ?, ?, ?)""",
            (
                project_id,
                body.panel_id,
                assistant_content,
                result.sql,
                result.chart_code,
                result.chart_json,
            ),
        )

    return ChatResponse(
        explanation=result.explanation,
        sql=result.sql,
        chart_code=result.chart_code,
        chart_json=result.chart_json,
        data=result.data,
        text_response=result.text_response,
        error=result.error,
    )


@router.get(
    "/api/projects/{project_id}/chat/history",
    response_model=list[ChatMessageResponse],
)
def get_chat_history(project_id: int, limit: int = 50):
    """Get project-level chat history (excludes panel-specific messages)."""
    with get_db() as conn:
        _get_project_or_404(conn, project_id)
        rows = conn.execute(
            """SELECT * FROM chat_messages
               WHERE project_id = ? AND panel_id IS NULL
               ORDER BY id ASC
               LIMIT ?""",
            (project_id, limit),
        ).fetchall()

        return [
            ChatMessageResponse(
                id=r["id"],
                project_id=r["project_id"],
                role=r["role"],
                content=r["content"],
                sql=r["sql"],
                chart_code=r["chart_code"],
                chart_json=r["chart_json"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


@router.get(
    "/api/panels/{panel_id}/chat/history",
    response_model=list[ChatMessageResponse],
)
def get_panel_chat_history(panel_id: int, limit: int = 50):
    """Get chat history for a specific panel's edit chat."""
    with get_db() as conn:
        row = conn.execute("SELECT id FROM panels WHERE id = ?", (panel_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Panel {panel_id} not found")

        rows = conn.execute(
            """SELECT * FROM chat_messages
               WHERE panel_id = ?
               ORDER BY id DESC
               LIMIT ?""",
            (panel_id, limit),
        ).fetchall()
        rows = list(reversed(rows))

        return [
            ChatMessageResponse(
                id=r["id"],
                project_id=r["project_id"],
                role=r["role"],
                content=r["content"],
                sql=r["sql"],
                chart_code=r["chart_code"],
                chart_json=r["chart_json"],
                created_at=r["created_at"],
            )
            for r in rows
        ]
