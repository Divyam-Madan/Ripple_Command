import pytest
from app.engines.inventory import project_inventory, hours_to_stockout, safety_stock_breach
from app.engines.financial import calculate_production_loss, calculate_sla_penalty

def test_inventory_projection_depletes_correctly():
    result = project_inventory(current=1000, consumption_rate_per_hour=50, delay_hours=12)
    assert result == 400.0

def test_inventory_projection_never_negative():
    result = project_inventory(current=100, consumption_rate_per_hour=50, delay_hours=10)
    assert result == 0.0

def test_hours_to_stockout():
    h = hours_to_stockout(current=500, consumption_rate_per_hour=50)
    assert h == 10.0

def test_hours_to_stockout_zero_consumption():
    h = hours_to_stockout(current=500, consumption_rate_per_hour=0)
    assert h == float('inf')

def test_safety_stock_breach_detected():
    breach = safety_stock_breach(current=400, safety_stock=500, consumption_rate=50, delay_hours=5)
    assert breach == True

def test_production_loss_calculation():
    loss = calculate_production_loss(downtime_hours=3, production_rate_per_hour=45, margin_per_unit=8000)
    assert loss == 1_080_000.0

def test_sla_penalty():
    penalty = calculate_sla_penalty(delay_hours=24, sla_penalty_per_day=50000)
    assert penalty == 50000.0

def test_sla_penalty_partial_day():
    penalty = calculate_sla_penalty(delay_hours=12, sla_penalty_per_day=50000)
    assert penalty == 25000.0
