from app.services.health_score import compute_supply_chain_health


def test_health_score_in_range(db_session):
    health = compute_supply_chain_health(db_session)
    assert 0 <= health["score"] <= 100
    for v in health["components"].values():
        assert 0 <= v <= 100


def test_health_score_weights_sum_to_one():
    from app.services.health_score import WEIGHTS
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9
