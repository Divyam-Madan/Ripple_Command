from ortools.sat.python import cp_model
from typing import List
from app.engines.simulation import SimulationResult

def optimize_recovery(sim_result: SimulationResult, available_capacity: dict = None) -> List[dict]:
    exposure = sim_result.total_financial_exposure
    delay = sim_result.delay_hours
    
    options = []
    
    air_cost = exposure * 0.35
    air_eta_improvement = delay * 0.75
    options.append({
        "option_type": "expedite",
        "name": "Expedite Air Freight",
        "description": f"Reroute shipment via air freight. Recovers {air_eta_improvement:.1f}h of the {delay:.0f}h delay.",
        "cost": round(air_cost, 0),
        "lead_time_improvement_hours": air_eta_improvement,
        "recovery_quality_pct": 85,
        "remaining_risk_pct": 15,
        "expected_savings": round(exposure - air_cost, 0),
        "feasible": True,
        "recommended": False,
    })
    
    alt_cost = exposure * 0.22
    alt_eta = delay * 0.5
    options.append({
        "option_type": "alternate_supplier",
        "name": "Activate Alternate Supplier",
        "description": f"Redirect order to nearest alternate supplier with spare capacity. ETA improvement: {alt_eta:.1f}h.",
        "cost": round(alt_cost, 0),
        "lead_time_improvement_hours": alt_eta,
        "recovery_quality_pct": 78,
        "remaining_risk_pct": 22,
        "expected_savings": round(exposure - alt_cost, 0),
        "feasible": True,
        "recommended": False,
    })
    
    realloc_feasible = (sim_result.stockout_hours or 99) > 8
    realloc_cost = exposure * 0.12
    options.append({
        "option_type": "warehouse_reallocation",
        "name": "Warehouse Inventory Reallocation",
        "description": "Pull buffer stock from nearest surplus warehouse to bridge the supply gap.",
        "cost": round(realloc_cost, 0),
        "lead_time_improvement_hours": delay * 0.3,
        "recovery_quality_pct": 62,
        "remaining_risk_pct": 38,
        "expected_savings": round(exposure - realloc_cost, 0),
        "feasible": realloc_feasible,
        "recommended": False,
    })
    
    options.append({
        "option_type": "do_nothing",
        "name": "Accept Delay (Do Nothing)",
        "description": "Accept the delay and absorb downstream impact. Full financial exposure realized.",
        "cost": round(exposure, 0),
        "lead_time_improvement_hours": 0,
        "recovery_quality_pct": 0,
        "remaining_risk_pct": 100,
        "expected_savings": 0,
        "feasible": True,
        "recommended": False,
    })
    
    model = cp_model.CpModel()
    feasible_options = [o for o in options if o["feasible"]]
    
    if feasible_options:
        scaled_costs = [int(o["cost"]) for o in feasible_options]
        vars_list = [model.new_bool_var(f"opt_{i}") for i in range(len(feasible_options))]
        
        model.add_exactly_one(vars_list)
        
        recoveries = [v for v, o in zip(vars_list, feasible_options) if o["option_type"] != "do_nothing"]
        if recoveries:
            model.add(sum(recoveries) >= 1)
        
        model.minimize(sum(v * c for v, c in zip(vars_list, scaled_costs)))
        
        solver = cp_model.CpSolver()
        status = solver.solve(model)
        
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            best_idx = next((i for i, v in enumerate(vars_list) if solver.value(v) == 1), 0)
            rec_option = feasible_options[best_idx]
            if rec_option["option_type"] == "do_nothing" and len(feasible_options) > 1:
                non_dn = [o for o in feasible_options if o["option_type"] != "do_nothing"]
                if non_dn:
                    rec_option = min(non_dn, key=lambda x: x["cost"])
            rec_option["recommended"] = True
        else:
            non_dn = [o for o in feasible_options if o["option_type"] != "do_nothing"]
            if non_dn:
                min(non_dn, key=lambda x: x["cost"])["recommended"] = True
    
    return options
