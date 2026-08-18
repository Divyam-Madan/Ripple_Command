from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.domain.schemas import SimulateRequest
from app.services import simulation_service
from app.websocket.publishers import publish_event

router = APIRouter()


@router.post("/simulations")
async def create_simulation(payload: SimulateRequest, session: Session = Depends(get_db)):
    result = simulation_service.simulate_and_persist(
        session, payload.disruption_type, payload.target_type, payload.target_id, payload.delay_hours,
    )
    session.commit()
    await publish_event("simulation.completed", {
        "simulation_run_id": result["simulation_run_id"],
        "severity": result["severity"],
        "total_financial_exposure": result["total_financial_exposure"],
    })
    return result


@router.get("/simulations/{simulation_run_id}")
def get_simulation(simulation_run_id: str, session: Session = Depends(get_db)):
    result = simulation_service.get_simulation(session, simulation_run_id)
    if result is None:
        raise HTTPException(404, "Not found")
    return result
