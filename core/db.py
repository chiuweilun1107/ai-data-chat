import psycopg2
import pandas as pd
from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SCHEMAS


def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
    )


def get_schema_info() -> str:
    """Fetch all table schemas from DB and return as formatted string for LLM prompt."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        schema_list = ",".join(f"'{s}'" for s in DB_SCHEMAS)

        # Get tables
        cur.execute(f"""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema IN ({schema_list})
            AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
        """)
        tables = cur.fetchall()

        # Get columns for each table
        cur.execute(f"""
            SELECT table_schema, table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema IN ({schema_list})
            ORDER BY table_schema, table_name, ordinal_position
        """)
        columns = cur.fetchall()

        # Get row counts
        cur.execute(f"""
            SELECT schemaname, relname, n_live_tup
            FROM pg_stat_user_tables
            WHERE schemaname IN ({schema_list})
        """)
        row_counts = {(r[0], r[1]): r[2] for r in cur.fetchall()}

        # Build schema text
        col_map: dict[tuple[str, str], list] = {}
        for schema, table, col, dtype, nullable in columns:
            col_map.setdefault((schema, table), []).append(
                f"    {col} {dtype}{'' if nullable == 'YES' else ' NOT NULL'}"
            )

        lines = []
        for schema, table in tables:
            count = row_counts.get((schema, table), 0)
            cols_text = "\n".join(col_map.get((schema, table), []))
            lines.append(f"{schema}.{table} ({count:,} rows):\n{cols_text}")

        return "\n\n".join(lines)
    finally:
        conn.close()


def execute_query(sql: str, timeout_seconds: int = 10) -> pd.DataFrame:
    """Execute a read-only SQL query and return results as DataFrame."""
    conn = get_connection()
    try:
        conn.set_session(readonly=True)
        cur = conn.cursor()
        cur.execute(f"SET statement_timeout = '{timeout_seconds}s'")
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        return pd.DataFrame(rows, columns=columns)
    finally:
        conn.close()
