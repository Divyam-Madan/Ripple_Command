from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_db
from app.services import simulation_service

router = APIRouter()


@router.get("/scenarios")
def list_scenarios(session: Session = Depends(get_db)):
    rows = session.query(m.Scenario).all()
    return {"items": [
        {"id": s.id, "name": s.name, "description": s.description, "disruption_type": s.disruption_type,
         "target_type": s.target_type, "target_id": s.target_id, "delay_hours": s.delay_hours,
         "is_flagship": s.is_flagship}
        for s in rows
    ]}


@router.post("/scenarios/{scenario_id}/run")
def run_scenario(scenario_id: str, session: Session = Depends(get_db)):
    scenario = session.get(m.Scenario, scenario_id)
    if not scenario:
        raise HTTPException(404, "Not found")
    if not scenario.target_type or not scenario.target_id:
        raise HTTPException(400, "This scenario has no simulatable target (e.g. 'Normal Operations')")
    result = simulation_service.simulate_and_persist(
        session, scenario.disruption_type, scenario.target_type, scenario.target_id, scenario.delay_hours,
    )
    session.commit()
    return result
