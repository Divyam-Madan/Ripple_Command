from app.db import models as m
from app.services.health_score import compute_supply_chain_health
from app.simulation.engine import run_simulation


def _s3(db_session):
    return db_session.query(m.Supplier).filter(m.Supplier.name.like("S3 %")).first()


def test_flagship_scenario_produces_full_cascade(db_session):
    health = compute_supply_chain_health(db_session)
    s3 = _s3(db_session)
    result = run_simulation(db_session, "supplier_delay", "supplier", s3.id, 12.0, health["score"])
    node_types = [s.node_type for s in result.impact_chain]
    assert "supplier" in node_types
    assert "factory" in node_types
    assert "warehouse" in node_types
    assert "dealer" in node_types
    assert result.total_financial_exposure > 0
    assert result.recovery_requirement is not None
    assert result.recovery_requirement.quantity_needed > 0


def test_zero_delay_produces_smaller_shortage_than_severe_delay(db_session):
    health = compute_supply_chain_health(db_session)
    s3 = _s3(db_session)
    result_0h = run_simulation(db_session, "supplier_delay", "supplier", s3.id, 0.0, health["score"])
    result_24h = run_simulation(db_session, "supplier_delay", "supplier", s3.id, 24.0, health["score"])

    def _dealer_shortage(result):
        stages = [s for s in result.impact_chain if s.node_type == "dealer"]
        return stages[0].affected_quantity if stages else 0.0

    # The network's own tight buffers can produce a baseline shortage even at
    # zero added delay - what matters is that adding real delay makes it
    # strictly worse, not that zero delay is magically shortage-free.
    assert _dealer_shortage(result_24h) > _dealer_shortage(result_0h)
    assert result_24h.total_financial_exposure > result_0h.total_financial_exposure


def test_delay_monotonically_increases_exposure(db_session):
    health = compute_supply_chain_health(db_session)
    s3 = _s3(db_session)
    exposures = []
    for delay in [0, 6, 12, 24]:
        result = run_simulation(db_session, "supplier_delay", "supplier", s3.id, float(delay), health["score"])
        exposures.append(result.total_financial_exposure)
    assert exposures == sorted(exposures)
