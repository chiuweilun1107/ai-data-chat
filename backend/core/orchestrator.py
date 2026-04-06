"""
Main analysis pipeline orchestrator.
Refactored: accepts db_config dict, returns JSON-serializable results.
"""

import pandas as pd
from dataclasses import dataclass, field
from core.db import get_schema_info
from core.llm import ask_llm
from core.sql_executor import safe_execute, SQLValidationError
from core.chart_generator import execute_chart_code, ChartExecutionError
from config import DEFAULT_DB_SCHEMAS


@dataclass
class AnalysisResult:
    explanation: str = ""
    sql: str = ""
    chart_code: str = ""
    chart_json: str = ""  # fig.to_json() string
    data: list[dict] | None = None  # DataFrame as list of dicts
    error: str = ""
    text_response: str = ""


def build_history_from_messages(messages: list[dict]) -> list[dict]:
    """Build conversation history from stored chat messages for multi-turn context."""
    history = []
    for msg in messages:
        content_parts = []
        if msg.get("content"):
            content_parts.append(msg["content"])
        if msg.get("sql"):
            content_parts.append(f"使用的 SQL：\n```sql\n{msg['sql']}\n```")
        if msg.get("chart_code"):
            content_parts.append(f"使用的繪圖程式碼：\n```python\n{msg['chart_code']}\n```")

        if content_parts:
            history.append({
                "role": msg["role"],
                "content": "\n\n".join(content_parts),
            })
    return history


def run_analysis(
    db_config: dict,
    user_message: str,
    chat_history: list[dict] | None = None,
    template: dict | None = None,
    schemas: list[str] | None = None,
    schema_notes: str = "",
    max_retries: int = 2,
) -> AnalysisResult:
    """
    Full pipeline: user question -> LLM -> SQL -> DataFrame -> Chart JSON

    Args:
        db_config: {"host": ..., "port": ..., "user": ..., "password": ..., "dbname": ...}
        user_message: user's natural language question
        chat_history: list of previous messages for multi-turn context
        template: optional template dict for chart style
        schemas: list of schema names to expose to AI
        max_retries: number of retry attempts on failure

    Returns:
        AnalysisResult with JSON-serializable fields
    """
    if schemas is None:
        schemas = DEFAULT_DB_SCHEMAS

    schema_info = get_schema_info(db_config, schemas)
    if schema_notes:
        schema_info += f"\n\n## 資料庫使用說明（由用戶提供）\n{schema_notes}"
    result = AnalysisResult()
    history = build_history_from_messages(chat_history or [])

    for attempt in range(max_retries + 1):
        if attempt == 0:
            msg = user_message
        else:
            msg = (
                f"上一次嘗試失敗了，請修正：\n"
                f"錯誤：{result.error}\n"
                f"原始 SQL：{result.sql}\n"
                f"原始問題：{user_message}"
            )

        # Step 1: Ask LLM
        llm_result = ask_llm(msg, schema_info, history, template=template if attempt == 0 else None)
        result.explanation = llm_result["explanation"]
        result.sql = llm_result["sql"]
        result.chart_code = llm_result["chart_code"]
        result.text_response = llm_result["text_response"]

        # If LLM only returned text (no SQL/chart), return as-is
        if not result.sql:
            return result

        # Step 2: Execute SQL
        try:
            df = safe_execute(db_config, result.sql)
        except (SQLValidationError, Exception) as e:
            result.error = f"SQL 錯誤: {e}"
            continue

        # Convert DataFrame to list of dicts for JSON serialization
        result.data = df.to_dict(orient="records")

        # Step 3: Generate chart -> JSON string
        if result.chart_code and not df.empty:
            try:
                result.chart_json = execute_chart_code(result.chart_code, df)
            except ChartExecutionError as e:
                result.error = f"圖表錯誤: {e}"
                continue

        result.error = ""
        return result

    return result
