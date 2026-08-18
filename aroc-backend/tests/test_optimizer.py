from app.engines.optimizer import optimize_recovery
from app.engines.simulation import SimulationResult, ImpactNode

def make_sim_result(exposure=5_000_000, delay=12, stockout=8):
    return SimulationResult(
        simulation_run_id=None, supplier_id=3, supplier_name="Test",
        disruption_type="supplier_delay", delay_hours=delay,
        impact_chain=[], total_financial_exposure=exposure,
        nodes_affected=4, shipments_affected=3,
        stockout_hours=stockout, production_at_risk=True, summary="test"
    )

def test_optimizer_returns_four_options():
    result = optimize_recovery(make_sim_result())
    assert len(result) == 4

def test_optimizer_marks_exactly_one_recommended():
    result = optimize_recovery(make_sim_result())
    recommended = [o for o in result if o["recommended"]]
    assert len(recommended) == 1

def test_do_nothing_not_recommended_when_alternatives_exist():
    result = optimize_recovery(make_sim_result())
    recommended = next(o for o in result if o["recommended"])
    assert recommended["option_type"] != "do_nothing"

def test_do_nothing_has_highest_cost():
    result = optimize_recovery(make_sim_result(exposure=5_000_000))
    dn = next(o for o in result if o["option_type"] == "do_nothing")
    assert dn["cost"] >= max(o["cost"] for o in result if o["option_type"] != "do_nothing")
