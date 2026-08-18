from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import InventoryRecord, Shipment, Supplier, Factory

async def calculate_health_score(db: AsyncSession) -> float:
    inv_q = await db.execute(select(InventoryRecord))
    records = inv_q.scalars().all()
    if records:
        healthy = sum(1 for r in records if r.quantity >= r.safety_stock)
        inventory_health = healthy / len(records)
    else:
        inventory_health = 0.8
    
    ship_q = await db.execute(select(Shipment))
    shipments = ship_q.scalars().all()
    if shipments:
        on_time = sum(1 for s in shipments if s.status not in ['delayed', 'cancelled'])
        shipment_reliability = on_time / len(shipments)
    else:
        shipment_reliability = 0.9
    
    sup_q = await db.execute(select(Supplier))
    suppliers = sup_q.scalars().all()
    supplier_risk = sum(s.reliability_score for s in suppliers) / len(suppliers) if suppliers else 0.85
    
    fact_q = await db.execute(select(Factory))
    factories = fact_q.scalars().all()
    production_risk = 1 - (sum(f.current_utilization for f in factories) / len(factories)) if factories else 0.8
    production_risk = max(0, min(1, production_risk + 0.3))
    
    demand_coverage = min(inventory_health * 1.1, 1.0)
    
    score = (
        inventory_health * 0.25 +
        shipment_reliability * 0.20 +
        supplier_risk * 0.20 +
        production_risk * 0.20 +
        demand_coverage * 0.15
    ) * 100
    return round(min(100.0, max(0.0, score)), 1)
