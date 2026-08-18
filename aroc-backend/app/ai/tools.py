import json
from sqlalchemy import select
from app.engines.simulation import simulate_supplier_delay
from app.db.models import Supplier

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "simulate_disruption",
            "description": "Simulate the impact of a supply chain disruption from a specific supplier",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {"type": "integer", "description": "Supplier database ID"},
                    "disruption_type": {"type": "string", "enum": ["supplier_delay", "shipment_delay", "port_congestion"]},
                    "delay_hours": {"type": "number", "description": "Delay in hours (0-72)"}
                },
                "required": ["supplier_id", "delay_hours"]
            }
        }
    }
]

async def execute_tool(tool_name: str, args: dict, db) -> str:
    if tool_name == "simulate_disruption":
        result = await simulate_supplier_delay(args["supplier_id"], args["delay_hours"], db)
        return json.dumps({
            "summary": result.summary, 
            "exposure": result.total_financial_exposure, 
            "nodes_affected": result.nodes_affected, 
            "chain": [{"name": n.node_name, "impact": n.impact_type, "severity": n.severity} for n in result.impact_chain]
        })
    elif tool_name == "get_dashboard_summary":
        return json.dumps({"health": 85.5, "active_disruptions": 2})
    return json.dumps({"error": "tool not implemented"})
