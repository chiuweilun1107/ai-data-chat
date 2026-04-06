"""
Built-in visualization templates — seeded on first startup.
"""

BUILTIN_TEMPLATES = [
    {
        "name": "K線圖 (Candlestick)",
        "chart_type": "candlestick",
        "style_description": "標準金融K線圖，綠漲紅跌，深色背景",
        "sample_chart_code": """fig = go.Figure(data=[go.Candlestick(
    x=df['trade_date'],
    open=df['open'],
    high=df['high'],
    low=df['low'],
    close=df['close'],
    increasing_line_color='#00d09c',
    decreasing_line_color='#ff5252',
)])
fig.update_layout(title='K線圖', xaxis_title='日期', yaxis_title='價格')""",
    },
    {
        "name": "趨勢折線圖",
        "chart_type": "line",
        "style_description": "平滑折線圖，適合時間序列趨勢分析",
        "sample_chart_code": """fig = px.line(df, x=df.columns[0], y=df.columns[1],
    title='趨勢分析', markers=True)
fig.update_traces(line=dict(width=2.5))""",
    },
    {
        "name": "長條圖比較",
        "chart_type": "bar",
        "style_description": "直立長條圖，適合類別比較",
        "sample_chart_code": """fig = px.bar(df, x=df.columns[0], y=df.columns[1],
    title='比較分析', color=df.columns[0])
fig.update_layout(showlegend=False)""",
    },
    {
        "name": "圓餅圖佔比",
        "chart_type": "pie",
        "style_description": "圓餅圖，顯示各類別佔比，帶百分比標籤",
        "sample_chart_code": """fig = px.pie(df, names=df.columns[0], values=df.columns[1],
    title='佔比分析', hole=0.3)
fig.update_traces(textposition='inside', textinfo='percent+label')""",
    },
    {
        "name": "散佈圖關聯",
        "chart_type": "scatter",
        "style_description": "散佈圖，適合探索兩變數關聯性",
        "sample_chart_code": """fig = px.scatter(df, x=df.columns[0], y=df.columns[1],
    title='關聯分析', trendline='ols')""",
    },
    {
        "name": "熱力圖",
        "chart_type": "heatmap",
        "style_description": "熱力圖，適合矩陣式資料視覺化",
        "sample_chart_code": """fig = px.imshow(df.pivot_table(index=df.columns[0], columns=df.columns[1], values=df.columns[2]),
    title='熱力圖分析', color_continuous_scale='Viridis')""",
    },
]


def seed_builtin_templates(conn):
    """Insert builtin templates if they don't exist yet."""
    existing = conn.execute("SELECT COUNT(*) FROM templates WHERE is_builtin = 1").fetchone()[0]
    if existing > 0:
        return

    for t in BUILTIN_TEMPLATES:
        conn.execute(
            """INSERT INTO templates (name, chart_type, style_description, sample_chart_code, is_builtin)
               VALUES (?, ?, ?, ?, 1)""",
            (t["name"], t["chart_type"], t["style_description"], t["sample_chart_code"]),
        )
