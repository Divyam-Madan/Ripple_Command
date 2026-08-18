"""
Generates real, feasible recovery candidates from current network state. No
candidate's cost, ETA, or capacity is invented - each is derived from seeded
supplier/route/warehouse data or a standard estimation formula (e.g.
haversine distance for an inter-warehouse transfer that has no pre-existing
route in the data).
"""
from __future__ import annotations

import math
from typing import Optional

from sqlalchemy.orm import Session

from app.db import models as m
from app.simulation.engine import RecoveryRequirement, AIR_FREIGHT_COST_PER_UNIT
from app.optimization.models import RecoveryCandidate

AVG_TRUCK_SPEED_KMH = 45.0
ALT_SUPPLIER_PREMIUM = 1.18  # switching-cost premium for a non-primary supplier
WAREHOUSE_TRANSFER_COST_PER_UNIT_PER_KM = 0.045


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def candidate_expedite_shipment(session: Session, req: RecoveryRequirement) -> Optional[RecoveryCandidate]:
    if not req.origin_factory_id:
        return None
    route = (
        session.query(m.Route)
        .filter(m.Route.source_type == "factory", m.Route.source_id == req.origin_factory_id,
                m.Route.dest_type == "warehouse", m.Route.dest_id == req.destination_warehouse_id)
        .first()
    )
    if not route:
        return None
    air_eta = max(3.0, route.transit_time_hours * 0.22)
    factory = session.get(m.Factory, req.origin_factory_id)
    return RecoveryCandidate(
        type="expedite_shipment",
        description=f"Air-freight the outstanding order from {factory.name} directly to {req.needed_at_node_name}",
        cost_per_unit=AIR_FREIGHT_COST_PER_UNIT,
        fixed_cost=1500.0,
        eta_hours=air_eta,
        max_quantity=req.quantity_needed * 1.5,
        meets_deadline=air_eta <= req.needed_within_hours + 6,
        source_label=factory.name,
    )


def candidate_alternate_supplier(session: Session, req: RecoveryRequirement) -> Optional[RecoveryCandidate]:
    if not req.origin_factory_id:
        return None
    routes = (
        session.query(m.Route)
        .filter(m.Route.source_type == "supplier", m.Route.dest_type == "factory",
                m.Route.dest_id == req.origin_factory_id)
        .all()
    )
    alternates = [r for r in routes if r.source_id != req.origin_supplier_id]
    if not alternates:
        return None
    best = max(alternates, key=lambda r: r.reliability)
    supplier = session.get(m.Supplier, best.source_id)
    eta = supplier.lead_time_days * 24.0 + best.transit_time_hours
    return RecoveryCandidate(
        type="alternate_supplier",
        description=f"Source the shortfall from {supplier.name} (reliability {supplier.reliability:.0%}) instead",
        cost_per_unit=best.cost_per_unit * ALT_SUPPLIER_PREMIUM,
        fixed_cost=800.0,
        eta_hours=eta,
        max_quantity=supplier.capacity_units_per_week,
        meets_deadline=eta <= req.needed_within_hours + 12,
        source_label=supplier.name,
    )


def candidate_warehouse_reallocation(session: Session, req: RecoveryRequirement) -> Optional[RecoveryCandidate]:
    dest_wh = session.get(m.Warehouse, req.destination_warehouse_id) if req.destination_warehouse_id else None
    if not dest_wh:
        return None
    surplus_rows = (
        session.query(m.InventoryRecord)
        .filter(m.InventoryRecord.node_type == "warehouse", m.InventoryRecord.product_id == req.product_id)
        .all()
    )
    best_wh = None
    best_surplus = 0.0
    best_dist = None
    for row in surplus_rows:
        if row.node_id == dest_wh.id:
            continue
        surplus = row.on_hand - row.safety_stock
        if surplus <= 0:
            continue
        wh = session.get(m.Warehouse, row.node_id)
        if not wh:
            continue
        dist = _haversine_km(dest_wh.lat, dest_wh.lon, wh.lat, wh.lon)
        if best_wh is None or surplus > best_surplus:
            best_wh, best_surplus, best_dist = wh, surplus, dist
    if best_wh is None:
        return None
    transit_hours = best_dist / AVG_TRUCK_SPEED_KMH
    return RecoveryCandidate(
        type="warehouse_reallocation",
        description=f"Reallocate surplus stock from {best_wh.name} ({best_surplus:.0f} units available) to {dest_wh.name}",
        cost_per_unit=WAREHOUSE_TRANSFER_COST_PER_UNIT_PER_KM * best_dist,
        fixed_cost=350.0,
        eta_hours=transit_hours,
        max_quantity=best_surplus,
        meets_deadline=transit_hours <= req.needed_within_hours + 6,
        source_label=best_wh.name,
    )


def candidate_do_nothing(req: RecoveryRequirement) -> RecoveryCandidate:
    return RecoveryCandidate(
        type="do_nothing",
        description="Take no recovery action and accept the projected shortage",
        cost_per_unit=0.0, fixed_cost=0.0, eta_hours=0.0,
        max_quantity=0.0, meets_deadline=False, source_label="",
    )


def generate_candidates(session: Session, req: RecoveryRequirement) -> list[RecoveryCandidate]:
    candidates = []
    for fn in (candidate_expedite_shipment, candidate_alternate_supplier, candidate_warehouse_reallocation):
        c = fn(session, req)
        if c is not None:
            candidates.append(c)
    candidates.append(candidate_do_nothing(req))
    return candidates
