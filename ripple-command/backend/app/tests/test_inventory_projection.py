import math

from app.simulation import inventory_projection as inv


def test_hours_to_breach_basic():
    assert inv.hours_to_breach(100, 10) == 10


def test_hours_to_breach_zero_consumption_is_infinite():
    assert math.isinf(inv.hours_to_breach(100, 0))


def test_resupply_gap_hours_no_gap_when_early():
    assert inv.resupply_gap_hours(breach_hours=10, inbound_eta_hours=5) == 0


def test_resupply_gap_hours_positive_when_late():
    assert inv.resupply_gap_hours(breach_hours=5, inbound_eta_hours=12) == 7


def test_safety_stock_breached():
    assert inv.safety_stock_breached(projected_units=50, safety_stock=100) is True
    assert inv.safety_stock_breached(projected_units=150, safety_stock=100) is False
