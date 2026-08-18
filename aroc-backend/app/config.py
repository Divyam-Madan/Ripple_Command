from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./aroc_demo.db"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "anthropic/claude-3.5-haiku"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    APP_ENV: str = "development"
    DEMO_MODE: bool = True
    
    model_config = {"env_file": ".env"}

settings = Settings()
