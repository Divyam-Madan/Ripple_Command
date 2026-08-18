"""
Centralized configuration. All environment access happens here, nowhere else.

Design decision: in DEMO_MODE (default true) the app never fails to start just
because an external service (Postgres, OpenRouter, MapTiler) is unconfigured.
It transparently falls back to a local SQLite file and deterministic mock
behavior, per the product's mock-mode requirement.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "_runtime"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    demo_mode: bool = True
    mock_external_apis: bool = True

    database_url: str = ""

    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-sonnet"

    maptiler_api_key: str = ""

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        # Local SQLite fallback, kept behind the same repository/session
        # abstraction as Postgres so swapping providers touches no callers.
        sqlite_path = DATA_DIR / "aroc.db"
        return f"sqlite:///{sqlite_path}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openrouter_api_key) and not self.mock_external_apis

    @property
    def using_sqlite_fallback(self) -> bool:
        return not self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
