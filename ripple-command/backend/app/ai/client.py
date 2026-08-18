"""
Real AI path via OpenRouter. Only reached when settings.ai_enabled is true
(a real OPENROUTER_API_KEY is configured and MOCK_EXTERNAL_APIS is false).
The key never leaves the backend process.
"""
from __future__ import annotations

import json
import logging

import httpx
from sqlalchemy.orm import Session

from app.ai.prompts import SYSTEM_PROMPT
from app.ai.tools import TOOL_SCHEMAS, call_tool
from app.config import get_settings

logger = logging.getLogger("aroc.ai")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MAX_TOOL_ROUNDS = 4


def ask_copilot(session: Session, message: str, history: list[dict] | None = None) -> dict:
    settings = get_settings()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": message})

    tool_calls_made: list[str] = []
    last_simulation_run_id = None

    with httpx.Client(timeout=30.0) as client:
        for _ in range(MAX_TOOL_ROUNDS):
            response = client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": messages,
                    "tools": TOOL_SCHEMAS,
                },
            )
            response.raise_for_status()
            data = response.json()
            choice = data["choices"][0]["message"]
            messages.append(choice)

            calls = choice.get("tool_calls") or []
            if not calls:
                return {
                    "reply": choice.get("content", ""),
                    "tool_calls": tool_calls_made,
                    "source": "openrouter",
                    "simulation_run_id": last_simulation_run_id,
                }

            for call in calls:
                fn_name = call["function"]["name"]
                try:
                    fn_args = json.loads(call["function"].get("arguments") or "{}")
                except json.JSONDecodeError:
                    fn_args = {}
                result = call_tool(session, fn_name, fn_args)
                if isinstance(result, dict) and result.get("simulation_run_id"):
                    last_simulation_run_id = result["simulation_run_id"]
                tool_calls_made.append(fn_name)
                messages.append({
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "content": json.dumps(result),
                })
            session.commit()

    return {
        "reply": "I ran out of tool-call budget before finishing this request - try narrowing the question.",
        "tool_calls": tool_calls_made, "source": "openrouter", "simulation_run_id": last_simulation_run_id,
    }
