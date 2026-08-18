from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Disruption, Scenario

router = APIRouter()

@router.get("")
async def list_disruptions(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(Disruption).order_by(Disruption.started_at.desc()))
    disruptions = q.scalars().all()
    return [_dis(d) for d in disruptions]

@router.get("/{disruption_id}")
async def get_disruption(disruption_id: int, db: AsyncSession = Depends(get_db)):
    d = await db.get(Disruption, disruption_id)
    if not d:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Disruption not found")
    return _dis(d)

@router.post("")
async def create_disruption(payload: dict, db: AsyncSession = Depends(get_db)):
    d = Disruption(**payload)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    from app.events.manager import manager
    await manager.broadcast("DISRUPTION_DETECTED", {"disruption_id": d.id, "title": d.title, "severity": d.severity})
    return _dis(d)

def _dis(d: Disruption) -> dict:
    return {
        "id": d.id,
        "title": d.title,
        "disruption_type": d.disruption_type,
        "severity": d.severity,
        "status": d.status,
        "source_node_type": d.source_node_type,
        "source_node_id": d.source_node_id,
        "description": d.description,
        "started_at": d.started_at.isoformat() if d.started_at else None,
        "estimated_delay_hours": d.estimated_delay_hours,
        "financial_exposure": d.financial_exposure,
    }
