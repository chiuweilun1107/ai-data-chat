"""
PostgreSQL connection & schema extraction.
Refactored: accepts conn_params dict instead of reading global config.

conn_params format:
    {"host": str, "port": int, "user": str, "password": str, "dbname": str}
"""

import psycopg2
import pandas as pd


def get_connection(conn_params: dict):
    """Create a PostgreSQL connection from the given parameters."""
    return psycopg2.connect(
        host=conn_params["host"],
        port=conn_params["port"],
        user=conn_params["user"],
        password=conn_params["password"],
        dbname=conn_params["dbname"],
    )


def test_connection(conn_params: dict) -> tuple[bool, str]:
    """Test if we can connect to the database. Returns (success, message)."""
    try:
        conn = get_connection(conn_params)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
        return True, "連線成功"
    except Exception as e:
        return False, f"連線失敗: {e}"


def get_schema_info(conn_params: dict, schemas: list[str] | None = None) -> str:
    """Fetch all table schemas from DB and return as formatted string for LLM prompt."""
    if schemas is None:
        schemas = ["public"]

    conn = get_connection(conn_params)
    try:
        cur = conn.cursor()
        schema_list = ",".join(f"'{s}'" for s in schemas)

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


def execute_query(conn_params: dict, sql: str, timeout_seconds: int = 10) -> pd.DataFrame:
    """Execute a read-only SQL query and return results as DataFrame."""
    conn = get_connection(conn_params)
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
