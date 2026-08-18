def calculate_production_loss(downtime_hours: float, production_rate_per_hour: float, margin_per_unit: float) -> float:
    return downtime_hours * production_rate_per_hour * margin_per_unit

def calculate_sla_penalty(delay_hours: float, sla_penalty_per_day: float) -> float:
    return (delay_hours / 24.0) * sla_penalty_per_day

def calculate_expedite_cost(quantity: float, distance_km: float, mode: str = "air") -> float:
    base_rates = {"air": 0.12, "road": 0.04, "rail": 0.025, "sea": 0.008}
    return quantity * distance_km * base_rates.get(mode, 0.12)

def calculate_total_exposure(production_loss: float, sla_penalty: float, logistics_cost: float = 0) -> float:
    return production_loss + sla_penalty + logistics_cost
