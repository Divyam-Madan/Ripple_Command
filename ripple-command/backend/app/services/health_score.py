"""
Supply Chain Health: a weighted composite score (0-100), never a hardcoded
number. Recomputed from current DB state every time it's requested.

Weights are a documented engineering decision, not a fabricated output:
  inventory health        25%
  shipment reliability    20%
  supplier risk           20%
  production risk         15%
  capacity utilization    10%
  demand coverage         10%
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import models as m

WEIGHTS = {
    "inventory_health": 0.25,
    "shipment_reliability": 0.20,
    "supplier_risk": 0.20,
    "production_risk": 0.15,
    "capacity_utilization": 0.10,
    "demand_coverage": 0.10,
}


def _inventory_health(session: Session) -> float:
    warehouses = session.query(m.Warehouse).all()
    if not warehouses:
        return 100.0
    scores = []
    for w in warehouses:
        if w.safety_stock_units <= 0:
            scores.append(100.0)
            continue
        ratio = w.on_hand_units / w.safety_stock_units
        scores.append(max(0.0, min(100.0, ratio * 50.0)))
    return sum(scores) / len(scores)


def _shipment_reliability(session: Session) -> float:
    total = session.query(m.Shipment).count()
    if total == 0:
        return 100.0
    delayed = session.query(m.Shipment).filter(m.Shipment.status == "delayed").count()
    return max(0.0, 100.0 * (1 - delayed / total))


def _supplier_risk(session: Session) -> float:
    suppliers = session.query(m.Supplier).all()
    if not suppliers:
        return 100.0
    avg_risk = sum(s.risk_score for s in suppliers) / len(suppliers)
    return max(0.0, 100.0 - avg_risk)


def _production_risk(session: Session) -> float:
    factories = session.query(m.Factory).all()
    if not factories:
        return 100.0
    scores = []
    for f in factories:
        consumption_per_hour = (f.production_rate_units_per_day * f.material_required_per_unit) / 24.0
        if consumption_per_hour <= 0:
            scores.append(100.0)
            continue
        cover_hours = f.raw_material_buffer_units / consumption_per_hour
        scores.append(max(0.0, min(100.0, cover_hours / 48.0 * 100.0)))
    return sum(scores) / len(scores)


def _capacity_utilization(session: Session) -> float:
    warehouses = session.query(m.Warehouse).all()
    if not warehouses:
        return 100.0
    ratios = [min(1.0, w.on_hand_units / w.capacity_units) for w in warehouses if w.capacity_units > 0]
    if not ratios:
        return 100.0
    avg = sum(ratios) / len(ratios)
    # A healthy utilization band is ~50-80%; too low or too high both cost points.
    target = 0.65
    penalty = abs(avg - target) * 100.0
    return max(0.0, 100.0 - penalty)


def _demand_coverage(session: Session) -> float:
    dealers = session.query(m.Dealer).all()
    if not dealers:
        return 100.0
    scores = []
    for d in dealers:
        weekly_demand = d.demand_units_per_week
        if weekly_demand <= 0:
            scores.append(100.0)
            continue
        cover_weeks = d.on_hand_units / weekly_demand
        scores.append(max(0.0, min(100.0, cover_weeks / 1.2 * 100.0)))
    return sum(scores) / len(scores)


def compute_supply_chain_health(session: Session) -> dict:
    components = {
        "inventory_health": _inventory_health(session),
        "shipment_reliability": _shipment_reliability(session),
        "supplier_risk": _supplier_risk(session),
        "production_risk": _production_risk(session),
        "capacity_utilization": _capacity_utilization(session),
        "demand_coverage": _demand_coverage(session),
    }
    score = sum(components[k] * WEIGHTS[k] for k in WEIGHTS)
    return {"score": round(score, 1), "components": {k: round(v, 1) for k, v in components.items()},
            "weights": WEIGHTS}
