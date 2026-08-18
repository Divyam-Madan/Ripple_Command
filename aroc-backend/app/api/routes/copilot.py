from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.domain.schemas import CopilotMessageRequest, CopilotResponse
from app.ai.fallback import fallback_response

router = APIRouter()

@router.post("/chat", response_model=CopilotResponse)
async def chat(request: CopilotMessageRequest, db: AsyncSession = Depends(get_db)):
    last_message = request.messages[-1].get("content", "")
    return await fallback_response(last_message, db)
