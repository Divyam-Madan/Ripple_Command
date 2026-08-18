def project_inventory(current: float, consumption_rate_per_hour: float, delay_hours: float) -> float:
    return max(0.0, current - (consumption_rate_per_hour * delay_hours))

def hours_to_stockout(current: float, consumption_rate_per_hour: float) -> float:
    if consumption_rate_per_hour <= 0:
        return float('inf')
    return current / consumption_rate_per_hour

def safety_stock_breach(current: float, safety_stock: float, consumption_rate: float, delay_hours: float) -> bool:
    projected = project_inventory(current, consumption_rate, delay_hours)
    return projected < safety_stock
