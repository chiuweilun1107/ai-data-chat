"""
SQLite metadata storage — projects, panels, templates, chat messages.
This is NOT the user's data database; it's our internal state.
"""

import sqlite3
from contextlib import contextmanager
from config import SQLITE_DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager for SQLite connections with auto-commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create all metadata tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                db_type TEXT NOT NULL DEFAULT 'postgresql',
                db_host TEXT NOT NULL,
                db_port INTEGER NOT NULL DEFAULT 5432,
                db_user TEXT NOT NULL,
                db_password TEXT NOT NULL,
                db_name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS panels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                sql TEXT NOT NULL DEFAULT '',
                chart_code TEXT NOT NULL DEFAULT '',
                chart_json TEXT NOT NULL DEFAULT '',
                position_x INTEGER NOT NULL DEFAULT 0,
                position_y INTEGER NOT NULL DEFAULT 0,
                width INTEGER NOT NULL DEFAULT 6,
                height INTEGER NOT NULL DEFAULT 4,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                chart_type TEXT NOT NULL,
                style_description TEXT NOT NULL DEFAULT '',
                sample_chart_code TEXT NOT NULL DEFAULT '',
                is_builtin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL DEFAULT '',
                sql TEXT NOT NULL DEFAULT '',
                chart_code TEXT NOT NULL DEFAULT '',
                chart_json TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_panels_project ON panels(project_id);
            CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id);
        """)

        # Migrate: add settings column to panels if not exists
        cols = [row[1] for row in conn.execute("PRAGMA table_info(panels)").fetchall()]
        if "settings" not in cols:
            conn.execute("ALTER TABLE panels ADD COLUMN settings TEXT NOT NULL DEFAULT ''")

        # Migrate: add schema_notes column to projects if not exists
        proj_cols = [row[1] for row in conn.execute("PRAGMA table_info(projects)").fetchall()]
        if "schema_notes" not in proj_cols:
            conn.execute("ALTER TABLE projects ADD COLUMN schema_notes TEXT NOT NULL DEFAULT ''")
