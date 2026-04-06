import json
import streamlit as st
import pandas as pd
from pathlib import Path

from core.orchestrator import run_analysis
from templates.manager import save_template, list_templates, load_template, delete_template
from utils.safety import sanitize_user_input

# Page config
st.set_page_config(page_title="AI Data Chat", page_icon="📊", layout="wide")

# --- ChatGPT-style Dark Theme ---
st.markdown("""
<style>
/* === Reset === */
#MainMenu, footer, header {visibility: hidden;}
.block-container {
    padding: 0 !important;
    max-width: 768px;
    margin: 0 auto;
}

/* === Sidebar — ChatGPT dark panel === */
section[data-testid="stSidebar"] {
    background: #171717;
    border-right: 1px solid #2e2e2e;
}
section[data-testid="stSidebar"] [data-testid="stSidebarContent"] {
    padding: 16px 12px;
}
section[data-testid="stSidebar"] h1,
section[data-testid="stSidebar"] h2,
section[data-testid="stSidebar"] h3 {
    font-size: 13px !important;
    font-weight: 600 !important;
    color: #999 !important;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px !important;
}

/* === Main area === */
.main .block-container {
    padding-top: 0 !important;
}

/* === Header — minimal like ChatGPT === */
.app-header {
    padding: 48px 0 24px 0;
    text-align: center;
}
.app-header h1 {
    font-size: 24px;
    font-weight: 600;
    color: #ececec;
    margin: 0 0 6px 0;
    letter-spacing: -0.3px;
}
.app-header .subtitle {
    font-size: 14px;
    color: #666;
    font-weight: 400;
}

/* === Chat messages === */
.stChatMessage {
    border: none !important;
    border-radius: 0 !important;
    padding: 24px 0 !important;
    margin: 0 !important;
    background: transparent !important;
}

/* === Chat input — rounded pill like ChatGPT === */
.stChatInput > div {
    border-radius: 24px !important;
    border: 1px solid #3e3e3e !important;
    background: #2f2f2f !important;
    padding: 4px 8px !important;
}
.stChatInput textarea {
    font-size: 15px !important;
    color: #ececec !important;
    line-height: 1.5 !important;
}
.stChatInput textarea::placeholder {
    color: #666 !important;
}

/* === Buttons — ghost style === */
.stButton > button {
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #b4b4b4;
    font-size: 14px;
    font-weight: 400;
    padding: 10px 12px;
    transition: background 0.15s ease;
    width: 100%;
    text-align: left;
}
.stButton > button:hover {
    background: #2a2a2a;
    color: #ececec;
    border-color: transparent;
}

/* === Expanders — subtle === */
details {
    border: 1px solid #2e2e2e !important;
    border-radius: 8px !important;
    background: #1a1a1a !important;
    margin-bottom: 8px !important;
}
details summary {
    font-size: 13px !important;
    font-weight: 500 !important;
    color: #999 !important;
    padding: 10px 16px !important;
}
details summary:hover {
    color: #ccc !important;
}
details[open] summary {
    border-bottom: 1px solid #2e2e2e !important;
}

/* === Code blocks — monospace === */
.stCode, pre {
    font-family: 'Söhne Mono', 'JetBrains Mono', 'Fira Code', monospace !important;
    font-size: 13px !important;
    border-radius: 8px !important;
    background: #1a1a1a !important;
    border: 1px solid #2e2e2e !important;
}

/* === Plotly charts === */
.stPlotlyChart {
    border-radius: 12px;
    overflow: hidden;
    margin: 16px 0;
}

/* === Data tables === */
.stDataFrame {
    border-radius: 8px;
    overflow: hidden;
}

/* === Select boxes === */
.stSelectbox label {
    font-size: 12px !important;
    color: #888 !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.stSelectbox > div > div {
    border-radius: 8px !important;
    border-color: #2e2e2e !important;
    background: #2f2f2f !important;
    font-size: 14px !important;
}

/* === Text inputs === */
.stTextInput label {
    font-size: 13px !important;
    color: #999 !important;
}
.stTextInput > div > div > input {
    border-radius: 8px !important;
    border-color: #2e2e2e !important;
    background: #2f2f2f !important;
    font-size: 14px !important;
    color: #ececec !important;
}

/* === Info/Alert === */
.stAlert {
    border-radius: 8px !important;
    font-size: 14px !important;
}

/* === Dividers === */
hr {
    border-color: #2e2e2e !important;
    margin: 12px 0 !important;
}

/* === Scrollbar — thin === */
::-webkit-scrollbar {width: 5px;}
::-webkit-scrollbar-track {background: transparent;}
::-webkit-scrollbar-thumb {background: #444; border-radius: 4px;}
::-webkit-scrollbar-thumb:hover {background: #555;}

/* === Markdown text in chat === */
.stChatMessage .stMarkdown p {
    font-size: 15px;
    line-height: 1.7;
    color: #d1d5db;
}

/* === Success/Error === */
.stSuccess {
    background: rgba(16, 163, 127, 0.1) !important;
    color: #10a37f !important;
}
.stError {
    background: rgba(239, 68, 68, 0.1) !important;
}
</style>
""", unsafe_allow_html=True)

# Header — clean, minimal
st.markdown("""
<div class="app-header">
    <h1>AI Data Chat</h1>
    <div class="subtitle">用自然語言查詢資料庫，自動產出可互動面板</div>
</div>
""", unsafe_allow_html=True)

# --- Built-in example templates ---
BUILTIN_TEMPLATES = [
    {
        "name": "排名長條圖",
        "chart_type": "長條圖",
        "style_description": "水平長條、紅綠漸層配色、數值標籤、由高到低排序",
        "sample_chart_code": "fig = px.bar(df, x=df.columns[-1], y=df.columns[0], orientation='h', color=df.columns[-1], color_continuous_scale='RdYlGn', text=df.columns[-1])\nfig.update_layout(yaxis={'categoryorder': 'total ascending'}, showlegend=False)",
        "builtin": True,
    },
    {
        "name": "趨勢折線圖",
        "chart_type": "折線圖",
        "style_description": "多系列折線、圓點標記、淺色填充底部、圖例在上方",
        "sample_chart_code": "fig = px.line(df, x=df.columns[0], y=df.columns[1:].tolist(), markers=True)\nfig.update_layout(legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='center', x=0.5))\nfor trace in fig.data:\n    trace.update(fill='tozeroy', fillcolor=trace.line.color.replace(')', ',0.1)').replace('rgb', 'rgba') if 'rgb' in str(trace.line.color) else None)",
        "builtin": True,
    },
    {
        "name": "佔比圓餅圖",
        "chart_type": "圓餅圖",
        "style_description": "甜甜圈樣式、百分比標籤、柔和配色",
        "sample_chart_code": "fig = px.pie(df, values=df.columns[-1], names=df.columns[0], hole=0.4)\nfig.update_traces(textposition='outside', textinfo='label+percent')\nfig.update_layout(showlegend=False)",
        "builtin": True,
    },
    {
        "name": "分組比較圖",
        "chart_type": "長條圖",
        "style_description": "分組並排長條、對比色系、45度斜標籤",
        "sample_chart_code": "fig = px.bar(df, x=df.columns[0], y=df.columns[1:].tolist(), barmode='group')\nfig.update_layout(xaxis_tickangle=-45, legend_title='')",
        "builtin": True,
    },
    {
        "name": "熱力矩陣圖",
        "chart_type": "熱力圖",
        "style_description": "紅藍漸層、數值標註、適合交叉分析",
        "sample_chart_code": "pivot = df.pivot_table(index=df.columns[0], columns=df.columns[1], values=df.columns[2], aggfunc='sum').fillna(0)\nfig = px.imshow(pivot, text_auto=True, color_continuous_scale='RdBu_r', aspect='auto')",
        "builtin": True,
    },
    {
        "name": "正負值瀑布圖",
        "chart_type": "瀑布圖",
        "style_description": "紅跌綠漲、累計標線、適合損益分析",
        "sample_chart_code": "colors = ['#22c55e' if v >= 0 else '#ef4444' for v in df[df.columns[-1]]]\nfig = go.Figure(go.Waterfall(x=df[df.columns[0]], y=df[df.columns[-1]], connector={'line': {'color': '#888'}}, increasing={'marker': {'color': '#22c55e'}}, decreasing={'marker': {'color': '#ef4444'}}))",
        "builtin": True,
    },
]

# --- Sidebar: Templates ---
with st.sidebar:
    st.header("視覺化範本")
    user_templates = list_templates()
    all_templates = user_templates + BUILTIN_TEMPLATES

    # Template selector
    selected_template = None
    tpl_options = ["不使用範本"]
    if user_templates:
        tpl_options += [t["name"] for t in user_templates]
    tpl_options += [t["name"] for t in BUILTIN_TEMPLATES]

    tpl_choice = st.selectbox("套用範本風格", tpl_options, key="tpl_select")
    if tpl_choice != "不使用範本":
        selected_template = next(t for t in all_templates if t["name"] == tpl_choice)
        st.info(f"**{selected_template['chart_type']}**｜{selected_template['style_description']}")

    # Template management
    if user_templates:
        st.divider()
        with st.expander("管理我的範本"):
            for t in user_templates:
                col1, col2 = st.columns([4, 1])
                with col1:
                    st.caption(f"**{t['name']}** — {t['chart_type']}")
                with col2:
                    if st.button("🗑", key=f"del_{t['_filename']}"):
                        delete_template(t["_filename"])
                        st.rerun()

    st.divider()
    st.header("試試看")
    examples = [
        "顯示近30天外資買超前10名",
        "三大法人近一個月每日買賣超趨勢",
        "近一週融資融券變化最大的股票",
        "分點券商近期主力動向",
    ]
    for ex in examples:
        if st.button(ex, key=f"ex_{ex}"):
            st.session_state["prefill"] = ex

# --- Init session state ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- Display chat history ---
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg.get("text"):
            st.markdown(msg["text"])
        if msg.get("df") is not None:
            with st.expander("查詢結果", expanded=False):
                st.dataframe(msg["df"], use_container_width=True)
        if msg.get("fig"):
            st.plotly_chart(msg["fig"], use_container_width=True)
        if msg.get("sql"):
            with st.expander("SQL", expanded=False):
                st.code(msg["sql"], language="sql")
        if msg.get("chart_code"):
            with st.expander("繪圖程式碼", expanded=False):
                st.code(msg["chart_code"], language="python")

# --- Chat input ---
prefill = st.session_state.pop("prefill", None)
if prefill:
    user_input = prefill
else:
    placeholder = "請輸入你的問題，例如：顯示近30天外資買超前10名"
    if selected_template:
        placeholder = f"已套用「{selected_template['name']}」風格，請輸入你想查詢的內容"
    user_input = st.chat_input(placeholder)

if user_input:
    # Display user message
    display_text = user_input
    if selected_template:
        display_text = f"[{selected_template['name']}] {user_input}"
    st.session_state.messages.append({"role": "user", "text": display_text})
    with st.chat_message("user"):
        st.markdown(display_text)

    # Get last assistant message for multi-turn context
    last_assistant = None
    for m in reversed(st.session_state.messages):
        if m.get("role") == "assistant" and m.get("sql"):
            last_assistant = m
            break

    # Run analysis
    with st.chat_message("assistant"):
        with st.spinner("分析中..."):
            result = run_analysis(
                sanitize_user_input(user_input),
                last_result=last_assistant,
                template=selected_template,
            )

        assistant_msg = {"role": "assistant"}

        if result.error:
            st.error(f"❌ {result.error}")
            assistant_msg["text"] = f"❌ {result.error}"
        else:
            # Explanation
            if result.explanation:
                st.markdown(result.explanation)
                assistant_msg["text"] = result.explanation
            elif result.text_response:
                st.markdown(result.text_response)
                assistant_msg["text"] = result.text_response

            # Data table
            if result.df is not None and not result.df.empty:
                with st.expander("查詢結果", expanded=False):
                    st.dataframe(result.df, use_container_width=True)
                assistant_msg["df"] = result.df

            # Chart
            if result.fig:
                st.plotly_chart(result.fig, use_container_width=True)
                assistant_msg["fig"] = result.fig

            # SQL
            if result.sql:
                with st.expander("SQL", expanded=False):
                    st.code(result.sql, language="sql")
                assistant_msg["sql"] = result.sql

            # Chart code
            if result.chart_code:
                with st.expander("繪圖程式碼", expanded=False):
                    st.code(result.chart_code, language="python")
                assistant_msg["chart_code"] = result.chart_code

            # Save as template
            if result.sql and result.chart_code:
                with st.expander("儲存為視覺化範本"):
                    tpl_name = st.text_input(
                        "範本名稱", key=f"tpl_name_{len(st.session_state.messages)}"
                    )
                    tpl_chart_type = st.selectbox(
                        "圖表類型",
                        ["長條圖", "折線圖", "K線圖", "圓餅圖", "散佈圖",
                         "熱力圖", "面積圖", "瀑布圖", "樹狀圖", "雷達圖", "其他"],
                        key=f"tpl_type_{len(st.session_state.messages)}",
                    )
                    tpl_style = st.text_input(
                        "風格描述（如：紅綠配色、排名由高到低、深色主題）",
                        key=f"tpl_style_{len(st.session_state.messages)}",
                    )
                    if st.button("儲存範本", key=f"tpl_save_{len(st.session_state.messages)}"):
                        if tpl_name and tpl_style:
                            save_template(
                                name=tpl_name,
                                chart_type=tpl_chart_type,
                                style_description=tpl_style,
                                sample_chart_code=result.chart_code,
                                sample_sql=result.sql,
                                sample_question=user_input,
                            )
                            st.success(f"✅ 已儲存範本：{tpl_name}")
                        else:
                            st.warning("請填入範本名稱和風格描述")

        st.session_state.messages.append(assistant_msg)
