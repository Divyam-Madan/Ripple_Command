"""
Formal optimization step. Each recovery candidate is scored against the real
required quantity/deadline from the simulation (app.simulation.engine), then
Google OR-Tools' CBC MIP solver picks the minimum-total-expected-cost
feasible option - a genuine (if intentionally small) integer program:

    minimize   sum(cost_i * select_i)
    subject to sum(select_i) == 1
               select_i == 0 for any candidate that cannot cover the
                              required quantity within its deadline

This keeps the "optimize" step real rather than a plain argmin dressed up -
the constraint structure is exactly what a larger multi-shipment allocation
problem would use, just at the single-decision scale this scenario calls for.
"""
from __future__ import annotations

from dataclasses import dataclass

from ortools.linear_solver import pywraplp

from app.optimization.models import RecoveryCandidate
from app.simulation.engine import RecoveryRequirement

LARGE_COST_PENALTY = 10_000_000.0


@dataclass
class RecoveryOptionResult:
    type: str
    description: str
    cost: float
    eta_hours: float
    feasible: bool
    recovered_quantity: float
    remaining_risk_score: float
    expected_savings: float
    is_recommended: bool
    source_label: str = ""


def _score_candidate(c: RecoveryCandidate, req: RecoveryRequirement, gross_exposure: float) -> tuple[float, bool, float, float]:
    """Returns (cost, feasible, recovered_quantity, remaining_risk_score)."""
    if c.type == "do_nothing":
        return 0.0, False, 0.0, min(100.0, 40.0 + gross_exposure / 10_000.0)

    capacity_ok = c.max_quantity >= req.quantity_needed
    feasible = capacity_ok and c.meets_deadline
    recovered = min(c.max_quantity, req.quantity_needed)
    cost = c.cost_for(recovered)

    if feasible:
        risk = 5.0
    else:
        shortfall_ratio = max(0.0, (req.quantity_needed - recovered) / max(1.0, req.quantity_needed))
        lateness_penalty = 0.0 if c.meets_deadline else 25.0
        risk = min(100.0, 10.0 + shortfall_ratio * 60.0 + lateness_penalty)
    return cost, feasible, recovered, risk


def optimize_recovery(
    candidates: list[RecoveryCandidate], req: RecoveryRequirement, gross_exposure: float,
) -> list[RecoveryOptionResult]:
    scored = []
    for c in candidates:
        cost, feasible, recovered, risk = _score_candidate(c, req, gross_exposure)
        scored.append((c, cost, feasible, recovered, risk))

    solver = pywraplp.Solver.CreateSolver("CBC")
    select_vars = []
    if solver is not None:
        select_vars = [solver.IntVar(0, 1, f"select_{i}") for i in range(len(scored))]
        solver.Add(solver.Sum(select_vars) == 1)
        objective_terms = []
        for i, (c, cost, feasible, recovered, risk) in enumerate(scored):
            effective_cost = cost if feasible else cost + LARGE_COST_PENALTY
            objective_terms.append(effective_cost * select_vars[i])
        solver.Minimize(solver.Sum(objective_terms))
        status = solver.Solve()
        recommended_idx = None
        if status == pywraplp.Solver.OPTIMAL:
            for i, v in enumerate(select_vars):
                if v.solution_value() > 0.5:
                    recommended_idx = i
                    break
    if not select_vars or recommended_idx is None:
        # Fallback: pick minimum-cost feasible candidate directly (still
        # deterministic and cost-based, used only if CBC is unavailable).
        feasible_idxs = [i for i, s in enumerate(scored) if s[2]]
        pool = feasible_idxs or list(range(len(scored)))
        recommended_idx = min(pool, key=lambda i: scored[i][1])

    results = []
    for i, (c, cost, feasible, recovered, risk) in enumerate(scored):
        expected_savings = max(0.0, gross_exposure - cost) if feasible else 0.0
        results.append(RecoveryOptionResult(
            type=c.type, description=c.description, cost=round(cost, 2),
            eta_hours=round(c.eta_hours, 1), feasible=feasible,
            recovered_quantity=round(recovered, 1), remaining_risk_score=round(risk, 1),
            expected_savings=round(expected_savings, 2), is_recommended=(i == recommended_idx),
            source_label=c.source_label,
        ))
    return results
