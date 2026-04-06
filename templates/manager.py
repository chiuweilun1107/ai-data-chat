import json
from datetime import datetime
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "saved"
TEMPLATES_DIR.mkdir(exist_ok=True)


def save_template(
    name: str,
    chart_type: str,
    style_description: str,
    sample_chart_code: str,
    sample_sql: str = "",
    sample_question: str = "",
) -> str:
    """Save a visualization style as a reusable template."""
    template = {
        "name": name,
        "chart_type": chart_type,
        "style_description": style_description,
        "sample_chart_code": sample_chart_code,
        "sample_sql": sample_sql,
        "sample_question": sample_question,
        "created_at": datetime.now().isoformat(),
    }
    filename = f"{name.replace(' ', '_').lower()}.json"
    filepath = TEMPLATES_DIR / filename
    filepath.write_text(json.dumps(template, ensure_ascii=False, indent=2))
    return filename


def list_templates() -> list[dict]:
    """List all saved templates."""
    templates = []
    for f in TEMPLATES_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            data["_filename"] = f.name
            templates.append(data)
        except json.JSONDecodeError:
            continue
    return sorted(templates, key=lambda x: x.get("created_at", ""), reverse=True)


def load_template(filename: str) -> dict | None:
    """Load a template by filename."""
    filepath = TEMPLATES_DIR / filename
    if filepath.exists():
        return json.loads(filepath.read_text())
    return None


def delete_template(filename: str) -> bool:
    """Delete a template. Returns True if deleted."""
    filepath = TEMPLATES_DIR / filename
    if filepath.exists():
        filepath.unlink()
        return True
    return False
