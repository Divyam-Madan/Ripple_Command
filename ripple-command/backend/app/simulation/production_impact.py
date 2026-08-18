"""Production-side impact of a raw-material or component shortage at a factory."""
from __future__ import annotations


def downtime_hours(resupply_gap_hours: float, evaluation_horizon_hours: float) -> float:
    """Downtime is bounded by how far out we're evaluating the scenario."""
    return max(0.0, min(resupply_gap_hours, evaluation_horizon_hours))


def affected_output_units(
    downtime_hrs: float, production_rate_units_per_day: float, num_production_lines: int,
    lines_affected: int = 1,
) -> float:
    if num_production_lines <= 0:
        num_production_lines = 1
    hourly_rate = production_rate_units_per_day / 24.0
    share = min(1.0, lines_affected / num_production_lines)
    return downtime_hrs * hourly_rate * share


def affected_line_index(factory_id: str, num_lines: int) -> int:
    """Deterministic (not random-per-run) pick of which line takes the hit,
    for narrative clarity in the impact chain - the downtime math itself does
    not depend on which line number is displayed."""
    if num_lines <= 0:
        return 1
    return (abs(hash(factory_id)) % num_lines) + 1
