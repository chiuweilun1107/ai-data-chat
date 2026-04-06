"""
Visualization template CRUD.
"""

from fastapi import APIRouter, HTTPException
from database import get_db
from models import TemplateCreate, TemplateResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])


def _row_to_template(row) -> TemplateResponse:
    return TemplateResponse(
        id=row["id"],
        name=row["name"],
        chart_type=row["chart_type"],
        style_description=row["style_description"],
        sample_sql=row["sample_sql"] if "sample_sql" in row.keys() else "",
        sample_chart_code=row["sample_chart_code"],
        is_builtin=bool(row["is_builtin"]),
        created_at=row["created_at"],
    )


@router.get("", response_model=list[TemplateResponse])
def list_templates():
    """List all templates (built-in + user-created)."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM templates ORDER BY is_builtin DESC, created_at DESC"
        ).fetchall()
        return [_row_to_template(r) for r in rows]


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(body: TemplateCreate):
    """Save a new user-defined template."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO templates (name, chart_type, style_description, sample_sql, sample_chart_code, is_builtin)
               VALUES (?, ?, ?, ?, ?, 0)""",
            (body.name, body.chart_type, body.style_description, body.sample_sql, body.sample_chart_code),
        )
        row = conn.execute("SELECT * FROM templates WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return _row_to_template(row)
