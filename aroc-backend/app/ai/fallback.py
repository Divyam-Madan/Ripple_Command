from sqlalchemy import select
from app.engines.simulation import simulate_supplier_delay
from app.engines.health_score import calculate_health_score
from app.db.models import Supplier

async def fallback_response(user_message: str, db) -> dict:
    msg_lower = user_message.lower()
    
    if "s3" in msg_lower or "motherson" in msg_lower or "delay" in msg_lower:
        import re
        match = re.search(r'(\d+)\s*h', msg_lower)
        delay = float(match.group(1)) if match else 12.0
        
        sup_q = await db.execute(select(Supplier).where(Supplier.code == "S03"))
        supplier = sup_q.scalar_one_or_none()
        if supplier:
            result = await simulate_supplier_delay(supplier.id, delay, db)
            return {
                "role": "assistant",
                "content": f"Based on simulation results:\n\n**{result.supplier_name}** delayed by **{delay:.0f} hours** would create a cascade affecting **{result.nodes_affected} network nodes**:\n\n" + "\n".join([f"- **{n.node_name}** ({n.node_type}): {n.reason}" for n in result.impact_chain[:5]]) + f"\n\n**Total financial exposure: ₹{result.total_financial_exposure:,.0f}**\n\n_Fallback mode active: data sourced from simulation engine._",
                "tool_calls_made": ["simulate_disruption"],
                "fallback_mode": True
            }
    
    health = await calculate_health_score(db)
    return {
        "role": "assistant",
        "content": f"Current supply chain health score is **{health}**. I can answer questions about disruptions, supplier risk, shipment status, and recovery options. Try asking: 'What happens if S3 is delayed 12 hours?'",
        "tool_calls_made": ["get_dashboard_summary"],
        "fallback_mode": True
    }
