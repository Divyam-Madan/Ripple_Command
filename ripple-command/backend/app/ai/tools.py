"""
Backend tools exposed to the copilot. Every function here returns numbers
that come directly from the database or the deterministic simulation /
optimization engines - the LLM is only ever allowed to call these and
summarize what comes back, per the product's core non-fabrication rule.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.resolve import resolve_entity_reference
from app.db import models as m
from app.services import dashboard_service, optimization_service, simulation_service
from app.services.health_score import compute_supply_chain_health

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "simulate_disruption",
            "description": "Run the deterministic disruption simulation for a given target and delay. Use for any 'what happens if X is delayed by Y hours' question.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_ref": {"type": "string", "description": "Entity code or name, e.g. 'S3', 'F1', 'W4'"},
                    "disruption_type": {"type": "string", "enum": [
                        "supplier_delay", "shipment_delay", "truck_breakdown", "route_closure",
                        "weather_disruption", "warehouse_stockout", "port_congestion", "demand_surge",
                    ]},
                    "delay_hours": {"type": "number"},
                },
                "required": ["target_ref", "disruption_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_node_risk",
            "description": "Get current risk/status detail for a single network node (supplier, factory, warehouse, dealer).",
            "parameters": {
                "type": "object",
                "properties": {"target_ref": {"type": "string"}},
                "required": ["target_ref"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_summary",
            "description": "Get current control-tower KPIs: health score, active/at-risk shipments, financial exposure, alerts.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_supplier_risk",
            "description": "List suppliers ordered by risk score, highest first.",
            "parameters": {
                "type": "object",
                "properties": {"top_n": {"type": "integer", "default": 5}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_recovery",
            "description": "Run the recovery optimizer for a completed simulation run and return ranked, costed options with the recommended one.",
            "parameters": {
                "type": "object",
                "properties": {"simulation_run_id": {"type": "string"}},
                "required": ["simulation_run_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_recovery_options",
            "description": "Compare specific recovery option types (e.g. expedite_shipment vs alternate_supplier) for a simulation run.",
            "parameters": {
                "type": "object",
                "properties": {
                    "simulation_run_id": {"type": "string"},
                    "option_types": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["simulation_run_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_projection",
            "description": "Get current inventory / buffer cover for a node (factory raw-material buffer, warehouse or dealer stock vs safety stock/demand).",
            "parameters": {
                "type": "object",
                "properties": {"target_ref": {"type": "string"}},
                "required": ["target_ref"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_financial_impact",
            "description": "Get the financial exposure breakdown for a completed simulation run.",
            "parameters": {
                "type": "object",
                "properties": {"simulation_run_id": {"type": "string"}},
                "required": ["simulation_run_id"],
            },
        },
    },
]


def _unavailable(reason: str) -> dict:
    return {"error": "unavailable", "detail": reason}


def call_tool(session: Session, name: str, args: dict) -> dict:
    if name == "simulate_disruption":
        ref = resolve_entity_reference(session, args.get("target_ref", ""))
        if not ref:
            return _unavailable(f"Could not resolve target '{args.get('target_ref')}' to a known network entity.")
        node_type, node_id, node_name = ref
        result = simulation_service.simulate_and_persist(
            session, args["disruption_type"], node_type, node_id, float(args.get("delay_hours", 0.0)),
        )
        session.commit()
        return result

    if name == "get_node_risk":
        ref = resolve_entity_reference(session, args.get("target_ref", ""))
        if not ref:
            return _unavailable(f"Could not resolve target '{args.get('target_ref')}'.")
        return _node_risk(session, *ref)

    if name == "get_dashboard_summary":
        return dashboard_service.get_dashboard_summary(session)

    if name == "rank_supplier_risk":
        top_n = int(args.get("top_n", 5))
        suppliers = session.query(m.Supplier).order_by(m.Supplier.risk_score.desc()).limit(top_n).all()
        return {"suppliers": [
            {"id": s.id, "name": s.name, "risk_score": s.risk_score, "reliability": s.reliability,
             "lead_time_days": s.lead_time_days, "status": s.status}
            for s in suppliers
        ]}

    if name == "optimize_recovery":
        result = optimization_service.optimize_and_persist(session, args["simulation_run_id"])
        if result is None:
            return _unavailable("No recovery requirement on this simulation run (no shortage was projected, or the run id is unknown).")
        session.commit()
        return result

    if name == "compare_recovery_options":
        result = optimization_service.get_recovery_options(session, args["simulation_run_id"])
        if result is None:
            return _unavailable("Unknown simulation_run_id.")
        wanted = set(args.get("option_types") or [])
        if wanted:
            result["options"] = [o for o in result["options"] if o["type"] in wanted]
        return result

    if name == "get_inventory_projection":
        ref = resolve_entity_reference(session, args.get("target_ref", ""))
        if not ref:
            return _unavailable(f"Could not resolve target '{args.get('target_ref')}'.")
        return _inventory_projection(session, *ref)

    if name == "get_financial_impact":
        result = simulation_service.get_simulation(session, args["simulation_run_id"])
        if result is None:
            return _unavailable("Unknown simulation_run_id.")
        return {
            "simulation_run_id": result["simulation_run_id"],
            "total_financial_exposure": result["total_financial_exposure"],
            "by_stage": [
                {"node_name": i["node_name"], "financial_impact": i["financial_impact"]}
                for i in result["impact_chain"] if i["financial_impact"] > 0
            ],
        }

    return _unavailable(f"Unknown tool '{name}'.")


def _node_risk(session: Session, node_type: str, node_id: str, node_name: str) -> dict:
    if node_type == "supplier":
        s = session.get(m.Supplier, node_id)
        return {"node_type": node_type, "name": s.name, "status": s.status, "risk_score": s.risk_score,
                "reliability": s.reliability, "lead_time_days": s.lead_time_days}
    if node_type == "factory":
        f = session.get(m.Factory, node_id)
        consumption_per_hour = (f.production_rate_units_per_day * f.material_required_per_unit) / 24.0
        cover_hours = f.raw_material_buffer_units / consumption_per_hour if consumption_per_hour > 0 else None
        return {"node_type": node_type, "name": f.name, "status": f.status,
                "raw_material_buffer_units": f.raw_material_buffer_units,
                "hours_of_cover": round(cover_hours, 1) if cover_hours is not None else None,
                "production_rate_units_per_day": f.production_rate_units_per_day}
    if node_type == "warehouse":
        w = session.get(m.Warehouse, node_id)
        return {"node_type": node_type, "name": w.name, "status": w.status, "on_hand_units": w.on_hand_units,
                "safety_stock_units": w.safety_stock_units, "capacity_units": w.capacity_units}
    if node_type == "dealer":
        d = session.get(m.Dealer, node_id)
        return {"node_type": node_type, "name": d.name, "status": d.status, "on_hand_units": d.on_hand_units,
                "demand_units_per_week": d.demand_units_per_week}
    return {"node_type": node_type, "name": node_name, "status": "unknown"}


def _inventory_projection(session: Session, node_type: str, node_id: str, node_name: str) -> dict:
    if node_type == "factory":
        f = session.get(m.Factory, node_id)
        consumption_per_hour = (f.production_rate_units_per_day * f.material_required_per_unit) / 24.0
        cover_hours = f.raw_material_buffer_units / consumption_per_hour if consumption_per_hour > 0 else None
        return {"node_type": node_type, "name": f.name, "current_buffer_units": f.raw_material_buffer_units,
                "consumption_per_hour": round(consumption_per_hour, 2),
                "hours_of_cover": round(cover_hours, 1) if cover_hours is not None else None}
    if node_type == "warehouse":
        w = session.get(m.Warehouse, node_id)
        return {"node_type": node_type, "name": w.name, "on_hand_units": w.on_hand_units,
                "safety_stock_units": w.safety_stock_units,
                "cushion_units": round(w.on_hand_units - w.safety_stock_units, 1)}
    if node_type == "dealer":
        d = session.get(m.Dealer, node_id)
        weekly_cover = d.on_hand_units / d.demand_units_per_week if d.demand_units_per_week > 0 else None
        return {"node_type": node_type, "name": d.name, "on_hand_units": d.on_hand_units,
                "demand_units_per_week": d.demand_units_per_week,
                "weeks_of_cover": round(weekly_cover, 2) if weekly_cover is not None else None}
    return _unavailable(f"No inventory model for node type '{node_type}'.")
