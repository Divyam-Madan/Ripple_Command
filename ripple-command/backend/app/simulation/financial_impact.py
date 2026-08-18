"""Financial translation of physical impact. Kept as small pure functions so
each term is independently testable and auditable."""
from __future__ import annotations


def production_loss_value(affected_output_units: float, contribution_margin_per_unit: float) -> float:
    return max(0.0, affected_output_units) * max(0.0, contribution_margin_per_unit)


def sla_penalty(shortage_units: float, penalty_per_unit_per_day: float, shortage_duration_hours: float) -> float:
    days = max(0.0, shortage_duration_hours) / 24.0
    return max(0.0, shortage_units) * max(0.0, penalty_per_unit_per_day) * days


def expedited_logistics_cost(quantity: float, standard_cost_per_unit: float, air_cost_per_unit: float) -> float:
    premium = max(0.0, air_cost_per_unit - standard_cost_per_unit)
    return max(0.0, quantity) * premium


def total_gross_exposure(*components: float) -> float:
    return float(sum(max(0.0, c) for c in components))
