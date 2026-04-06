# AI Data Chat -- 技術架構文件

> Product Requirements Document + Technical Architecture
> PM: Adam | Date: 2026-04-06 | Version: 1.0

---

## 1. 產品定位

**AI 對話式儀表板建構工具** -- 用自然語言查詢資料庫，AI 自動產出可互動面板，組成 Dashboard。

目標：從 Streamlit 原型轉為前後端分離的正式產品，支援多專案、多面板、即時對話生成圖表。

---

## 2. 三欄佈局規格

```
+------------+---------------------------+--------------+
|            |                           |              |
|  Projects  |       Dashboard           |   AI Chat    |
|  (~200px)  |    (auto-fill grid)       |   (~350px)   |
|            |                           |              |
|  - 專案列表 |  - Grid 排列面板          |  - 對話輸入   |
|  - 新增專案 |  - 拖拽排序/調整大小       |  - 歷史訊息   |
|  - DB 連線  |  - 每面板一個互動圖表      |  - 範本選擇   |
|            |                           |              |
+------------+---------------------------+--------------+
```

---

## 3. 檔案結構

```
ai-data-chat/
├── frontend/                          # Next.js 14 (App Router)
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── .env.local                     # NEXT_PUBLIC_API_URL=http://localhost:8000
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── app/
│       │   ├── layout.tsx             # 全域 layout (dark theme, fonts)
│       │   ├── page.tsx               # 主頁: 三欄佈局入口
│       │   └── globals.css            # Tailwind base + custom scrollbar/theme
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx        # 三欄容器 (左/中/右)
│       │   │   ├── Sidebar.tsx         # 左側專案列表
│       │   │   └── ChatPanel.tsx       # 右側 AI 對話區
│       │   ├── project/
│       │   │   ├── ProjectList.tsx     # 專案列表 + 搜尋
│       │   │   ├── ProjectCard.tsx     # 單一專案項目
│       │   │   └── ProjectCreateModal.tsx  # 新增專案 modal (含 DB 連線表單)
│       │   ├── dashboard/
│       │   │   ├── DashboardGrid.tsx   # 面板 Grid (react-grid-layout)
│       │   │   ├── PanelCard.tsx       # 單一面板卡片 (含 Plotly 圖表)
│       │   │   ├── PanelToolbar.tsx    # 面板操作列 (刪除/展開/匯出)
│       │   │   └── EmptyState.tsx      # 空狀態提示
│       │   ├── chat/
│       │   │   ├── ChatMessages.tsx    # 對話訊息列表
│       │   │   ├── ChatInput.tsx       # 輸入框 (pill style)
│       │   │   ├── ChatBubble.tsx      # 單一對話泡泡
│       │   │   ├── TemplateSelector.tsx # 範本下拉選擇
│       │   │   └── AnalysisDetail.tsx  # 展開看 SQL / chart code
│       │   ├── chart/
│       │   │   └── PlotlyChart.tsx     # Plotly.js React wrapper
│       │   └── ui/
│       │       ├── Button.tsx          # 通用按鈕
│       │       ├── Modal.tsx           # 通用 Modal
│       │       ├── Input.tsx           # 通用輸入框
│       │       ├── Spinner.tsx         # Loading spinner
│       │       └── Toast.tsx           # 通知 toast
│       ├── hooks/
│       │   ├── useProjects.ts          # 專案 CRUD hooks
│       │   ├── usePanels.ts           # 面板 CRUD hooks
│       │   ├── useChat.ts             # 對話 + AI 分析 hooks
│       │   └── useTemplates.ts        # 範本管理 hooks
│       ├── lib/
│       │   ├── api.ts                 # API client (fetch wrapper)
│       │   └── types.ts              # TypeScript 型別定義
│       └── stores/
│           └── appStore.ts            # Zustand: 當前專案/面板/對話狀態
│
├── backend/                           # FastAPI
│   ├── pyproject.toml                 # Poetry / pip 依賴
│   ├── .env                           # 環境變數
│   ├── main.py                        # FastAPI app entry + CORS
│   ├── config.py                      # 設定 (從 .env 讀取)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py                # SQLite engine + session
│   │   ├── schemas.py                 # SQLAlchemy ORM models
│   │   └── pydantic_models.py         # Pydantic request/response schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── projects.py                # /api/projects/*
│   │   ├── panels.py                  # /api/projects/{id}/panels/*
│   │   ├── chat.py                    # /api/projects/{id}/chat
│   │   ├── connections.py             # /api/connections/* (DB 連線測試)
│   │   └── templates.py               # /api/templates/*
│   ├── core/                          # === 從原型遷移的核心邏輯 ===
│   │   ├── __init__.py
│   │   ├── db.py                      # 多 DB 連線管理 (原 core/db.py 改造)
│   │   ├── llm.py                     # Azure OpenAI 呼叫 (原封不動)
│   │   ├── sql_executor.py            # SQL 驗證+執行 (原封不動)
│   │   ├── chart_generator.py         # Plotly 沙箱執行 (原封不動)
│   │   └── orchestrator.py            # 主流程控制 (改為接收 conn_params)
│   ├── prompts/
│   │   └── few_shots.json             # 原封搬移
│   └── templates/
│       ├── manager.py                 # 範本 CRUD (原封不動)
│       └── saved/                     # 使用者儲存的範本
│
└── docs/
    └── ARCHITECTURE.md                # 本文件
```

---

## 4. 資料模型

### 4.1 SQLite Metadata (backend/models/schemas.py)

```python
# Project -- 一個專案綁定一個 DB 連線
class Project(Base):
    __tablename__ = "projects"
    id          = Column(String, primary_key=True, default=uuid4)
    name        = Column(String, nullable=False)
    description = Column(String, default="")
    db_type     = Column(String, default="postgresql")  # postgresql | mysql | mssql
    db_host     = Column(String, nullable=False)
    db_port     = Column(Integer, nullable=False)
    db_user     = Column(String, nullable=False)
    db_password = Column(String, nullable=False)         # 加密儲存
    db_name     = Column(String, nullable=False)
    db_schemas  = Column(JSON, default=["public"])       # 要暴露給 AI 的 schemas
    created_at  = Column(DateTime, default=utcnow)
    updated_at  = Column(DateTime, default=utcnow, onupdate=utcnow)
    # relationships
    panels      = relationship("Panel", back_populates="project", cascade="all,delete")
    conversations = relationship("Conversation", back_populates="project", cascade="all,delete")


# Panel -- 儀表板上的一個面板 (一個圖表)
class Panel(Base):
    __tablename__ = "panels"
    id          = Column(String, primary_key=True, default=uuid4)
    project_id  = Column(String, ForeignKey("projects.id"), nullable=False)
    title       = Column(String, nullable=False)
    explanation = Column(String, default="")
    sql         = Column(Text, nullable=False)
    chart_code  = Column(Text, nullable=False)
    chart_type  = Column(String, default="")             # bar, line, pie, etc.
    layout_x    = Column(Integer, default=0)             # grid position
    layout_y    = Column(Integer, default=0)
    layout_w    = Column(Integer, default=6)             # grid width (out of 12)
    layout_h    = Column(Integer, default=4)             # grid height
    sort_order  = Column(Integer, default=0)
    created_at  = Column(DateTime, default=utcnow)
    updated_at  = Column(DateTime, default=utcnow, onupdate=utcnow)
    # relationships
    project     = relationship("Project", back_populates="panels")


# Conversation -- 對話紀錄 (per project)
class Conversation(Base):
    __tablename__ = "conversations"
    id          = Column(String, primary_key=True, default=uuid4)
    project_id  = Column(String, ForeignKey("projects.id"), nullable=False)
    role        = Column(String, nullable=False)         # user | assistant
    content     = Column(Text, nullable=False)           # 文字內容
    sql         = Column(Text, default="")               # AI 產生的 SQL
    chart_code  = Column(Text, default="")               # AI 產生的 chart code
    panel_id    = Column(String, default="")             # 若已存為面板，關聯 panel id
    created_at  = Column(DateTime, default=utcnow)
    # relationships
    project     = relationship("Project", back_populates="conversations")


# Template -- 視覺化範本
class Template(Base):
    __tablename__ = "templates"
    id               = Column(String, primary_key=True, default=uuid4)
    name             = Column(String, nullable=False, unique=True)
    chart_type       = Column(String, nullable=False)
    style_description = Column(String, nullable=False)
    sample_chart_code = Column(Text, nullable=False)
    sample_sql       = Column(Text, default="")
    sample_question  = Column(String, default="")
    is_builtin       = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=utcnow)
```

### 4.2 ER Diagram

```
Project 1──N Panel
Project 1──N Conversation
Template (standalone)
```

---

## 5. API 端點設計

Base URL: `http://localhost:8000/api`

### 5.1 Projects

| Method | Path | 說明 |
|--------|------|------|
| GET    | `/projects` | 取得所有專案列表 |
| POST   | `/projects` | 建立新專案 (含 DB 連線資訊) |
| GET    | `/projects/{id}` | 取得單一專案詳情 |
| PUT    | `/projects/{id}` | 更新專案 |
| DELETE | `/projects/{id}` | 刪除專案 (cascade 面板+對話) |

### 5.2 DB Connections

| Method | Path | 說明 |
|--------|------|------|
| POST   | `/connections/test` | 測試 DB 連線是否成功 |
| GET    | `/projects/{id}/schema` | 取得該專案 DB 的 schema 資訊 |

### 5.3 Panels

| Method | Path | 說明 |
|--------|------|------|
| GET    | `/projects/{id}/panels` | 取得該專案所有面板 |
| POST   | `/projects/{id}/panels` | 新增面板 (從對話結果存檔) |
| PUT    | `/projects/{id}/panels/{panel_id}` | 更新面板 (標題/排列/大小) |
| DELETE | `/projects/{id}/panels/{panel_id}` | 刪除面板 |
| PUT    | `/projects/{id}/panels/layout` | 批次更新面板排列 (拖拽後) |
| GET    | `/projects/{id}/panels/{panel_id}/data` | 重新執行 SQL 取得最新資料 |

### 5.4 Chat (AI Analysis)

| Method | Path | 說明 |
|--------|------|------|
| POST   | `/projects/{id}/chat` | 送出對話，AI 回傳分析結果 |
| GET    | `/projects/{id}/conversations` | 取得該專案的對話歷史 |
| DELETE | `/projects/{id}/conversations` | 清除該專案的對話歷史 |

**POST `/projects/{id}/chat` Request:**
```json
{
  "message": "顯示近30天外資買超前10名",
  "template_id": "optional-template-id"
}
```

**POST `/projects/{id}/chat` Response:**
```json
{
  "explanation": "這是外資近30天買超前10名的排名圖...",
  "sql": "SELECT ... FROM ...",
  "chart_code": "fig = px.bar(...)",
  "chart_config": {
    "data": [...],
    "layout": {...}
  },
  "text_response": "",
  "error": null
}
```

> `chart_config` 是後端執行 chart_code 後，將 Plotly Figure 序列化為 JSON（`fig.to_json()`），前端直接用 Plotly.js `Plotly.react(div, data, layout)` 渲染，不需要在前端執行 Python。

### 5.5 Templates

| Method | Path | 說明 |
|--------|------|------|
| GET    | `/templates` | 取得所有範本 (含 builtin) |
| POST   | `/templates` | 新增範本 |
| DELETE | `/templates/{id}` | 刪除範本 |

---

## 6. 核心流程

### 6.1 對話生成面板流程

```
User Input
    │
    ▼
Frontend: POST /api/projects/{id}/chat
    │
    ▼
Backend: routers/chat.py
    ├── 1. 讀取 project DB 連線參數
    ├── 2. get_schema_info(conn_params)    ← core/db.py (多 DB 版)
    ├── 3. ask_llm(message, schema, history, template)  ← core/llm.py
    ├── 4. safe_execute(sql, conn_params)  ← core/sql_executor.py
    ├── 5. execute_chart_code(chart_code, df)  ← core/chart_generator.py
    ├── 6. fig.to_json() → chart_config
    ├── 7. 存 Conversation 紀錄
    └── 8. 回傳 JSON response
    │
    ▼
Frontend: 收到 response
    ├── ChatMessages 顯示對話泡泡
    ├── PlotlyChart 用 chart_config 渲染圖表
    └── 用戶可點「釘選到儀表板」→ POST /panels
```

### 6.2 面板資料刷新流程

```
用戶開啟專案 / 按刷新
    │
    ▼
Frontend: GET /api/projects/{id}/panels
    │
    ▼
For each panel:
    GET /api/projects/{id}/panels/{panel_id}/data
    │
    ▼
Backend: 用面板存的 SQL + chart_code 重新執行
    └── 回傳最新 chart_config
```

---

## 7. 前端元件層級

```
App (layout.tsx)
└── AppShell
    ├── Sidebar (左側 200px)
    │   ├── Logo + Search
    │   ├── ProjectList
    │   │   └── ProjectCard (active state)
    │   └── ProjectCreateModal (trigger: + button)
    │       └── DB Connection Form
    │
    ├── DashboardGrid (中間 auto)
    │   ├── EmptyState (無面板時)
    │   └── PanelCard[] (react-grid-layout)
    │       ├── PanelToolbar (pin/delete/expand/refresh)
    │       └── PlotlyChart
    │
    └── ChatPanel (右側 350px)
        ├── TemplateSelector
        ├── ChatMessages
        │   └── ChatBubble[]
        │       └── AnalysisDetail (展開 SQL/Code)
        ├── ChatInput
        └── "Pin to Dashboard" action button
```

---

## 8. 狀態管理 (Zustand)

```typescript
// stores/appStore.ts
interface AppState {
  // 專案
  projects: Project[]
  activeProjectId: string | null
  
  // 面板
  panels: Panel[]
  panelLayouts: Layout[]       // react-grid-layout 格式
  
  // 對話
  messages: ChatMessage[]
  isAnalyzing: boolean
  
  // 範本
  templates: Template[]
  activeTemplateId: string | null
  
  // Actions
  setActiveProject: (id: string) => void
  addPanel: (panel: Panel) => void
  removePanel: (id: string) => void
  updatePanelLayout: (layouts: Layout[]) => void
  sendMessage: (msg: string) => Promise<void>
  pinToBoard: (messageIndex: number) => void
}
```

---

## 9. 前端關鍵套件

| 套件 | 用途 |
|------|------|
| `next` 14.x | App Router, SSR |
| `tailwindcss` 4.x | 樣式 |
| `plotly.js` + `react-plotly.js` | 互動圖表 |
| `react-grid-layout` | 拖拽/調整面板大小 |
| `zustand` | 輕量狀態管理 |
| `lucide-react` | Icon |
| `sonner` | Toast 通知 |

---

## 10. 後端關鍵套件

| 套件 | 用途 |
|------|------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` | ORM (SQLite metadata) |
| `psycopg2-binary` | PostgreSQL 連線 |
| `openai` | Azure OpenAI SDK |
| `plotly` | 後端執行圖表程式碼 |
| `pandas` | 資料處理 |
| `python-dotenv` | 環境變數 |
| `cryptography` | DB 密碼加密 |

---

## 11. core/ 模組遷移策略

### 原封不動搬移 (改動最小)

| 模組 | 改動 | 說明 |
|------|------|------|
| `llm.py` | 無改動 | Azure OpenAI 呼叫邏輯不變 |
| `sql_executor.py` | 無改動 | SQL 驗證邏輯不變 |
| `chart_generator.py` | 無改動 | Plotly 沙箱執行不變 |
| `templates/manager.py` | 小改動 | 改為 SQLite 儲存（取代 JSON 檔案） |

### 需要改造的模組

| 模組 | 改動 | 說明 |
|------|------|------|
| `db.py` | **重構** | 從單一 DB 連線改為「接收 conn_params 參數的多 DB 連線管理器」。每個專案有自己的連線參數。加入連線池。 |
| `orchestrator.py` | **改造** | `run_analysis()` 改為接收 `conn_params` 參數而非讀全域設定。回傳結果增加 `fig.to_json()` 序列化。 |
| `config.py` | **拆分** | 全域 DB 設定移除，改為 per-project。保留 Azure OpenAI、SQL 安全等全域設定。 |

### 改造範例: db.py

```python
# backend/core/db.py -- 多 DB 連線版
import psycopg2
import pandas as pd
from contextlib import contextmanager

@contextmanager
def get_connection(conn_params: dict):
    """動態建立 DB 連線，支援多專案。"""
    conn = psycopg2.connect(
        host=conn_params["host"],
        port=conn_params["port"],
        user=conn_params["user"],
        password=conn_params["password"],
        dbname=conn_params["dbname"],
    )
    try:
        yield conn
    finally:
        conn.close()

def get_schema_info(conn_params: dict, schemas: list[str]) -> str:
    """同原邏輯，改為接收 conn_params。"""
    with get_connection(conn_params) as conn:
        # ... 原有邏輯不變，只是 conn 來源不同
        pass

def execute_query(sql: str, conn_params: dict, timeout_seconds: int = 10) -> pd.DataFrame:
    """同原邏輯，改為接收 conn_params。"""
    with get_connection(conn_params) as conn:
        conn.set_session(readonly=True)
        cur = conn.cursor()
        cur.execute(f"SET statement_timeout = '{timeout_seconds}s'")
        cur.execute(sql)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        return pd.DataFrame(rows, columns=columns)
```

### 改造範例: orchestrator.py

```python
# backend/core/orchestrator.py -- 回傳 chart_config JSON
def run_analysis(user_message, conn_params, schemas, ...) -> AnalysisResult:
    schema_info = get_schema_info(conn_params, schemas)
    # ... 原有流程
    if result.fig:
        result.chart_config = json.loads(result.fig.to_json())
    return result
```

---

## 12. 遷移步驟 (Sprint 規劃)

### Sprint 1: 基礎骨架 (3 天)

- [ ] 建立 `frontend/` Next.js 專案 + Tailwind dark theme
- [ ] 建立 `backend/` FastAPI 專案 + SQLite + models
- [ ] 三欄 AppShell 佈局 (靜態)
- [ ] CORS 設定、前後端連通

### Sprint 2: 專案管理 (2 天)

- [ ] Project CRUD API
- [ ] DB 連線測試 API
- [ ] 前端：ProjectList、ProjectCreateModal
- [ ] 專案切換 → 載入面板

### Sprint 3: AI 對話核心 (3 天)

- [ ] 搬移 core/ 模組到 backend，改造 db.py
- [ ] POST /chat API (完整 pipeline)
- [ ] 前端：ChatPanel、ChatInput、ChatBubble
- [ ] 圖表渲染 (PlotlyChart 接 chart_config)

### Sprint 4: 儀表板面板 (2 天)

- [ ] Panel CRUD API
- [ ] 「釘選到儀表板」功能
- [ ] react-grid-layout 拖拽/調整大小
- [ ] 面板資料刷新

### Sprint 5: 範本 + 打磨 (2 天)

- [ ] Template API + Builtin 範本
- [ ] TemplateSelector 元件
- [ ] 空狀態、Loading、Error 處理
- [ ] 動畫、過渡效果、RWD 微調

**預估總工時: 12 天 (含 buffer)**

---

## 13. UI 設計規範 (ChatGPT 風格)

### 色彩

| Token | 色值 | 用途 |
|-------|------|------|
| `--bg-primary` | `#212121` | 主背景 |
| `--bg-sidebar` | `#171717` | 左側邊欄 |
| `--bg-chat` | `#212121` | 右側對話區 |
| `--bg-surface` | `#2f2f2f` | 卡片/輸入框背景 |
| `--border` | `#2e2e2e` | 邊框 |
| `--text-primary` | `#ececec` | 主要文字 |
| `--text-secondary` | `#999999` | 次要文字 |
| `--text-muted` | `#666666` | 淡化文字 |
| `--accent` | `#10a37f` | 強調色 (ChatGPT green) |
| `--accent-hover` | `#1a7f64` | 強調色 hover |
| `--danger` | `#ef4444` | 錯誤/刪除 |

### 字型

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
/* monospace */
font-family: 'Söhne Mono', 'JetBrains Mono', 'Fira Code', monospace;
```

### 圓角

- 按鈕/卡片: `8px`
- 對話泡泡: `18px`
- 輸入框 (pill): `24px`
- 面板: `12px`

### 動畫

- 對話泡泡: `fade-in + slide-up 200ms`
- 面板新增: `scale-in 300ms`
- 側邊欄: `width transition 200ms`

---

## 14. 安全考量

1. **DB 密碼加密**: 使用 `cryptography.Fernet` 加密儲存，runtime 解密
2. **SQL 注入防護**: 沿用現有 `sql_executor.py` 的 validate_sql
3. **CORS**: 限定前端 origin
4. **Read-only**: 所有使用者 DB 查詢強制 `readonly=True`
5. **Timeout**: SQL 執行 10s timeout
6. **Input sanitization**: 沿用 `utils/safety.py`
7. **Chart sandbox**: 沿用 `chart_generator.py` 的受限 namespace

---

## 15. 未來擴充

- MySQL / MSSQL 連線支援 (db.py 加 driver factory)
- WebSocket 串流回覆 (取代 polling)
- 使用者認證 (NextAuth.js)
- 匯出 Dashboard 為 PDF/PNG
- 排程刷新面板資料
- 公開分享 Dashboard (唯讀連結)
