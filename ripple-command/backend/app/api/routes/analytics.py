from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_db

router = APIRouter()


@router.get("/analytics/overview")
def analytics_overview(session: Session = Depends(get_db)):
    suppliers = session.query(m.Supplier).all()
    routes = session.query(m.Route).all()
    shipments = session.query(m.Shipment).all()
    runs = session.query(m.SimulationRun).order_by(m.SimulationRun.created_at.desc()).limit(50).all()
    disruptions = session.query(m.Disruption).order_by(m.Disruption.created_at.desc()).limit(50).all()

    supplier_reliability = sorted(
        [{"name": s.name, "reliability": round(s.reliability, 3), "risk_score": s.risk_score} for s in suppliers],
        key=lambda x: x["reliability"],
    )[:10]

    route_reliability = sorted(
        [{"id": r.id, "mode": r.transport_mode, "reliability": round(r.reliability, 3),
          "delay_probability": r.delay_probability} for r in routes],
        key=lambda x: x["reliability"],
    )[:10]

    delayed = [s for s in shipments if s.status == "delayed"]
    avg_delay_hours = (
        sum((s.predicted_eta - s.planned_eta).total_seconds() / 3600.0 for s in delayed) / len(delayed)
        if delayed else 0.0
    )

    warehouses = session.query(m.Warehouse).all()
    inventory_trend = [
        {"name": w.name, "on_hand": w.on_hand_units, "safety_stock": w.safety_stock_units,
         "capacity": w.capacity_units}
        for w in warehouses
    ]

    disruption_type_counts: dict[str, int] = {}
    disruption_type_cost: dict[str, float] = {}
    run_by_disruption = {r.disruption_id: r for r in runs}
    for d in disruptions:
        disruption_type_counts[d.type] = disruption_type_counts.get(d.type, 0) + 1
        run = run_by_disruption.get(d.id)
        if run:
            disruption_type_cost[d.type] = disruption_type_cost.get(d.type, 0.0) + run.total_financial_exposure

    production_loss_total = 0.0
    recovery_cost_total = 0.0
    for run in runs:
        impacts = session.query(m.SimulationImpact).filter(m.SimulationImpact.simulation_run_id == run.id).all()
        production_loss_total += sum(i.financial_impact for i in impacts if "Production Line" in i.node_name)
    recovery_options = session.query(m.RecoveryOption).filter(m.RecoveryOption.is_recommended == True).all()  # noqa: E712
    recovery_cost_total = sum(o.cost for o in recovery_options)

    most_exposed: dict[str, float] = {}
    for d in disruptions:
        run = run_by_disruption.get(d.id)
        if not run:
            continue
        key = f"{d.target_type}:{d.target_id}"
        most_exposed[key] = most_exposed.get(key, 0.0) + run.total_financial_exposure
    most_exposed_named = []
    for key, val in sorted(most_exposed.items(), key=lambda kv: kv[1], reverse=True)[:5]:
        node_type, node_id = key.split(":", 1)
        from app.db.repositories import get_node
        obj = get_node(session, node_type, node_id)
        most_exposed_named.append({"name": obj.name if obj else key, "financial_exposure": round(val, 2)})

    return {
        "supplier_reliability_lowest": supplier_reliability,
        "route_reliability_lowest": route_reliability,
        "average_delay_hours": round(avg_delay_hours, 1),
        "inventory_trend": inventory_trend,
        "disruption_frequency": disruption_type_counts,
        "production_loss_total": round(production_loss_total, 2),
        "recovery_cost_total": round(recovery_cost_total, 2),
        "most_exposed_entities": most_exposed_named,
        "most_costly_disruption_types": sorted(
            [{"type": k, "total_exposure": round(v, 2)} for k, v in disruption_type_cost.items()],
            key=lambda x: x["total_exposure"], reverse=True,
        ),
    }
