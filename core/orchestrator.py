import pandas as pd
import plotly.graph_objects as go
from dataclasses import dataclass, field
from core.db import get_schema_info
from core.llm import ask_llm
from core.sql_executor import safe_execute, SQLValidationError
from core.chart_generator import execute_chart_code, ChartExecutionError


@dataclass
class AnalysisResult:
    explanation: str = ""
    sql: str = ""
    chart_code: str = ""
    df: pd.DataFrame | None = None
    fig: go.Figure | None = None
    error: str = ""
    text_response: str = ""


def build_history_from_last(last_result: dict | None) -> list[dict]:
    """Build conversation history from the last assistant result for multi-turn context."""
    if not last_result:
        return []

    # Reconstruct what the assistant produced last time
    context_parts = []
    if last_result.get("text"):
        context_parts.append(last_result["text"])
    if last_result.get("sql"):
        context_parts.append(f"使用的 SQL：\n```sql\n{last_result['sql']}\n```")
    if last_result.get("chart_code"):
        context_parts.append(f"使用的繪圖程式碼：\n```python\n{last_result['chart_code']}\n```")

    if not context_parts:
        return []

    return [
        {"role": "assistant", "content": "\n\n".join(context_parts)},
    ]


def run_analysis(
    user_message: str,
    last_result: dict | None = None,
    template: dict | None = None,
    max_retries: int = 2,
) -> AnalysisResult:
    """
    Full pipeline: user question → LLM → SQL → DataFrame → Chart
    Retries on failure with error feedback.
    last_result: previous assistant message dict (for multi-turn修正)
    """
    schema_info = get_schema_info()
    result = AnalysisResult()
    history = build_history_from_last(last_result)

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
            result.df = safe_execute(result.sql)
        except (SQLValidationError, Exception) as e:
            result.error = f"SQL 錯誤: {e}"
            continue

        # Step 3: Generate chart
        if result.chart_code and result.df is not None and not result.df.empty:
            try:
                result.fig = execute_chart_code(result.chart_code, result.df)
            except ChartExecutionError as e:
                result.error = f"圖表錯誤: {e}"
                continue

        result.error = ""
        return result

    return result
