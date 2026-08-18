"""
Deterministic copilot fallback. Used automatically when OPENROUTER_API_KEY is
unset or MOCK_EXTERNAL_APIS is true. It does simple intent matching on the
question, then calls the SAME backend tools the real LLM would call and
formats the SAME real data into a readable answer. It never invents a number
- if intent can't be matched confidently, it says so and lists what it can
answer.
"""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.ai.resolve import resolve_entity_reference
from app.ai.tools import call_tool
from app.db import models as m

DELAY_RE = re.compile(r"(\d+(?:\.\d+)?)\s*h", re.IGNORECASE)


def _latest_simulation_run_id(session: Session) -> str | None:
    run = session.query(m.SimulationRun).order_by(m.SimulationRun.created_at.desc()).first()
    return run.id if run else None


def _fmt_money(v: float) -> str:
    return f"\u20b9{v:,.0f}"


def respond(session: Session, message: str) -> dict:
    text = message.strip()
    lower = text.lower()

    # 1. "what happens if X is delayed by Yh" / simulate
    if any(k in lower for k in ["what happens if", "simulate", "delayed by", "what if"]):
        ref = resolve_entity_reference(session, text)
        delay_match = DELAY_RE.search(lower)
        delay_hours = float(delay_match.group(1)) if delay_match else 12.0
        if not ref:
            return _plain("I can run that simulation, but I couldn't match a network entity (like S3 or F1) in your question. Try naming the code directly, e.g. \u2018What happens if S3 is delayed by 12 hours?\u2019")
        node_type, node_id, node_name = ref
        disruption_type = "warehouse_stockout" if node_type == "warehouse" else (
            "demand_surge" if node_type == "dealer" else "supplier_delay"
        )
        result = call_tool(session, "simulate_disruption", {
            "target_ref": node_name, "disruption_type": disruption_type, "delay_hours": delay_hours,
        })
        return _format_simulation(result)

    # 2. "why is X at risk / why is X critical"
    if lower.startswith("why is") or "why is" in lower or "at risk" in lower:
        ref = resolve_entity_reference(session, text)
        if not ref:
            return _plain("I couldn't match that to a network entity. Try including its code, e.g. F1.")
        node_type, node_id, node_name = ref
        risk = call_tool(session, "get_node_risk", {"target_ref": node_name})
        proj = call_tool(session, "get_inventory_projection", {"target_ref": node_name})
        return _format_node_risk(node_name, risk, proj)

    # 3. "which supplier has the greatest financial exposure"
    if "financial exposure" in lower and "supplier" in lower:
        rows = (
            session.query(m.SimulationRun, m.Disruption)
            .join(m.Disruption, m.SimulationRun.disruption_id == m.Disruption.id)
            .filter(m.Disruption.target_type == "supplier")
            .all()
        )
        if not rows:
            ranked = call_tool(session, "rank_supplier_risk", {"top_n": 1})
            top = ranked["suppliers"][0] if ranked["suppliers"] else None
            if not top:
                return _plain("No supplier data available.")
            return _plain(f"No disruption simulations have been run against a specific supplier yet, so I can't rank realized financial exposure. By underlying risk score, {top['name']} is the highest-risk supplier (risk {top['risk_score']:.0f}/100) - simulate a delay on it to get a real exposure figure.")
        totals: dict[str, float] = {}
        names: dict[str, str] = {}
        for run, disruption in rows:
            supplier = session.get(m.Supplier, disruption.target_id)
            if not supplier:
                continue
            totals[supplier.id] = totals.get(supplier.id, 0.0) + run.total_financial_exposure
            names[supplier.id] = supplier.name
        if not totals:
            return _plain("No supplier-linked simulations found yet.")
        top_id = max(totals, key=totals.get)
        return _plain(f"Based on simulated scenarios so far, {names[top_id]} carries the greatest financial exposure: {_fmt_money(totals[top_id])} across simulated disruptions.")

    # 4. "cheapest recovery option" / "what is the cheapest"
    if "cheapest" in lower or ("recovery" in lower and "option" in lower and "compare" not in lower):
        run_id = _latest_simulation_run_id(session)
        if not run_id:
            return _plain("Run a disruption simulation first (e.g. \u2018What happens if S3 is delayed by 12 hours?\u2019) so there's a recovery requirement to optimize against.")
        result = call_tool(session, "optimize_recovery", {"simulation_run_id": run_id})
        if "error" in result:
            return _plain(result["detail"])
        feasible = [o for o in result["options"] if o["feasible"]]
        if not feasible:
            return _plain("None of the current recovery options are fully feasible for the latest simulated shortage; the least-bad option is still \u2018do nothing\u2019 pending a re-plan.")
        cheapest = min(feasible, key=lambda o: o["cost"])
        return _plain(f"The cheapest feasible recovery option for the most recent simulation is **{cheapest['type'].replace('_', ' ')}** at {_fmt_money(cheapest['cost'])}, arriving in {cheapest['eta_hours']:.1f}h and recovering {cheapest['recovered_quantity']:.0f} units.")

    # 5. "which shipments are most likely to miss SLA"
    if "sla" in lower or ("shipment" in lower and ("miss" in lower or "risk" in lower or "likely" in lower)):
        shipments = (
            session.query(m.Shipment)
            .filter(m.Shipment.status.in_(["in_transit", "delayed", "planned"]))
            .order_by(m.Shipment.delay_probability.desc())
            .limit(5)
            .all()
        )
        if not shipments:
            return _plain("No active shipments in the network.")
        lines = [f"- {s.order_id}: {s.delay_probability:.0%} delay probability, status {s.status}" for s in shipments]
        return _plain("Shipments most likely to miss SLA right now:\n" + "\n".join(lines))

    # 6. "how much exposure can be avoided"
    if "exposure" in lower and ("avoid" in lower or "saved" in lower or "savings" in lower):
        run_id = _latest_simulation_run_id(session)
        if not run_id:
            return _plain("Run a simulation first so there's an exposure figure to compare against.")
        result = call_tool(session, "optimize_recovery", {"simulation_run_id": run_id})
        if "error" in result:
            return _plain(result["detail"])
        recommended = next((o for o in result["options"] if o["is_recommended"]), None)
        if not recommended:
            return _plain("No feasible recovery option was found for the latest simulation, so no exposure can currently be avoided.")
        return _plain(f"Acting on the recommended option ({recommended['type'].replace('_', ' ')}) avoids an estimated {_fmt_money(recommended['expected_savings'])} of the projected exposure.")

    # 7. "compare the top two recovery strategies" / compare X and Y
    if "compare" in lower and "recover" in lower:
        run_id = _latest_simulation_run_id(session)
        if not run_id:
            return _plain("Run a simulation first so there are recovery options to compare.")
        result = call_tool(session, "compare_recovery_options", {"simulation_run_id": run_id, "option_types": []})
        if "error" in result:
            return _plain(result["detail"])
        ranked = sorted(result["options"], key=lambda o: (not o["feasible"], o["cost"]))[:2]
        if len(ranked) < 2:
            return _plain("Not enough recovery options to compare yet.")
        a, b = ranked
        return _plain(
            f"Top two by cost: **{a['type'].replace('_',' ')}** ({_fmt_money(a['cost'])}, {a['eta_hours']:.1f}h, "
            f"{'feasible' if a['feasible'] else 'not feasible in time'}) vs **{b['type'].replace('_',' ')}** "
            f"({_fmt_money(b['cost'])}, {b['eta_hours']:.1f}h, {'feasible' if b['feasible'] else 'not feasible in time'})."
        )

    # 8. dashboard / overview
    if any(k in lower for k in ["overview", "dashboard", "how are we doing", "health"]):
        summary = call_tool(session, "get_dashboard_summary", {})
        h = summary["health"]["score"]
        k = summary["kpis"]
        return _plain(
            f"Supply Chain Health is {h:.1f}/100. {k['active_shipments']} active shipments "
            f"({k['at_risk_shipments']} at risk), {k['critical_suppliers']} critical suppliers, "
            f"{k['projected_stockouts']} projected stockouts, financial exposure "
            f"{_fmt_money(k['financial_exposure'])} across recent simulations."
        )

    return _plain(
        "I can run disruption simulations, explain node risk, rank supplier risk, "
        "optimize and compare recovery options, and check inventory projections - all against "
        "the live network data. Try: \u2018What happens if S3 is delayed by 12 hours?\u2019, "
        "\u2018Why is F1 at risk?\u2019, or \u2018What is the cheapest recovery option?\u2019"
    )


def _plain(text: str) -> dict:
    return {"reply": text, "tool_calls": [], "source": "fallback"}


def _format_simulation(result: dict) -> dict:
    if "error" in result:
        return _plain(result["detail"])
    chain = result["impact_chain"]
    lines = [f"- {s['node_name']}: {s['reason']}" for s in chain]
    reply = (
        f"Simulated **{result['disruption_type'].replace('_',' ')}** on {result['target_name']} "
        f"({result['delay_hours']:g}h delay), severity **{result['severity']}**.\n\n"
        + "\n".join(lines)
        + f"\n\nTotal financial exposure: {_fmt_money(result['total_financial_exposure'])}. "
        f"Supply Chain Health moves {result['health_before']:.1f} \u2192 {result['health_after']:.1f}."
    )
    if result.get("recovery_requirement"):
        reply += f"\n\nSimulation ID `{result['simulation_run_id']}` - ask me to optimize recovery for it."
    return {"reply": reply, "tool_calls": ["simulate_disruption"], "source": "fallback",
            "simulation_run_id": result["simulation_run_id"]}


def _format_node_risk(name: str, risk: dict, proj: dict) -> dict:
    if "error" in risk:
        return _plain(risk["detail"])
    parts = [f"**{name}** status: {risk.get('status', 'unknown')}."]
    if "hours_of_cover" in proj and proj.get("hours_of_cover") is not None:
        cover = proj["hours_of_cover"]
        flag = " - below the ~24h buffer considered safe" if cover < 24 else ""
        parts.append(f"Raw-material cover: {cover:.1f}h at current consumption{flag}.")
    if "cushion_units" in proj:
        parts.append(f"Inventory cushion above safety stock: {proj['cushion_units']:.0f} units.")
    if "weeks_of_cover" in proj and proj.get("weeks_of_cover") is not None:
        parts.append(f"Demand cover: {proj['weeks_of_cover']:.2f} weeks of on-hand stock.")
    if "risk_score" in risk:
        parts.append(f"Risk score: {risk['risk_score']:.0f}/100, reliability {risk['reliability']:.0%}.")
    return {"reply": " ".join(parts), "tool_calls": ["get_node_risk", "get_inventory_projection"], "source": "fallback"}
