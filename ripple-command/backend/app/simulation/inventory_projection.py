"""
Deterministic inventory math. Every function here is pure and unit-tested;
nothing in this module reads a database or invents a number - callers supply
real seeded/derived quantities and get real projections back.

Core identity (per product spec):
    Projected Inventory(t) = Current Inventory + Expected Inbound - Expected Consumption
"""
from __future__ import annotations

import math


def hours_to_breach(current_units: float, consumption_per_hour: float) -> float:
    """Hours until `current_units` is exhausted at a constant consumption rate,
    assuming zero further inbound. Returns inf if consumption is non-positive."""
    if consumption_per_hour <= 0:
        return math.inf
    return max(0.0, current_units / consumption_per_hour)


def projected_inventory(current_units: float, expected_inbound: float, expected_consumption: float) -> float:
    return current_units + expected_inbound - expected_consumption


def resupply_gap_hours(breach_hours: float, inbound_eta_hours: float) -> float:
    """If resupply arrives after the breach point, returns the shortage window
    (hours the node runs dry before resupply lands). 0 if resupply is on time."""
    if math.isinf(breach_hours):
        return 0.0
    return max(0.0, inbound_eta_hours - breach_hours)


def safety_stock_breached(projected_units: float, safety_stock: float) -> bool:
    return projected_units < safety_stock
