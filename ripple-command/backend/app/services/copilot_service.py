"""Chooses the real OpenRouter path or the deterministic fallback. The choice
itself is logged onto the response so the frontend can show a small
'fallback mode' indicator rather than pretending it's always live AI."""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.ai import fallback as ai_fallback
from app.config import get_settings

logger = logging.getLogger("aroc.copilot")


def handle_message(session: Session, message: str, history: list[dict] | None = None) -> dict:
    settings = get_settings()
    if settings.ai_enabled:
        try:
            from app.ai.client import ask_copilot
            return ask_copilot(session, message, history)
        except Exception as exc:  # network/auth failure -> degrade gracefully, never break the demo
            logger.warning("OpenRouter call failed, falling back: %s", exc)
            result = ai_fallback.respond(session, message)
            result["source"] = "fallback_after_error"
            return result
    return ai_fallback.respond(session, message)
