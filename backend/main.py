"""
FastAPI application entry point.
Run with: uvicorn main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db, get_db
from builtin_templates import seed_builtin_templates
from routers import projects, panels, chat, templates

logger = logging.getLogger("ai-data-chat")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Startup: init DB + seed templates
    logger.info("Initializing metadata database...")
    init_db()
    with get_db() as conn:
        seed_builtin_templates(conn)
    logger.info("Backend ready.")
    yield
    # Shutdown
    logger.info("Shutting down.")


app = FastAPI(
    title="AI Data Chat API",
    description="Natural language to SQL + Plotly chart backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global error handler ──────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "伺服器內部錯誤",
            "details": str(exc),
        },
    )


# ─── Register routers ──────────────────────────────────────

app.include_router(projects.router)
app.include_router(panels.router)
app.include_router(chat.router)
app.include_router(templates.router)


# ─── Health check ───────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ai-data-chat-backend"}
