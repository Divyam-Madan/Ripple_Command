from app.simulation import financial_impact as fin


def test_production_loss_value():
    assert fin.production_loss_value(10, 100) == 1000
    assert fin.production_loss_value(-5, 100) == 0  # never negative


def test_sla_penalty_scales_with_duration():
    p1 = fin.sla_penalty(100, 10, 24)  # 1 day
    p2 = fin.sla_penalty(100, 10, 48)  # 2 days
    assert p2 == 2 * p1


def test_total_gross_exposure_ignores_negatives():
    assert fin.total_gross_exposure(100, -50, 25) == 125
