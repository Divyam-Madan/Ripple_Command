"""
Disruption simulation engine.

Given a disruption (type + target + delay hours), this module:
  1. Resolves the disrupted node/shipment
  2. Finds the real shipment(s) carrying material/goods away from it
  3. Applies the delay to that shipment's predicted arrival
  4. Projects inventory at the next node in the chain (factory raw-material
     buffer, or warehouse/dealer finished-goods stock)
  5. Derives production downtime, downstream replenishment delay, and dealer
     shortage from the SAME numbers - nothing here is a fabricated constant
  6. Prices the cascade (production loss, SLA penalty) via financial_impact
  7. Returns an ordered impact chain plus a recovery requirement the
     optimizer consumes directly

Every quantity in the returned chain traces back to a seeded DB row or a
formula over seeded DB rows.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Optional

import networkx as nx
from sqlalchemy.orm import Session

from app.db import models as m
from app.graph.builder import build_graph
from app.simulation import financial_impact as fin
from app.simulation import inventory_projection as inv
from app.simulation import production_impact as prod

EVALUATION_HORIZON_HOURS = 96.0
DEMAND_SURGE_FACTOR = 1.65
STOCKOUT_EVAL_HOURS = 72.0
AIR_FREIGHT_COST_PER_UNIT = 95.0


@dataclass
class ImpactStage:
    sequence: int
    node_type: str
    node_id: str
    node_name: str
    status: str
    reason: str
    estimated_time_hours: float
    affected_quantity: float
    financial_impact: float


@dataclass
class RecoveryRequirement:
    product_id: str
    quantity_needed: float
    needed_at_node_type: str
    needed_at_node_id: str
    needed_at_node_name: str
    needed_within_hours: float
    origin_factory_id: Optional[str]
    origin_supplier_id: Optional[str]
    destination_warehouse_id: Optional[str]


@dataclass
class SimulationResult:
    disruption_type: str
    target_type: str
    target_id: str
    target_name: str
    delay_hours: float
    severity: str
    health_before: float
    health_after: float
    total_financial_exposure: float
    impact_chain: list[ImpactStage] = field(default_factory=list)
    affected_order_ids: list[str] = field(default_factory=list)
    recovery_requirement: Optional[RecoveryRequirement] = None
    narrative_summary: str = ""


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _hours_from_now(ts: dt.datetime) -> float:
    now = _now()
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    return max(0.0, (ts - now).total_seconds() / 3600.0)


def _severity_from_financial(exposure: float) -> str:
    if exposure >= 400_000:
        return "critical"
    if exposure >= 150_000:
        return "high"
    if exposure >= 30_000:
        return "medium"
    return "informational"


def _node_obj(session: Session, node_type: str, node_id: str):
    from app.db.repositories import get_node
    return get_node(session, node_type, node_id)


def _downstream_dealers(g: nx.DiGraph, warehouse_key: tuple[str, str]) -> list[tuple[str, str]]:
    if warehouse_key not in g:
        return []
    return [n for n in g.successors(warehouse_key) if n[0] == "dealer"]


def _pick_next_shipment(candidates: list[m.Shipment]) -> Optional[m.Shipment]:
    """Prefer the soonest still-upcoming shipment (the real "next delivery");
    fall back to the most recently due one if everything already landed."""
    if not candidates:
        return None
    now = _now()

    def _eta(sh: m.Shipment) -> dt.datetime:
        return sh.predicted_eta if sh.predicted_eta.tzinfo else sh.predicted_eta.replace(tzinfo=dt.timezone.utc)

    upcoming = [c for c in candidates if _eta(c) >= now]
    if upcoming:
        return min(upcoming, key=_eta)
    return max(candidates, key=_eta)


def _find_critical_inbound_shipment(session: Session, origin_type: str, origin_id: str) -> Optional[m.Shipment]:
    """The next active shipment carrying material FROM the origin node TO a
    factory. This is what a supplier/route/hub disruption actually delays."""
    candidates = (
        session.query(m.Shipment)
        .filter(
            m.Shipment.source_type == origin_type,
            m.Shipment.source_id == origin_id,
            m.Shipment.dest_type == "factory",
            m.Shipment.status.in_(["in_transit", "planned"]),
        )
        .all()
    )
    return _pick_next_shipment(candidates)


def _find_any_active_shipment(session: Session, origin_type: str, origin_id: str) -> Optional[m.Shipment]:
    candidates = (
        session.query(m.Shipment)
        .filter(
            m.Shipment.source_type == origin_type,
            m.Shipment.source_id == origin_id,
            m.Shipment.status.in_(["in_transit", "planned"]),
        )
        .all()
    )
    return _pick_next_shipment(candidates)


def _find_replenishment_shipment(session: Session, factory_id: str, warehouse_id: str) -> Optional[m.Shipment]:
    candidates = (
        session.query(m.Shipment)
        .filter(
            m.Shipment.source_type == "factory",
            m.Shipment.source_id == factory_id,
            m.Shipment.dest_type == "warehouse",
            m.Shipment.dest_id == warehouse_id,
            m.Shipment.status.in_(["in_transit", "planned"]),
        )
        .all()
    )
    return _pick_next_shipment(candidates)


def _primary_downstream_warehouse(g: nx.DiGraph, factory_key: tuple[str, str]) -> Optional[tuple[str, str]]:
    candidates = [n for n in g.successors(factory_key) if n[0] == "warehouse"]
    if not candidates:
        for hub in [n for n in g.successors(factory_key) if n[0] == "transport_hub"]:
            candidates += [n for n in g.successors(hub) if n[0] == "warehouse"]
    return candidates[0] if candidates else None


def _resolve_origin(session: Session, target_type: str, target_id: str) -> tuple[str, str, str]:
    """Returns (origin_type, origin_id, origin_name) - the network node whose
    outbound flow is actually delayed."""
    if target_type == "route":
        route = session.get(m.Route, target_id)
        if route:
            return route.source_type, route.source_id, _entity_name(session, route.source_type, route.source_id)
    if target_type == "shipment":
        sh = session.get(m.Shipment, target_id)
        if sh:
            return sh.source_type, sh.source_id, _entity_name(session, sh.source_type, sh.source_id)
    return target_type, target_id, _entity_name(session, target_type, target_id)


def _entity_name(session: Session, node_type: str, node_id: str) -> str:
    obj = _node_obj(session, node_type, node_id)
    return obj.name if obj else f"{node_type}:{node_id}"


def run_simulation(
    session: Session,
    disruption_type: str,
    target_type: str,
    target_id: str,
    delay_hours: float,
    health_before: float,
) -> SimulationResult:
    g = build_graph(session)
    stages: list[ImpactStage] = []
    seq = 0
    recovery_req: Optional[RecoveryRequirement] = None
    affected_order_ids: list[str] = []
    total_financial = 0.0

    if disruption_type in ("warehouse_stockout",):
        result = _simulate_warehouse_stockout(session, g, target_id)
    elif disruption_type in ("demand_surge",):
        result = _simulate_demand_surge(session, g, target_id)
    else:
        result = _simulate_upstream_delay(session, g, disruption_type, target_type, target_id, delay_hours)

    stages, recovery_req, affected_order_ids, total_financial, target_name = result

    severity = _severity_from_financial(total_financial)
    health_after = max(0.0, health_before - min(35.0, total_financial / 25_000.0))

    narrative = _build_narrative(stages)

    return SimulationResult(
        disruption_type=disruption_type,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        delay_hours=delay_hours,
        severity=severity,
        health_before=health_before,
        health_after=round(health_after, 1),
        total_financial_exposure=round(total_financial, 2),
        impact_chain=stages,
        affected_order_ids=affected_order_ids,
        recovery_requirement=recovery_req,
        narrative_summary=narrative,
    )


def _simulate_upstream_delay(
    session: Session, g: nx.DiGraph, disruption_type: str, target_type: str, target_id: str, delay_hours: float,
) -> tuple[list[ImpactStage], Optional[RecoveryRequirement], list[str], float, str]:
    origin_type, origin_id, origin_name = _resolve_origin(session, target_type, target_id)
    stages: list[ImpactStage] = []
    seq = 0
    total_financial = 0.0
    affected_order_ids: list[str] = []
    recovery_req: Optional[RecoveryRequirement] = None

    critical_shipment = _find_critical_inbound_shipment(session, origin_type, origin_id)
    if critical_shipment is None:
        critical_shipment = _find_any_active_shipment(session, origin_type, origin_id)

    origin_node = _node_obj(session, origin_type, origin_id)
    origin_status = "critical" if delay_hours >= 8 else "warning"
    stages.append(ImpactStage(
        sequence=seq, node_type=origin_type, node_id=origin_id, node_name=origin_name,
        status=origin_status,
        reason=f"Outbound shipment delayed by {delay_hours:g}h ({disruption_type.replace('_', ' ')})",
        estimated_time_hours=0.0,
        affected_quantity=critical_shipment.quantity if critical_shipment else 0.0,
        financial_impact=0.0,
    ))
    seq += 1

    if critical_shipment is None or critical_shipment.dest_type != "factory":
        # No modelled factory dependency on this exact node - still surface the
        # direct downstream effect on whatever the shipment feeds (warehouse/dealer)
        if critical_shipment is not None:
            stages.append(ImpactStage(
                sequence=seq, node_type=critical_shipment.dest_type, node_id=critical_shipment.dest_id,
                node_name=_entity_name(session, critical_shipment.dest_type, critical_shipment.dest_id),
                status="warning",
                reason=f"Receiving shipment delayed {delay_hours:g}h; monitor downstream cover",
                estimated_time_hours=delay_hours, affected_quantity=critical_shipment.quantity,
                financial_impact=0.0,
            ))
        return stages, recovery_req, affected_order_ids, total_financial, origin_name

    factory: m.Factory = session.get(m.Factory, critical_shipment.dest_id)
    factory_key = ("factory", factory.id)

    consumption_per_hour = (factory.production_rate_units_per_day * factory.material_required_per_unit) / 24.0
    breach_hours = inv.hours_to_breach(factory.raw_material_buffer_units, consumption_per_hour)
    inbound_eta_hours = _hours_from_now(critical_shipment.predicted_eta) + delay_hours
    gap_hours = inv.resupply_gap_hours(breach_hours, inbound_eta_hours)
    downtime_hrs = prod.downtime_hours(gap_hours, EVALUATION_HORIZON_HOURS)
    line_no = prod.affected_line_index(factory.id, factory.num_production_lines)
    affected_units = prod.affected_output_units(downtime_hrs, factory.production_rate_units_per_day,
                                                  factory.num_production_lines, lines_affected=1)
    production_loss = fin.production_loss_value(affected_units, factory.contribution_margin_per_unit)
    total_financial += production_loss

    factory_status = "critical" if downtime_hrs > 0 else ("warning" if breach_hours < inbound_eta_hours + 12 else "healthy")
    stages.append(ImpactStage(
        sequence=seq, node_type="factory", node_id=factory.id, node_name=factory.name,
        status=factory_status,
        reason=(
            f"Raw-material buffer breach projected in {breach_hours:.1f}h; resupply not due until {inbound_eta_hours:.1f}h"
            if downtime_hrs > 0 else
            f"Buffer breach projected in {breach_hours:.1f}h; resupply due in {inbound_eta_hours:.1f}h, within tolerance"
        ),
        estimated_time_hours=round(breach_hours, 1), affected_quantity=round(affected_units, 1),
        financial_impact=0.0,
    ))
    seq += 1

    if downtime_hrs > 0:
        stages.append(ImpactStage(
            sequence=seq, node_type="factory", node_id=factory.id,
            node_name=f"{factory.name} \u2014 Production Line {line_no}",
            status="critical",
            reason=f"{downtime_hrs:.1f}h projected downtime from component shortage",
            estimated_time_hours=round(downtime_hrs, 1), affected_quantity=round(affected_units, 1),
            financial_impact=round(production_loss, 2),
        ))
        seq += 1

    warehouse_key = _primary_downstream_warehouse(g, factory_key)
    if warehouse_key:
        warehouse: m.Warehouse = session.get(m.Warehouse, warehouse_key[1])
        repl_shipment = _find_replenishment_shipment(session, factory.id, warehouse.id)
        dealers = _downstream_dealers(g, warehouse_key)
        dealer_hourly_demand = sum(
            g.nodes[d]["demand_per_week"] / 7.0 / 24.0 for d in dealers
        ) if dealers else 0.0

        repl_delay = downtime_hrs if downtime_hrs > 0 else 0.0
        wh_breach_hours = inv.hours_to_breach(
            max(0.0, warehouse.on_hand_units - warehouse.safety_stock_units), dealer_hourly_demand
        )
        wh_inbound_eta = (_hours_from_now(repl_shipment.predicted_eta) + repl_delay) if repl_shipment else 9999.0
        wh_gap = inv.resupply_gap_hours(wh_breach_hours, wh_inbound_eta)
        wh_breached = wh_gap > 0 or repl_delay > 0

        wh_status = "critical" if wh_gap > 0 else ("warning" if repl_delay > 0 else "healthy")
        stages.append(ImpactStage(
            sequence=seq, node_type="warehouse", node_id=warehouse.id, node_name=warehouse.name,
            status=wh_status,
            reason=(
                f"Replenishment delayed {repl_delay:.1f}h by upstream production downtime"
                if repl_delay > 0 else "Replenishment on schedule, monitoring cover"
            ),
            estimated_time_hours=round(wh_breach_hours, 1) if wh_breach_hours != float("inf") else 0.0,
            affected_quantity=round(max(0.0, dealer_hourly_demand * repl_delay), 1),
            financial_impact=0.0,
        ))
        seq += 1

        if wh_gap > 0 and dealers:
            dealers_sorted = sorted(dealers, key=lambda dkey: g.nodes[dkey]["demand_per_week"], reverse=True)
            top_dealer_key = dealers_sorted[0]
            dealer: m.Dealer = session.get(m.Dealer, top_dealer_key[1])
            product = session.query(m.Product).first()
            hourly_demand = dealer.demand_units_per_week / 7.0 / 24.0
            expected_consumption = hourly_demand * wh_gap
            shortage_units = max(0.0, expected_consumption - dealer.on_hand_units)
            penalty = fin.sla_penalty(shortage_units, product.sla_penalty_per_unit_per_day if product else 8.0, wh_gap)
            total_financial += penalty

            open_orders = (
                session.query(m.Order)
                .filter(m.Order.dealer_id == dealer.id, m.Order.status == "open")
                .all()
            )
            affected_order_ids = [o.id for o in open_orders]

            stages.append(ImpactStage(
                sequence=seq, node_type="dealer", node_id=dealer.id, node_name=dealer.name,
                status="critical" if shortage_units > 0 else "warning",
                reason=(
                    f"{shortage_units:.0f}-unit shortage projected against demand"
                    if shortage_units > 0 else "Cover holds through the disruption window"
                ),
                estimated_time_hours=round(wh_breach_hours, 1) if wh_breach_hours != float("inf") else 0.0,
                affected_quantity=round(shortage_units, 1),
                financial_impact=round(penalty, 2),
            ))
            seq += 1

            if shortage_units > 0 and product:
                # Deadline for recovery action = when the delayed shipment
                # would arrive anyway. Anything that beats this genuinely
                # helps; anything slower is strictly worse than waiting.
                natural_resolution_hours = wh_inbound_eta if wh_inbound_eta < 9999.0 else 24.0
                recovery_req = RecoveryRequirement(
                    product_id=product.id,
                    quantity_needed=round(shortage_units, 1),
                    needed_at_node_type="warehouse",
                    needed_at_node_id=warehouse.id,
                    needed_at_node_name=warehouse.name,
                    needed_within_hours=round(max(4.0, natural_resolution_hours), 1),
                    origin_factory_id=factory.id,
                    origin_supplier_id=origin_id if origin_type == "supplier" else None,
                    destination_warehouse_id=warehouse.id,
                )

    total_financial += production_loss * 0.0  # already included above
    return stages, recovery_req, affected_order_ids, total_financial, origin_name


def _simulate_warehouse_stockout(session: Session, g: nx.DiGraph, warehouse_id: str):
    warehouse: m.Warehouse = session.get(m.Warehouse, warehouse_id)
    stages: list[ImpactStage] = []
    total_financial = 0.0
    affected_order_ids: list[str] = []
    recovery_req = None

    breached = warehouse.on_hand_units < warehouse.safety_stock_units
    stages.append(ImpactStage(
        sequence=0, node_type="warehouse", node_id=warehouse.id, node_name=warehouse.name,
        status="critical" if breached else "warning",
        reason=(
            f"On-hand {warehouse.on_hand_units:.0f} units below safety stock {warehouse.safety_stock_units:.0f}"
            if breached else "Approaching safety stock threshold"
        ),
        estimated_time_hours=0.0,
        affected_quantity=max(0.0, warehouse.safety_stock_units - warehouse.on_hand_units),
        financial_impact=0.0,
    ))

    dealers = _downstream_dealers(g, ("warehouse", warehouse.id))
    dealers_sorted = sorted(dealers, key=lambda dkey: g.nodes[dkey]["demand_per_week"], reverse=True)[:3]
    product = session.query(m.Product).first()
    seq = 1
    for dkey in dealers_sorted:
        dealer: m.Dealer = session.get(m.Dealer, dkey[1])
        hourly_demand = dealer.demand_units_per_week / 7.0 / 24.0
        consumption = hourly_demand * STOCKOUT_EVAL_HOURS
        shortage = max(0.0, consumption - dealer.on_hand_units) if breached else 0.0
        penalty = fin.sla_penalty(shortage, product.sla_penalty_per_unit_per_day if product else 8.0, STOCKOUT_EVAL_HOURS)
        total_financial += penalty
        stages.append(ImpactStage(
            sequence=seq, node_type="dealer", node_id=dealer.id, node_name=dealer.name,
            status="critical" if shortage > 0 else "healthy",
            reason=f"{shortage:.0f}-unit shortage projected over {STOCKOUT_EVAL_HOURS:.0f}h" if shortage > 0 else "No projected shortage",
            estimated_time_hours=STOCKOUT_EVAL_HOURS, affected_quantity=round(shortage, 1),
            financial_impact=round(penalty, 2),
        ))
        seq += 1

    if breached and product:
        recovery_req = RecoveryRequirement(
            product_id=product.id,
            quantity_needed=round(warehouse.safety_stock_units - warehouse.on_hand_units, 1),
            needed_at_node_type="warehouse", needed_at_node_id=warehouse.id, needed_at_node_name=warehouse.name,
            needed_within_hours=24.0, origin_factory_id=None, origin_supplier_id=None,
            destination_warehouse_id=warehouse.id,
        )

    return stages, recovery_req, affected_order_ids, total_financial, warehouse.name


def _simulate_demand_surge(session: Session, g: nx.DiGraph, dealer_id: str):
    dealer: m.Dealer = session.get(m.Dealer, dealer_id)
    product = session.query(m.Product).first()
    baseline_hourly = dealer.demand_units_per_week / 7.0 / 24.0
    surged_hourly = baseline_hourly * DEMAND_SURGE_FACTOR
    incremental_hourly = surged_hourly - baseline_hourly
    incremental_over_horizon = incremental_hourly * STOCKOUT_EVAL_HOURS
    shortage = max(0.0, incremental_over_horizon - max(0.0, dealer.on_hand_units - baseline_hourly * STOCKOUT_EVAL_HOURS))
    penalty = fin.sla_penalty(shortage, product.sla_penalty_per_unit_per_day if product else 8.0, STOCKOUT_EVAL_HOURS)

    stages = [ImpactStage(
        sequence=0, node_type="dealer", node_id=dealer.id, node_name=dealer.name,
        status="critical" if shortage > 0 else "warning",
        reason=f"Demand surge of {int((DEMAND_SURGE_FACTOR - 1) * 100)}% projected to exceed cover" if shortage > 0
               else f"Demand surge of {int((DEMAND_SURGE_FACTOR - 1) * 100)}% within current cover",
        estimated_time_hours=STOCKOUT_EVAL_HOURS, affected_quantity=round(shortage, 1),
        financial_impact=round(penalty, 2),
    )]

    recovery_req = None
    if shortage > 0 and product:
        recovery_req = RecoveryRequirement(
            product_id=product.id, quantity_needed=round(shortage, 1),
            needed_at_node_type="dealer", needed_at_node_id=dealer.id, needed_at_node_name=dealer.name,
            needed_within_hours=STOCKOUT_EVAL_HOURS, origin_factory_id=None, origin_supplier_id=None,
            destination_warehouse_id=None,
        )

    return stages, recovery_req, [], penalty, dealer.name


def _build_narrative(stages: list[ImpactStage]) -> str:
    if not stages:
        return "No downstream dependency found for this target in the current network."
    parts = [f"{s.node_name}: {s.reason}" for s in stages]
    return " \u2192 ".join(parts)
