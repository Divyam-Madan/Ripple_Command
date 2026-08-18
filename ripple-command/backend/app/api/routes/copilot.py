from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.schemas import CopilotQuery
from app.services.copilot_service import handle_message

router = APIRouter()


@router.post("/copilot/query")
def copilot_query(payload: CopilotQuery, session: Session = Depends(get_db)):
    result = handle_message(session, payload.message)
    session.commit()
    return result
