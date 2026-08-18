from app.db import models as m
from app.optimization.recovery_strategies import generate_candidates
from app.optimization.solver import optimize_recovery
from app.services.health_score import compute_supply_chain_health
from app.simulation.engine import run_simulation


def test_optimizer_selects_one_feasible_recommendation(db_session):
    health = compute_supply_chain_health(db_session)
    s3 = db_session.query(m.Supplier).filter(m.Supplier.name.like("S3 %")).first()
    result = run_simulation(db_session, "supplier_delay", "supplier", s3.id, 12.0, health["score"])
    assert result.recovery_requirement is not None

    candidates = generate_candidates(db_session, result.recovery_requirement)
    options = optimize_recovery(candidates, result.recovery_requirement, result.total_financial_exposure)

    recommended = [o for o in options if o.is_recommended]
    assert len(recommended) == 1
    assert recommended[0].feasible is True

    # The recommendation must be the cheapest FEASIBLE option, not just the
    # cheapest option overall (do_nothing is always cheapest but infeasible).
    feasible_costs = [o.cost for o in options if o.feasible]
    assert recommended[0].cost == min(feasible_costs)


def test_do_nothing_option_always_present_and_never_recommended(db_session):
    health = compute_supply_chain_health(db_session)
    s3 = db_session.query(m.Supplier).filter(m.Supplier.name.like("S3 %")).first()
    result = run_simulation(db_session, "supplier_delay", "supplier", s3.id, 12.0, health["score"])
    candidates = generate_candidates(db_session, result.recovery_requirement)
    options = optimize_recovery(candidates, result.recovery_requirement, result.total_financial_exposure)
    do_nothing = [o for o in options if o.type == "do_nothing"]
    assert len(do_nothing) == 1
    assert do_nothing[0].is_recommended is False
