from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from app.db.session import get_db
from app.db.models import (
    Supplier, Factory, Warehouse, TransportHub, Dealer,
    Product, Route
)

router = APIRouter()

# ─── SUPPLIERS ─────────────────────────────────────────────────────────────────

@router.get("/suppliers")
async def list_suppliers(
    skip: int = 0, limit: int = 100,
    risk_level: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(Supplier)
    if risk_level:
        q = q.where(Supplier.risk_level == risk_level)
    result = await db.execute(q.offset(skip).limit(limit))
    suppliers = result.scalars().all()
    return [_sup(s) for s in suppliers]

@router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db)):
    s = await db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return _sup(s)

@router.post("/suppliers")
async def create_supplier(payload: dict, db: AsyncSession = Depends(get_db)):
    s = Supplier(**payload)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _sup(s)

@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    s = await db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in payload.items():
        if hasattr(s, k):
            setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return _sup(s)

def _sup(s: Supplier) -> dict:
    return {
        "id": s.id, "name": s.name, "code": s.code,
        "location_name": s.location_name, "lat": s.lat, "lng": s.lng,
        "country": s.country, "capacity": s.capacity,
        "reliability_score": s.reliability_score,
        "lead_time_days": s.lead_time_days, "cost_per_unit": s.cost_per_unit,
        "risk_level": s.risk_level, "status": s.status,
    }

# ─── FACTORIES ─────────────────────────────────────────────────────────────────

@router.get("/factories")
async def list_factories(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Factory))
    return [_fac(f) for f in r.scalars().all()]

@router.get("/factories/{factory_id}")
async def get_factory(factory_id: int, db: AsyncSession = Depends(get_db)):
    f = await db.get(Factory, factory_id)
    if not f:
        raise HTTPException(status_code=404, detail="Factory not found")
    return _fac(f)

@router.post("/factories")
async def create_factory(payload: dict, db: AsyncSession = Depends(get_db)):
    f = Factory(**payload)
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return _fac(f)

def _fac(f: Factory) -> dict:
    return {
        "id": f.id, "name": f.name, "code": f.code,
        "location_name": f.location_name, "lat": f.lat, "lng": f.lng,
        "production_rate_per_hour": f.production_rate_per_hour,
        "capacity": f.capacity, "current_utilization": f.current_utilization,
        "contribution_margin_per_unit": f.contribution_margin_per_unit,
        "status": f.status,
    }

# ─── WAREHOUSES ────────────────────────────────────────────────────────────────

@router.get("/warehouses")
async def list_warehouses(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Warehouse))
    return [_wh(w) for w in r.scalars().all()]

@router.get("/warehouses/{warehouse_id}")
async def get_warehouse(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    w = await db.get(Warehouse, warehouse_id)
    if not w:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return _wh(w)

@router.post("/warehouses")
async def create_warehouse(payload: dict, db: AsyncSession = Depends(get_db)):
    w = Warehouse(**payload)
    db.add(w)
    await db.commit()
    await db.refresh(w)
    return _wh(w)

def _wh(w: Warehouse) -> dict:
    return {
        "id": w.id, "name": w.name, "code": w.code,
        "location_name": w.location_name, "lat": w.lat, "lng": w.lng,
        "capacity": w.capacity, "current_inventory": w.current_inventory,
        "safety_stock_threshold": w.safety_stock_threshold, "status": w.status,
    }

# ─── TRANSPORT HUBS ────────────────────────────────────────────────────────────

@router.get("/transport-hubs")
async def list_hubs(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(TransportHub))
    return [{"id": h.id, "name": h.name, "hub_type": h.hub_type, "location_name": h.location_name,
             "lat": h.lat, "lng": h.lng, "throughput_capacity": h.throughput_capacity, "status": h.status}
            for h in r.scalars().all()]

# ─── DEALERS ───────────────────────────────────────────────────────────────────

@router.get("/dealers")
async def list_dealers(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Dealer))
    return [{"id": d.id, "name": d.name, "code": d.code, "location_name": d.location_name,
             "lat": d.lat, "lng": d.lng, "monthly_demand": d.monthly_demand, "status": d.status}
            for d in r.scalars().all()]

# ─── PRODUCTS ──────────────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product))
    return [{"id": p.id, "name": p.name, "sku": p.sku, "category": p.category,
             "unit_cost": p.unit_cost, "weight_kg": p.weight_kg}
            for p in r.scalars().all()]

# ─── ROUTES ────────────────────────────────────────────────────────────────────

@router.get("/routes")
async def list_routes(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Route))
    return [{"id": rt.id, "origin_type": rt.origin_type, "origin_id": rt.origin_id,
             "destination_type": rt.destination_type, "destination_id": rt.destination_id,
             "transport_mode": rt.transport_mode, "distance_km": rt.distance_km,
             "transit_time_hours": rt.transit_time_hours, "cost_per_unit": rt.cost_per_unit,
             "delay_probability": rt.delay_probability, "reliability_score": rt.reliability_score,
             "status": rt.status}
            for rt in r.scalars().all()]

# ─── GRAPH (topology for frontend React Flow) ──────────────────────────────────

@router.get("/graph")
async def get_graph(db: AsyncSession = Depends(get_db)):
    """Returns all nodes and edges for React Flow topology visualization."""
    nodes = []
    edges = []

    suppliers = (await db.execute(select(Supplier))).scalars().all()
    factories  = (await db.execute(select(Factory))).scalars().all()
    warehouses = (await db.execute(select(Warehouse))).scalars().all()
    hubs       = (await db.execute(select(TransportHub))).scalars().all()
    dealers    = (await db.execute(select(Dealer).limit(15))).scalars().all()
    routes     = (await db.execute(select(Route).where(Route.status == "active"))).scalars().all()

    x_spread = 120
    for i, s in enumerate(suppliers):
        nodes.append({"id": f"supplier_{s.id}", "type": "supplier",
                      "position": {"x": i * x_spread, "y": 0},
                      "data": {"id": s.id, "label": s.name, "code": s.code,
                               "risk_level": s.risk_level, "status": s.status,
                               "lat": s.lat, "lng": s.lng}})
    for i, f in enumerate(factories):
        nodes.append({"id": f"factory_{f.id}", "type": "factory",
                      "position": {"x": 150 + i * x_spread * 2, "y": 220},
                      "data": {"id": f.id, "label": f.name, "code": f.code,
                               "utilization": f.current_utilization, "status": f.status,
                               "lat": f.lat, "lng": f.lng}})
    for i, w in enumerate(warehouses):
        nodes.append({"id": f"warehouse_{w.id}", "type": "warehouse",
                      "position": {"x": i * x_spread, "y": 440},
                      "data": {"id": w.id, "label": w.name, "code": w.code,
                               "status": w.status, "lat": w.lat, "lng": w.lng,
                               "inventory_pct": round(w.current_inventory / max(w.capacity, 1) * 100)}})
    for i, d in enumerate(dealers):
        nodes.append({"id": f"dealer_{d.id}", "type": "dealer",
                      "position": {"x": 60 + i * x_spread * 1.2, "y": 660},
                      "data": {"id": d.id, "label": d.name, "code": d.code,
                               "status": d.status, "lat": d.lat, "lng": d.lng}})

    for r in routes:
        edges.append({
            "id": f"edge_{r.id}",
            "source": f"{r.origin_type}_{r.origin_id}",
            "target": f"{r.destination_type}_{r.destination_id}",
            "data": {"mode": r.transport_mode, "delay_probability": r.delay_probability,
                     "distance_km": r.distance_km}
        })

    return {"nodes": nodes, "edges": edges}
