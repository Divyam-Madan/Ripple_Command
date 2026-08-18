from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models import Shipment, Supplier, Disruption, Alert
from app.engines.health_score import calculate_health_score
from pydantic import BaseModel

router = APIRouter()

class DashboardKPIResponse(BaseModel):
    health_score: float
    active_shipments: int
    at_risk_shipments: int
    critical_suppliers: int
    projected_stockouts: int
    production_at_risk: int
    financial_exposure: float
    active_disruptions: int

class AlertResponse(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    description: str
    source_node_type: str
    source_node_id: int
    created_at: str
    is_read: bool

    class Config:
        from_attributes = True

@router.get("/kpis", response_model=DashboardKPIResponse)
async def get_kpis(db: AsyncSession = Depends(get_db)):
    health_score = await calculate_health_score(db)

    # Active shipments
    active_q = await db.execute(
        select(func.count()).select_from(Shipment).where(
            Shipment.status.in_(["pending", "in_transit", "at_risk", "delayed"])
        )
    )
    active_shipments = active_q.scalar() or 0

    # At-risk
    atrisk_q = await db.execute(
        select(func.count()).select_from(Shipment).where(
            Shipment.status.in_(["at_risk", "delayed"])
        )
    )
    at_risk_shipments = atrisk_q.scalar() or 0

    # Critical suppliers (high or critical risk_level)
    crit_sup_q = await db.execute(
        select(func.count()).select_from(Supplier).where(
            Supplier.risk_level.in_(["high", "critical"])
        )
    )
    critical_suppliers = crit_sup_q.scalar() or 0

    # Active disruptions
    dis_q = await db.execute(
        select(func.count()).select_from(Disruption).where(Disruption.status == "active")
    )
    active_disruptions = dis_q.scalar() or 0

    # Financial exposure: sum of active disruptions
    exp_q = await db.execute(
        select(func.sum(Disruption.financial_exposure)).where(Disruption.status == "active")
    )
    financial_exposure = float(exp_q.scalar() or 0.0)

    # Projected stockouts and production at risk — from inventory records below safety stock
    from sqlalchemy import text
    stockout_q = await db.execute(
        text("SELECT COUNT(*) FROM inventory_records WHERE quantity < safety_stock")
    )
    projected_stockouts = stockout_q.scalar() or 0

    return DashboardKPIResponse(
        health_score=health_score,
        active_shipments=active_shipments,
        at_risk_shipments=at_risk_shipments,
        critical_suppliers=critical_suppliers,
        projected_stockouts=projected_stockouts,
        production_at_risk=1 if projected_stockouts > 0 else 0,
        financial_exposure=financial_exposure,
        active_disruptions=active_disruptions,
    )

@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db)):
    q = await db.execute(
        select(Alert).order_by(Alert.created_at.desc()).limit(20)
    )
    alerts = q.scalars().all()
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "source_node_type": a.source_node_type,
            "source_node_id": a.source_node_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "is_read": a.is_read,
        }
        for a in alerts
    ]
