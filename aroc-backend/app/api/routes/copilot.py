import json
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.domain.schemas import CopilotMessageRequest, CopilotResponse
from app.ai.client import openrouter_client
from app.ai.tools import TOOLS, execute_tool
from app.ai.prompts import SYSTEM_PROMPT
from app.ai.fallback import fallback_response
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/chat", response_model=CopilotResponse)
async def chat(request: CopilotMessageRequest, db: AsyncSession = Depends(get_db)):
    user_role = getattr(request, "user_role", None) or "supply_chain_manager"
    messages = request.messages or []
    
    if not messages:
        return CopilotResponse(
            role="assistant",
            content="Hello! I am AROC Copilot, your AI supply chain neural intelligence assistant. Ask me anything about network health, disruptions, simulations, or recovery optimization.",
            tool_calls_made=[],
            fallback_mode=False
        )

    last_user_message = messages[-1].get("content", "")

    # Role-specific context enhancement
    role_hints = {
        "supply_chain_manager": "The user is logged in as a SUPPLY CHAIN MANAGER (Sarah Jenkins). Focus on strategic resilience, multi-tier dependencies, financial exposure containment, and supplier reliability.",
        "operations_manager": "The user is logged in as an OPERATIONS MANAGER (Marcus Vance). Focus on operational dispatch, real-time shipment delays, carrier performance, and warehouse stockout thresholds.",
        "analyst": "The user is logged in as a SUPPLY CHAIN ANALYST (Elena Rostova). Focus on mathematical modeling, CP-SAT optimizer comparisons, what-if scenario simulations, and variance statistics.",
    }
    role_instruction = role_hints.get(user_role, "")

    full_system_prompt = f"{SYSTEM_PROMPT}\n\nCURRENT USER PERSONA CONTEXT:\n{role_instruction}"

    # Try OpenRouter if API key is present
    if settings.OPENROUTER_API_KEY and openrouter_client.available:
        try:
            formatted_messages = [{"role": "system", "content": full_system_prompt}]
            for m in messages:
                role = m.get("role", "user")
                if role in ["user", "assistant", "system"]:
                    formatted_messages.append({
                        "role": role,
                        "content": str(m.get("content", ""))
                    })

            tool_calls_executed = []
            
            # Step 1: Initial call with tools
            response = await openrouter_client.chat_completion(
                messages=formatted_messages,
                tools=TOOLS,
                tool_choice="auto"
            )

            choice = response.get("choices", [{}])[0]
            message_obj = choice.get("message", {})

            # Step 2: Handle Tool Calls if requested by model
            if message_obj.get("tool_calls"):
                tool_calls = message_obj["tool_calls"]
                # Append assistant's tool_calls message
                formatted_messages.append(message_obj)

                for tc in tool_calls:
                    fn = tc.get("function", {})
                    fn_name = fn.get("name")
                    fn_args_raw = fn.get("arguments", "{}")
                    try:
                        fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                    except Exception:
                        fn_args = {}

                    tool_calls_executed.append(fn_name)
                    # Execute tool against SQLite DB
                    tool_result_str = await execute_tool(fn_name, fn_args, db)

                    formatted_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", f"call_{fn_name}"),
                        "name": fn_name,
                        "content": tool_result_str
                    })

                # Step 3: Second call to get final synthesized response
                followup_resp = await openrouter_client.chat_completion(
                    messages=formatted_messages
                )
                final_content = followup_resp.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if final_content:
                    return CopilotResponse(
                        role="assistant",
                        content=final_content,
                        tool_calls_made=tool_calls_executed,
                        fallback_mode=False
                    )

            # If no tool calls were made, return direct answer
            content = message_obj.get("content", "")
            if content:
                return CopilotResponse(
                    role="assistant",
                    content=content,
                    tool_calls_made=[],
                    fallback_mode=False
                )

        except Exception as e:
            logger.warning(f"OpenRouter API call failed or timed out: {e}. Switching to internal neural engine.")

    # Fallback to local intelligent rule/simulation engine
    fallback = await fallback_response(last_user_message, db)
    return CopilotResponse(
        role="assistant",
        content=fallback.get("content", ""),
        tool_calls_made=fallback.get("tool_calls_made", []),
        fallback_mode=True
    )
