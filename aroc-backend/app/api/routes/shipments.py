from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional
from app.db.session import get_db
from app.db.models import Shipment, ShipmentEvent

router = APIRouter()

@router.get("")
async def list_shipments(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    origin_type: Optional[str] = None,
    destination_type: Optional[str] = None,
    supplier_id: Optional[int] = None,
    factory_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    q = select(Shipment)
    if status:
        q = q.where(Shipment.status == status)
    if risk_level:
        q = q.where(Shipment.risk_level == risk_level)
    if origin_type:
        q = q.where(Shipment.origin_type == origin_type)
    if destination_type:
        q = q.where(Shipment.destination_type == destination_type)
    if supplier_id:
        q = q.where(Shipment.origin_type == "supplier", Shipment.origin_id == supplier_id)
    if factory_id:
        filters = or_(
            (Shipment.origin_type == "factory") & (Shipment.origin_id == factory_id),
            (Shipment.destination_type == "factory") & (Shipment.destination_id == factory_id),
        )
        q = q.where(filters)
    if search:
        q = q.where(Shipment.shipment_code.ilike(f"%{search}%"))
    q = q.order_by(Shipment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_ship(s) for s in result.scalars().all()]

@router.get("/{shipment_id}")
async def get_shipment(shipment_id: int, db: AsyncSession = Depends(get_db)):
    s = await db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    ev_q = await db.execute(
        select(ShipmentEvent).where(ShipmentEvent.shipment_id == shipment_id).order_by(ShipmentEvent.timestamp)
    )
    events = ev_q.scalars().all()
    data = _ship(s)
    data["events"] = [{"id": e.id, "event_type": e.event_type, "description": e.description,
                       "location_name": e.location_name, "timestamp": e.timestamp.isoformat() if e.timestamp else None}
                      for e in events]
    return data

@router.post("")
async def create_shipment(payload: dict, db: AsyncSession = Depends(get_db)):
    s = Shipment(**payload)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    # broadcast WS
    from app.events.manager import manager
    await manager.broadcast("SHIPMENT_STATUS_CHANGE", {"shipment_id": s.id, "status": s.status, "code": s.shipment_code})
    return _ship(s)

@router.post("/{shipment_id}/events")
async def add_shipment_event(shipment_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    s = await db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    ev = ShipmentEvent(shipment_id=shipment_id, **payload)
    db.add(ev)
    # Update shipment status if provided
    if "status" in payload:
        s.status = payload["status"]
    await db.commit()
    from app.events.manager import manager
    await manager.broadcast("SHIPMENT_STATUS_CHANGE", {"shipment_id": shipment_id, "event": payload.get("event_type")})
    return {"success": True}

def _ship(s: Shipment) -> dict:
    return {
        "id": s.id,
        "shipment_code": s.shipment_code,
        "product_id": s.product_id,
        "quantity": s.quantity,
        "origin_type": s.origin_type,
        "origin_id": s.origin_id,
        "destination_type": s.destination_type,
        "destination_id": s.destination_id,
        "carrier": s.carrier,
        "transport_mode": s.transport_mode,
        "status": s.status,
        "planned_departure": s.planned_departure.isoformat() if s.planned_departure else None,
        "actual_departure": s.actual_departure.isoformat() if s.actual_departure else None,
        "planned_arrival": s.planned_arrival.isoformat() if s.planned_arrival else None,
        "predicted_arrival": s.predicted_arrival.isoformat() if s.predicted_arrival else None,
        "current_location_name": s.current_location_name,
        "current_lat": s.current_lat,
        "current_lng": s.current_lng,
        "delay_hours": s.delay_hours,
        "delay_probability": s.delay_probability,
        "risk_level": s.risk_level,
    }
