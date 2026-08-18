from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import models as m
from app.optimization.recovery_strategies import generate_candidates
from app.optimization.solver import optimize_recovery, RecoveryOptionResult
from app.simulation.engine import RecoveryRequirement


def _reasons_for(
    recommended: RecoveryOptionResult, req: RecoveryRequirement, all_options: list[RecoveryOptionResult],
) -> list[str]:
    reasons: list[str] = []
    if recommended.recovered_quantity >= req.quantity_needed * 0.99:
        reasons.append(f"Recovers the full projected shortfall of {req.quantity_needed:.0f} units at {req.needed_at_node_name}")
    else:
        reasons.append(f"Recovers {recommended.recovered_quantity:.0f} of the {req.quantity_needed:.0f} units required")
    if recommended.eta_hours <= req.needed_within_hours:
        reasons.append(f"Arrives in {recommended.eta_hours:.1f}h, ahead of the {req.needed_within_hours:.1f}h window before natural resolution")
    expedite = next((o for o in all_options if o.type == "expedite_shipment" and o is not recommended), None)
    if expedite and expedite.feasible and recommended.cost < expedite.cost:
        savings = expedite.cost - recommended.cost
        reasons.append(f"Costs \u20b9{savings:,.0f} less than expedited air freight")
    if recommended.remaining_risk_score <= 15:
        reasons.append("Reduces remaining risk to a low residual level")
    if recommended.type == "alternate_supplier":
        reasons.append("Preserves production continuity without waiting on the delayed primary supplier")
    if recommended.type == "warehouse_reallocation":
        reasons.append("Uses inventory already inside the network instead of new procurement spend")
    return reasons


def optimize_and_persist(session: Session, simulation_run_id: str) -> dict | None:
    run = session.get(m.SimulationRun, simulation_run_id)
    if not run or not run.recovery_requirement_json:
        return None

    req = RecoveryRequirement(**run.recovery_requirement_json)
    candidates = generate_candidates(session, req)
    options = optimize_recovery(candidates, req, run.total_financial_exposure)

    recommended = next((o for o in options if o.is_recommended), None)
    reasons: list[str] = []

    # Idempotent: re-optimizing the same run replaces prior options rather
    # than accumulating duplicates across repeated copilot/API calls.
    session.query(m.Recommendation).filter(m.Recommendation.simulation_run_id == run.id).delete()
    session.query(m.RecoveryOption).filter(m.RecoveryOption.simulation_run_id == run.id).delete()
    session.flush()

    persisted = []
    recommended_option_row = None
    for o in options:
        row = m.RecoveryOption(
            simulation_run_id=run.id, type=o.type, description=o.description, cost=o.cost,
            eta_hours=o.eta_hours, feasible=o.feasible, recovered_quantity=o.recovered_quantity,
            remaining_risk_score=o.remaining_risk_score, expected_savings=o.expected_savings,
            total_expected_cost=o.cost, is_recommended=o.is_recommended,
        )
        session.add(row)
        session.flush()
        persisted.append(row)
        if o.is_recommended:
            recommended_option_row = row

    if recommended and recommended_option_row:
        reasons = _reasons_for(recommended, req, options)
        session.add(m.Recommendation(
            simulation_run_id=run.id, recovery_option_id=recommended_option_row.id, reasons_json=reasons,
        ))

    session.flush()

    return {
        "simulation_run_id": run.id,
        "recovery_requirement": run.recovery_requirement_json,
        "options": [
            {
                "id": persisted[i].id, "type": o.type, "description": o.description, "cost": o.cost,
                "eta_hours": o.eta_hours, "feasible": o.feasible, "recovered_quantity": o.recovered_quantity,
                "remaining_risk_score": o.remaining_risk_score, "expected_savings": o.expected_savings,
                "is_recommended": o.is_recommended, "source_label": o.source_label,
            }
            for i, o in enumerate(options)
        ],
        "recommended_reasons": reasons,
    }


def get_recovery_options(session: Session, simulation_run_id: str) -> dict | None:
    run = session.get(m.SimulationRun, simulation_run_id)
    if not run:
        return None
    options = (
        session.query(m.RecoveryOption)
        .filter(m.RecoveryOption.simulation_run_id == simulation_run_id)
        .all()
    )
    reco = (
        session.query(m.Recommendation)
        .filter(m.Recommendation.simulation_run_id == simulation_run_id)
        .first()
    )
    return {
        "simulation_run_id": simulation_run_id,
        "options": [
            {
                "id": o.id, "type": o.type, "description": o.description, "cost": o.cost,
                "eta_hours": o.eta_hours, "feasible": o.feasible, "recovered_quantity": o.recovered_quantity,
                "remaining_risk_score": o.remaining_risk_score, "expected_savings": o.expected_savings,
                "is_recommended": o.is_recommended,
            }
            for o in options
        ],
        "recommended_reasons": reco.reasons_json if reco else [],
    }
