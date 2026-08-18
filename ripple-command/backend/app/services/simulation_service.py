from __future__ import annotations

import dataclasses

from sqlalchemy.orm import Session

from app.db import models as m
from app.services.health_score import compute_supply_chain_health
from app.simulation.engine import run_simulation


def simulate_and_persist(
    session: Session, disruption_type: str, target_type: str, target_id: str, delay_hours: float,
) -> dict:
    health = compute_supply_chain_health(session)

    disruption = m.Disruption(
        type=disruption_type, target_type=target_type, target_id=target_id,
        delay_hours=delay_hours, status="simulated",
        description=f"{disruption_type.replace('_', ' ').title()} on {target_type} {target_id}",
    )
    session.add(disruption)
    session.flush()

    result = run_simulation(session, disruption_type, target_type, target_id, delay_hours, health["score"])
    disruption.severity = result.severity

    run = m.SimulationRun(
        disruption_id=disruption.id,
        params_json={"disruption_type": disruption_type, "target_type": target_type,
                     "target_id": target_id, "delay_hours": delay_hours},
        status="completed",
        supply_chain_health_before=result.health_before,
        supply_chain_health_after=result.health_after,
        total_financial_exposure=result.total_financial_exposure,
        recovery_requirement_json=dataclasses.asdict(result.recovery_requirement) if result.recovery_requirement else {},
        narrative_summary=result.narrative_summary,
    )
    session.add(run)
    session.flush()

    impacts_out = []
    for stage in result.impact_chain:
        impact = m.SimulationImpact(
            simulation_run_id=run.id, sequence=stage.sequence, node_type=stage.node_type,
            node_id=stage.node_id, node_name=stage.node_name, status=stage.status,
            reason=stage.reason, estimated_time_hours=stage.estimated_time_hours,
            affected_quantity=stage.affected_quantity, financial_impact=stage.financial_impact,
        )
        session.add(impact)
        impacts_out.append(stage)

        if stage.status == "critical":
            session.add(m.Alert(
                severity="critical" if stage.financial_impact > 50_000 else "high",
                source_type=stage.node_type, source_id=stage.node_id,
                message=f"{stage.node_name}: {stage.reason}",
                impact_summary=f"Qty affected: {stage.affected_quantity:.0f}. Financial impact: \u20b9{stage.financial_impact:,.0f}",
                recommended_action="Run recovery optimization for feasible interventions.",
                simulation_run_id=run.id,
            ))

    session.flush()

    return {
        "simulation_run_id": run.id,
        "disruption_id": disruption.id,
        "disruption_type": disruption_type,
        "target_type": target_type,
        "target_id": target_id,
        "target_name": result.target_name,
        "delay_hours": delay_hours,
        "severity": result.severity,
        "health_before": result.health_before,
        "health_after": result.health_after,
        "total_financial_exposure": result.total_financial_exposure,
        "impact_chain": [dataclasses.asdict(s) for s in result.impact_chain],
        "affected_order_ids": result.affected_order_ids,
        "recovery_requirement": dataclasses.asdict(result.recovery_requirement) if result.recovery_requirement else None,
        "narrative_summary": result.narrative_summary,
    }


def get_simulation(session: Session, simulation_run_id: str) -> dict | None:
    run = session.get(m.SimulationRun, simulation_run_id)
    if not run:
        return None
    disruption = session.get(m.Disruption, run.disruption_id)
    impacts = (
        session.query(m.SimulationImpact)
        .filter(m.SimulationImpact.simulation_run_id == run.id)
        .order_by(m.SimulationImpact.sequence)
        .all()
    )
    return {
        "simulation_run_id": run.id,
        "disruption_id": run.disruption_id,
        "disruption_type": disruption.type if disruption else "",
        "target_type": disruption.target_type if disruption else "",
        "target_id": disruption.target_id if disruption else "",
        "delay_hours": disruption.delay_hours if disruption else 0.0,
        "severity": disruption.severity if disruption else "",
        "health_before": run.supply_chain_health_before,
        "health_after": run.supply_chain_health_after,
        "total_financial_exposure": run.total_financial_exposure,
        "impact_chain": [
            {
                "sequence": i.sequence, "node_type": i.node_type, "node_id": i.node_id,
                "node_name": i.node_name, "status": i.status, "reason": i.reason,
                "estimated_time_hours": i.estimated_time_hours, "affected_quantity": i.affected_quantity,
                "financial_impact": i.financial_impact,
            }
            for i in impacts
        ],
        "recovery_requirement": run.recovery_requirement_json or None,
        "narrative_summary": run.narrative_summary,
    }
