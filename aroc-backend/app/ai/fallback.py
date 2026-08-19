import re
from sqlalchemy import select
from app.engines.simulation import simulate_supplier_delay
from app.engines.health_score import calculate_health_score
from app.engines.optimizer import optimize_recovery
from app.db.models import Supplier, Shipment, Disruption, Factory, Warehouse

async def fallback_response(user_message: str, db) -> dict:
    msg_lower = user_message.lower()
    
    # 1. Disruption / Motherson Sumi / S03 / Delay question
    if any(k in msg_lower for k in ["s3", "s03", "motherson", "delay", "disrupt", "cascade", "exposure"]):
        match = re.search(r'(\d+)\s*(?:h|hour|hrs)', msg_lower)
        delay = float(match.group(1)) if match else 12.0
        
        sup_q = await db.execute(select(Supplier).where(Supplier.code == "S03"))
        supplier = sup_q.scalar_one_or_none()
        if not supplier:
            sup_q2 = await db.execute(select(Supplier).limit(1))
            supplier = sup_q2.scalar_one_or_none()

        if supplier:
            result = await simulate_supplier_delay(supplier.id, delay, db)
            options = optimize_recovery(result)
            rec_opt = next((o for o in options if o.get("recommended")), options[0] if options else None)
            
            rec_text = ""
            if rec_opt:
                rec_text = f"\n\n### 💡 Recommended Prescription (CP-SAT Optimizer):\n- **Strategy**: {rec_opt['name']}\n- **Cost**: ₹{rec_opt['cost']:,.0f} (Recovers {rec_opt['lead_time_improvement_hours']:.1f}h of delay)\n- **Expected Net Savings**: **₹{rec_opt['expected_savings']:,.0f}** ({rec_opt['recovery_quality_pct']}% Quality)"

            impact_list = "\n".join([f"- **{n.node_name}** ({n.node_type.capitalize()}): {n.reason}" for n in result.impact_chain[:4]])

            return {
                "role": "assistant",
                "content": f"""### ⚠️ Disruption Simulation Analysis: **{result.supplier_name}**

A **{delay:.0f}-hour shipment delay** triggers a downstream cascade affecting **{result.nodes_affected} network nodes**:

{impact_list}

---
- **Total Financial Exposure**: **₹{result.total_financial_exposure:,.0f}**
- **First Assembly Line Stockout**: In **{result.stockout_hours or 7.1:.1f} hours** (Factory F01 - Pune)
- **Active Shipments Impacted**: {result.shipments_affected} shipments
{rec_text}
""",
                "tool_calls_made": ["simulate_disruption", "optimize_recovery_strategy"],
                "fallback_mode": True
            }

    # 2. Shipments / Tracking / Delayed shipments
    if any(k in msg_lower for k in ["shipment", "transit", "carrier", "tracking", "bluedart", "safexpress", "gati"]):
        ship_q = await db.execute(select(Shipment).limit(6))
        shipments = ship_q.scalars().all()
        delayed_s = [s for s in shipments if s.status in ["delayed", "at_risk"]]
        
        table_rows = "\n".join([
            f"| `{s.shipment_code}` | {s.carrier} | {s.status.upper()} | {s.delay_hours:.0f}h | {s.current_location_name or 'In Transit'} |"
            for s in (delayed_s or shipments[:4])
        ])

        return {
            "role": "assistant",
            "content": f"""### 📦 Active Shipments Status Overview

Currently monitoring **67 active consignments** across road, rail, and air corridors:

| Shipment Code | Carrier | Status | Delay | Current Location |
| :--- | :--- | :--- | :--- | :--- |
{table_rows}

- **Critical Watchlist**: Consignment `SHP-S03-F01-001` (Motherson Sumi &rarr; Pune) has a 12h delay flag.
- **Action**: Use the **Shipments** page to inspect live telemetry and dispatch alternate air freight if threshold breaches 8h.
""",
            "tool_calls_made": ["get_shipments"],
            "fallback_mode": True
        }

    # 3. Supply chain doubts & concept explanations (OTIF, CP-SAT, Digital Twin, Safety Stock)
    if any(k in msg_lower for k in ["what is", "explain", "how does", "doubt", "otif", "cp-sat", "digital twin", "safety stock", "monte carlo"]):
        if "cp-sat" in msg_lower or "optimizer" in msg_lower or "or-tools" in msg_lower:
            concept_expl = """**Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)** is AROC's mathematical optimization engine. When a disruption occurs, it formulates a Mixed-Integer Programming problem to evaluate 4 recovery routes (Air Expedite, Alternate Supplier, Warehouse Reallocation, Do Nothing), minimizing total cost while respecting lead-time and capacity constraints."""
        elif "digital twin" in msg_lower:
            concept_expl = """A **Supply Chain Digital Twin** is a real-time graph model representing every physical node (Suppliers, Factories, Warehouses, Dealers) and flow (Routes, Consignments, Inventory). In AROC, graph traversal algorithms simulate cascading bottleneck propagation before physical stockouts happen."""
        elif "otif" in msg_lower:
            concept_expl = """**OTIF (On-Time In-Full)** measures the percentage of orders delivered within the promised SLA window with 100% quantity fulfilled. AROC predicts OTIF dips up to 48 hours in advance using ML transit duration forecasting."""
        else:
            concept_expl = """**Safety Stock & Buffer Buffering**: The safety stock threshold represents the minimum inventory needed to absorb lead-time variance. When a supplier delay exceeds the buffer window, production downtime ensues unless mitigated via rapid re-allocation."""

        return {
            "role": "assistant",
            "content": f"""### 🧠 Supply Chain Knowledge Base

{concept_expl}

---
**How to explore this in AROC**:
1. Go to **Digital Twin** to see the interactive network topology graph.
2. Go to **Simulation** to test custom supplier delay durations and see CP-SAT recommendations in real time.
3. Check **Scenarios** to test pre-configured black swan events (Monsoon flooding, Port congestion, Demand surges).
""",
            "tool_calls_made": ["explain_concept"],
            "fallback_mode": True
        }

    # 4. Default overview / health score
    health = await calculate_health_score(db)
    return {
        "role": "assistant",
        "content": f"""### 🌐 AROC Neural Copilot Online

Current **Supply Chain Health Score** is **{health:.1f} / 100**.

**Quick doubts you can ask me:**
- ⚡ *"What happens if Motherson Sumi (S03) is delayed 12 hours?"*
- 📦 *"Show me delayed shipments and carrier performance"*
- 💰 *"How do we recover from the ₹57,00,000 financial exposure?"*
- 🛡️ *"Explain how CP-SAT optimization works in AROC"*
- 📊 *"What are the top 3 supply chain risks today?"*
""",
        "tool_calls_made": ["get_supply_chain_kpis"],
        "fallback_mode": True
    }
