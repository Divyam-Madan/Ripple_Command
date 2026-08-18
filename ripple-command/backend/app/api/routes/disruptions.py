from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_db

router = APIRouter()


@router.get("/disruptions")
def list_disruptions(session: Session = Depends(get_db)):
    rows = session.query(m.Disruption).order_by(m.Disruption.created_at.desc()).limit(50).all()
    return {"items": [
        {"id": d.id, "type": d.type, "target_type": d.target_type, "target_id": d.target_id,
         "delay_hours": d.delay_hours, "severity": d.severity, "status": d.status,
         "created_at": d.created_at.isoformat()}
        for d in rows
    ]}


@router.get("/alerts")
def list_alerts(session: Session = Depends(get_db)):
    rows = session.query(m.Alert).order_by(m.Alert.created_at.desc()).limit(50).all()
    return {"items": [
        {"id": a.id, "severity": a.severity, "source_type": a.source_type, "source_id": a.source_id,
         "message": a.message, "impact_summary": a.impact_summary,
         "recommended_action": a.recommended_action, "simulation_run_id": a.simulation_run_id,
         "created_at": a.created_at.isoformat()}
        for a in rows
    ]}
