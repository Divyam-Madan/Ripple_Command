from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import models as m
from app.services.health_score import compute_supply_chain_health


def get_dashboard_summary(session: Session) -> dict:
    health = compute_supply_chain_health(session)

    active_shipments = session.query(m.Shipment).filter(
        m.Shipment.status.in_(["in_transit", "planned"])
    ).count()
    at_risk_shipments = session.query(m.Shipment).filter(
        m.Shipment.status.in_(["in_transit", "planned", "delayed"]),
        m.Shipment.delay_probability >= 0.12,
    ).count()

    suppliers = session.query(m.Supplier).all()
    critical_suppliers = [s for s in suppliers if s.risk_score >= 30]

    factories = session.query(m.Factory).all()
    production_at_risk = 0
    for f in factories:
        consumption_per_hour = (f.production_rate_units_per_day * f.material_required_per_unit) / 24.0
        cover_hours = f.raw_material_buffer_units / consumption_per_hour if consumption_per_hour > 0 else 999
        if cover_hours < 24:
            production_at_risk += 1

    warehouses = session.query(m.Warehouse).all()
    projected_stockouts = sum(1 for w in warehouses if w.on_hand_units < w.safety_stock_units * 1.1)

    active_disruptions = session.query(m.Disruption).filter(m.Disruption.status == "active").count()

    recent_runs = (
        session.query(m.SimulationRun)
        .order_by(m.SimulationRun.created_at.desc())
        .limit(5)
        .all()
    )
    financial_exposure = sum(r.total_financial_exposure for r in recent_runs)

    alerts = (
        session.query(m.Alert)
        .order_by(m.Alert.created_at.desc())
        .limit(12)
        .all()
    )

    top_risk_suppliers = sorted(suppliers, key=lambda s: s.risk_score, reverse=True)[:5]

    watchlist = (
        session.query(m.Shipment)
        .filter(m.Shipment.status.in_(["in_transit", "delayed"]))
        .order_by(m.Shipment.delay_probability.desc())
        .limit(8)
        .all()
    )

    return {
        "health": health,
        "kpis": {
            "active_shipments": active_shipments,
            "at_risk_shipments": at_risk_shipments,
            "critical_suppliers": len(critical_suppliers),
            "projected_stockouts": projected_stockouts,
            "production_at_risk": production_at_risk,
            "active_disruptions": active_disruptions,
            "financial_exposure": round(financial_exposure, 2),
        },
        "alerts": [
            {
                "id": a.id, "severity": a.severity, "source_type": a.source_type, "source_id": a.source_id,
                "message": a.message, "impact_summary": a.impact_summary,
                "recommended_action": a.recommended_action, "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
        "top_risk_suppliers": [
            {"id": s.id, "name": s.name, "risk_score": s.risk_score, "reliability": s.reliability, "status": s.status}
            for s in top_risk_suppliers
        ],
        "shipment_watchlist": [
            {
                "id": s.id, "order_id": s.order_id, "source_type": s.source_type, "dest_type": s.dest_type,
                "status": s.status, "delay_probability": s.delay_probability,
                "predicted_eta": s.predicted_eta.isoformat(), "quantity": s.quantity,
            }
            for s in watchlist
        ],
    }
