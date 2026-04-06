"""
Plotly chart code sandbox execution.
Refactored: returns fig.to_json() string instead of Figure object.
"""

import plotly.express as px
import plotly.graph_objects as go
import pandas as pd


class ChartExecutionError(Exception):
    pass


def _strip_imports(code: str) -> str:
    """Remove import lines -- modules are pre-injected into namespace."""
    lines = code.split("\n")
    return "\n".join(line for line in lines if not line.strip().startswith(("import ", "from ")))


def execute_chart_code(code: str, df: pd.DataFrame) -> str:
    """
    Execute AI-generated Plotly code in a restricted namespace.
    The code must create a variable named `fig`.
    Returns: fig.to_json() string for frontend rendering with Plotly.js.
    """
    cleaned_code = _strip_imports(code)

    # Restricted namespace -- only allow plotly, pandas, and safe builtins
    safe_builtins = {
        k: __builtins__[k] if isinstance(__builtins__, dict) else getattr(__builtins__, k)
        for k in ("range", "len", "list", "dict", "tuple", "zip", "enumerate",
                   "sorted", "min", "max", "abs", "round", "sum",
                   "str", "int", "float", "bool", "print", "True", "False", "None")
        if (k in __builtins__ if isinstance(__builtins__, dict) else hasattr(__builtins__, k))
    }

    namespace = {
        "__builtins__": safe_builtins,
        "px": px,
        "go": go,
        "pd": pd,
        "df": df,
    }

    try:
        exec(cleaned_code, namespace)
    except Exception as e:
        raise ChartExecutionError(f"圖表程式碼執行失敗: {e}")

    fig = namespace.get("fig")
    if fig is None:
        raise ChartExecutionError("圖表程式碼未產生 `fig` 變數")

    if not isinstance(fig, go.Figure):
        raise ChartExecutionError(f"fig 不是 Plotly Figure，而是 {type(fig)}")

    # Dark chart theme
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="-apple-system, BlinkMacSystemFont, sans-serif", size=13, color="#d1d5db"),
        title_font=dict(size=16, color="#ececec"),
        legend=dict(font=dict(size=12, color="#999")),
        xaxis=dict(gridcolor="#2e2e2e", zerolinecolor="#2e2e2e"),
        yaxis=dict(gridcolor="#2e2e2e", zerolinecolor="#2e2e2e"),
        colorway=["#10a37f", "#5b9bd5", "#f59e0b", "#ef4444", "#8b5cf6",
                   "#06b6d4", "#ec4899", "#22c55e", "#f97316", "#6366f1"],
    )

    return fig.to_json()
