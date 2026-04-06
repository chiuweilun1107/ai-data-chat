import re
import pandas as pd
from core.db import execute_query
from config import SQL_TIMEOUT_SECONDS, MAX_ROWS

# Patterns that indicate non-SELECT statements
FORBIDDEN_PATTERNS = [
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b",
    r"\b(EXEC|EXECUTE|CALL)\b",
    r"--",  # SQL comments (potential injection)
    r";.*;",  # Multiple statements
]


class SQLValidationError(Exception):
    pass


def validate_sql(sql: str) -> str:
    """Validate that SQL is a safe SELECT query. Returns cleaned SQL."""
    cleaned = sql.strip().rstrip(";")

    if not cleaned.upper().startswith("SELECT") and not cleaned.upper().startswith("WITH"):
        raise SQLValidationError("只允許 SELECT 或 WITH (CTE) 查詢")

    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            raise SQLValidationError(f"偵測到不允許的 SQL 語法: {pattern}")

    return cleaned


def safe_execute(sql: str) -> pd.DataFrame:
    """Validate and execute SQL, returning results as DataFrame."""
    cleaned_sql = validate_sql(sql)

    # Add LIMIT if not present
    if "LIMIT" not in cleaned_sql.upper():
        cleaned_sql += f" LIMIT {MAX_ROWS}"

    return execute_query(cleaned_sql, timeout_seconds=SQL_TIMEOUT_SECONDS)
