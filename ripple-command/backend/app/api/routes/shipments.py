from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_db
from app.domain.schemas import ShipmentCreate

router = APIRouter()


def _serialize_shipment(s: m.Shipment) -> dict:
    return {
        "id": s.id, "order_id": s.order_id, "product_id": s.product_id, "route_id": s.route_id,
        "source_type": s.source_type, "source_id": s.source_id, "dest_type": s.dest_type,
        "dest_id": s.dest_id, "quantity": s.quantity, "transport_mode": s.transport_mode,
        "carrier": s.carrier, "status": s.status, "delay_probability": s.delay_probability,
        "priority": s.priority, "current_location": s.current_location,
        "planned_dispatch": s.planned_dispatch.isoformat(),
        "promised_delivery": s.promised_delivery.isoformat(),
        "planned_eta": s.planned_eta.isoformat(), "predicted_eta": s.predicted_eta.isoformat(),
    }


@router.get("/shipments")
def list_shipments(
    status: str | None = None, source_type: str | None = None, dest_type: str | None = None,
    min_delay_probability: float | None = None, limit: int = Query(100, le=500),
    session: Session = Depends(get_db),
):
    q = session.query(m.Shipment)
    if status:
        q = q.filter(m.Shipment.status == status)
    if source_type:
        q = q.filter(m.Shipment.source_type == source_type)
    if dest_type:
        q = q.filter(m.Shipment.dest_type == dest_type)
    if min_delay_probability is not None:
        q = q.filter(m.Shipment.delay_probability >= min_delay_probability)
    rows = q.order_by(m.Shipment.predicted_eta.asc()).limit(limit).all()
    return {"items": [_serialize_shipment(s) for s in rows]}


@router.get("/shipments/{shipment_id}")
def get_shipment(shipment_id: str, session: Session = Depends(get_db)):
    s = session.get(m.Shipment, shipment_id)
    if not s:
        raise HTTPException(404, "Not found")
    events = (
        session.query(m.ShipmentEvent)
        .filter(m.ShipmentEvent.shipment_id == shipment_id)
        .order_by(m.ShipmentEvent.timestamp)
        .all()
    )
    out = _serialize_shipment(s)
    out["events"] = [
        {"id": e.id, "event_type": e.event_type, "timestamp": e.timestamp.isoformat(), "description": e.description}
        for e in events
    ]
    return out


@router.post("/shipments", status_code=201)
def create_shipment(payload: ShipmentCreate, session: Session = Depends(get_db)):
    import datetime as dt
    route = session.get(m.Route, payload.route_id)
    if not route:
        raise HTTPException(400, "Unknown route_id")
    now = dt.datetime.now(dt.timezone.utc)
    dispatch = payload.planned_dispatch or now
    eta = dispatch + dt.timedelta(hours=route.transit_time_hours)
    obj = m.Shipment(
        order_id=f"ORD-{int(now.timestamp())}", product_id=payload.product_id, route_id=payload.route_id,
        source_type=payload.source_type, source_id=payload.source_id, dest_type=payload.dest_type,
        dest_id=payload.dest_id, quantity=payload.quantity, transport_mode=payload.transport_mode,
        carrier=payload.carrier, priority=payload.priority, planned_dispatch=dispatch,
        promised_delivery=payload.promised_delivery or eta, planned_eta=eta, predicted_eta=eta,
        status="planned", delay_probability=route.delay_probability, current_location=payload.source_type,
    )
    session.add(obj)
    session.flush()
    session.add(m.ShipmentEvent(shipment_id=obj.id, event_type="created", description="Shipment created"))
    session.commit()
    return _serialize_shipment(obj)
