from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.schemas import CompareRequest, OptimizeRequest
from app.services import optimization_service
from app.websocket.publishers import publish_event

router = APIRouter()


@router.post("/optimization/recover")
async def optimize_recovery(payload: OptimizeRequest, session: Session = Depends(get_db)):
    result = optimization_service.optimize_and_persist(session, payload.simulation_run_id)
    if result is None:
        raise HTTPException(400, "No recovery requirement for this simulation run (no shortage projected, or unknown run id)")
    session.commit()
    await publish_event("recommendation.updated", {"simulation_run_id": payload.simulation_run_id})
    return result


@router.get("/optimization/{simulation_run_id}")
def get_recovery_options(simulation_run_id: str, session: Session = Depends(get_db)):
    result = optimization_service.get_recovery_options(session, simulation_run_id)
    if result is None:
        raise HTTPException(404, "Not found")
    return result


@router.post("/optimization/compare")
def compare_options(payload: CompareRequest, session: Session = Depends(get_db)):
    result = optimization_service.get_recovery_options(session, payload.simulation_run_id)
    if result is None:
        raise HTTPException(404, "Not found")
    result["options"] = [o for o in result["options"] if o["type"] in payload.option_types]
    return result
