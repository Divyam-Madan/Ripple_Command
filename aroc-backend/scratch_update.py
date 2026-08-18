from app.engines.financial import calculate_production_loss

# Ensure correct calculation fix
def calculate_production_loss_fixed(downtime_hours: float, production_rate_per_hour: float, margin_per_unit: float) -> float:
    return downtime_hours * production_rate_per_hour * margin_per_unit
