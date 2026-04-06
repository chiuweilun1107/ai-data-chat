"""
Azure OpenAI LLM integration — tool_use for structured analysis output.
"""

import json
from openai import AzureOpenAI
from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION,
    MAX_TOKENS,
)

client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)

TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "generate_analysis",
        "description": "Generate SQL query and Plotly chart code to answer the user's data question.",
        "parameters": {
            "type": "object",
            "properties": {
                "explanation": {
                    "type": "string",
                    "description": "Brief explanation of what this analysis does (1-2 sentences, in Traditional Chinese)",
                },
                "sql": {
                    "type": "string",
                    "description": "PostgreSQL SELECT query to fetch the required data. Must be a single SELECT statement.",
                },
                "chart_code": {
                    "type": "string",
                    "description": (
                        "Python code that creates a Plotly figure from a pandas DataFrame named `df`. "
                        "The code MUST assign the figure to a variable named `fig`. "
                        "Available imports: plotly.express as px, plotly.graph_objects as go, pandas as pd. "
                        "Use fig.update_layout() for titles and labels in Traditional Chinese."
                    ),
                },
            },
            "required": ["explanation", "sql", "chart_code"],
        },
    },
}


def build_system_prompt(schema_info: str) -> str:
    return f"""你是一個資料分析助手，根據用戶的自然語言問題，生成 SQL 查詢和 Plotly 圖表。

## 資料庫 Schema（PostgreSQL）

{schema_info}

## SQL 規則

1. 只能生成 SELECT 查詢，禁止任何寫入操作
2. 必須使用 schema 前綴（如 public.candles, alice.portfolio_holdings）
3. 加上合理的 LIMIT（預設 100）避免返回過多資料
4. 日期欄位用 trade_date、ts、signal_date 等，注意各表的欄位名稱不同
5. 如果用戶問的東西無法從現有資料表回答，請說明原因
6. symbol 欄位是股票代號（如 '2330'），是文字型別，不是數字
7. 查詢股票時，一定要同時 SELECT name（股票名稱），用 name 作為圖表的顯示標籤
8. 用戶說「前 N 名」時，SQL 必須用 ORDER BY + LIMIT N 確保返回正確數量

## 圖表程式碼規範

- DataFrame 變數名為 `df`（已包含查詢結果）
- 最終圖表必須賦值給 `fig` 變數
- 可用：plotly.express as px, plotly.graph_objects as go, pandas as pd
- 不可 import 其他模組
- 圖表標題和標籤用繁體中文
- X 軸如果是股票代號或名稱，必須轉成字串型別（`df['symbol'].astype(str)`），避免被當成連續數值
- 優先用股票名稱（name）作為 X 軸標籤，而非代號（symbol）
- 圖表要美觀、資訊清晰，選擇最適合資料的圖表類型
- 長條圖超過 5 個項目時，X 軸標籤旋轉 45 度

請使用 generate_analysis 工具來回應。"""


def ask_llm(
    user_message: str,
    schema_info: str,
    history: list[dict] | None = None,
    template: dict | None = None,
) -> dict:
    """
    Send user question to Azure OpenAI and get structured analysis response.
    Returns dict with keys: explanation, sql, chart_code, text_response
    """
    messages = [{"role": "system", "content": build_system_prompt(schema_info)}]

    if history:
        messages.extend(history)

    # If template is selected, inject style reference
    if template:
        user_message = (
            f"{user_message}\n\n"
            f"---\n"
            f"請使用以下視覺化範本的風格來呈現：\n"
            f"範本名稱：{template['name']}\n"
            f"圖表類型：{template['chart_type']}\n"
            f"風格描述：{template['style_description']}\n"
            f"參考程式碼：\n```python\n{template['sample_chart_code']}\n```\n"
            f"請保持相同的圖表類型、配色、佈局風格，但根據當前資料庫 schema 生成新的 SQL。"
        )

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        max_tokens=MAX_TOKENS,
        messages=messages,
        tools=[TOOL_DEFINITION],
        tool_choice="auto",
    )

    result = {"explanation": "", "sql": "", "chart_code": "", "text_response": ""}

    choice = response.choices[0]

    # Extract tool calls
    if choice.message.tool_calls:
        for tool_call in choice.message.tool_calls:
            if tool_call.function.name == "generate_analysis":
                args = json.loads(tool_call.function.arguments)
                result["explanation"] = args.get("explanation", "")
                result["sql"] = args.get("sql", "")
                result["chart_code"] = args.get("chart_code", "")

    # Extract text content
    if choice.message.content:
        result["text_response"] = choice.message.content

    return result
