from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models import Supplier, Shipment, Disruption, InventoryRecord
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/supplier-reliability")
async def supplier_reliability(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(Supplier).order_by(Supplier.reliability_score.desc()))
    suppliers = q.scalars().all()
    return [
        {"name": s.code, "full_name": s.name, "reliability": round(s.reliability_score * 100, 1),
         "risk_level": s.risk_level, "lead_time_days": s.lead_time_days}
        for s in suppliers
    ]

@router.get("/disruption-frequency")
async def disruption_frequency(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(Disruption))
    disruptions = q.scalars().all()
    freq: dict[str, int] = {}
    for d in disruptions:
        freq[d.disruption_type] = freq.get(d.disruption_type, 0) + 1
    return [{"type": k, "count": v} for k, v in sorted(freq.items(), key=lambda x: -x[1])]

@router.get("/financial-trend")
async def financial_trend(db: AsyncSession = Depends(get_db)):
    """Returns mock monthly trend data based on active disruption exposure."""
    now = datetime.now(timezone.utc)
    base_exposure = 2_500_000
    months = []
    for i in range(6, -1, -1):
        month = now - timedelta(days=30 * i)
        multiplier = 1.0 + (0.3 if i == 1 else (0.15 if i == 2 else (-0.1 if i > 4 else 0)))
        months.append({
            "month": month.strftime("%b %Y"),
            "exposure": round(base_exposure * multiplier),
            "recovered": round(base_exposure * multiplier * 0.7),
        })
    return months

@router.get("/inventory-health")
async def inventory_health(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(InventoryRecord))
    records = q.scalars().all()
    return [
        {
            "id": r.id,
            "node_type": r.node_type,
            "node_id": r.node_id,
            "quantity": r.quantity,
            "safety_stock": r.safety_stock,
            "health_pct": round(min(r.quantity / max(r.safety_stock, 1), 2.0) * 50, 1),  # 0-100, 100=2x safety stock
            "below_safety_stock": r.quantity < r.safety_stock,
        }
        for r in records
    ]

@router.get("/shipment-status-summary")
async def shipment_status_summary(db: AsyncSession = Depends(get_db)):
    q = await db.execute(
        select(Shipment.status, func.count().label("count")).group_by(Shipment.status)
    )
    return [{"status": row[0], "count": row[1]} for row in q.all()]
