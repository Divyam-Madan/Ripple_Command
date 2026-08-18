from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "app_env": settings.app_env,
        "demo_mode": settings.demo_mode,
        "using_sqlite_fallback": settings.using_sqlite_fallback,
        "ai_enabled": settings.ai_enabled,
    }
