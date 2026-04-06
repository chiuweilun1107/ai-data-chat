"""
Application configuration — loads from environment variables.
DB connection info is now per-project (stored in SQLite), not global.
Only Azure OpenAI and app-level settings are here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Azure OpenAI
AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_DEPLOYMENT: str = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
MAX_TOKENS: int = 4096

# SQL Safety
SQL_TIMEOUT_SECONDS: int = 30
MAX_ROWS: int = 10000

# Default schemas to expose to AI
DEFAULT_DB_SCHEMAS: list[str] = ["public", "alice"]

# SQLite metadata database path
SQLITE_DB_PATH: str = str(Path(__file__).parent / "metadata.db")
