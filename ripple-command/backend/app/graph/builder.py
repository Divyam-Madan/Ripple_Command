"""
Builds the digital-twin graph from the relational database. NetworkX is a
derived, in-memory view - never the system of record. Call build_graph(session)
whenever you need current topology; nothing caches it across a request.
"""
from __future__ import annotations

import networkx as nx
from sqlalchemy.orm import Session

from app.db import models as m

NODE_STATUS_ORDER = {"healthy": 0, "warning": 1, "critical": 2, "inactive": 3}


def _node_attrs(node_type: str, obj) -> dict:
    base = {
        "node_type": node_type,
        "name": obj.name,
        "city": getattr(obj, "city", ""),
        "lat": getattr(obj, "lat", None),
        "lon": getattr(obj, "lon", None),
        "status": getattr(obj, "status", "healthy"),
    }
    if node_type == "supplier":
        base.update(
            capacity=obj.capacity_units_per_week, lead_time_days=obj.lead_time_days,
            reliability=obj.reliability, risk_score=obj.risk_score,
        )
    elif node_type == "factory":
        base.update(
            production_rate=obj.production_rate_units_per_day,
            material_required_per_unit=obj.material_required_per_unit,
            raw_material_buffer_units=obj.raw_material_buffer_units,
            num_production_lines=obj.num_production_lines,
            contribution_margin_per_unit=obj.contribution_margin_per_unit,
        )
    elif node_type == "warehouse":
        base.update(
            capacity=obj.capacity_units, safety_stock=obj.safety_stock_units,
            on_hand=obj.on_hand_units,
        )
    elif node_type == "transport_hub":
        base.update(throughput=obj.throughput_units_per_day)
    elif node_type == "dealer":
        base.update(
            demand_per_week=obj.demand_units_per_week, on_hand=obj.on_hand_units,
        )
    return base


def build_graph(session: Session) -> nx.DiGraph:
    g = nx.DiGraph()

    for s in session.query(m.Supplier).all():
        g.add_node(("supplier", s.id), **_node_attrs("supplier", s))
    for f in session.query(m.Factory).all():
        g.add_node(("factory", f.id), **_node_attrs("factory", f))
    for w in session.query(m.Warehouse).all():
        g.add_node(("warehouse", w.id), **_node_attrs("warehouse", w))
    for h in session.query(m.TransportHub).all():
        g.add_node(("transport_hub", h.id), **_node_attrs("transport_hub", h))
    for d in session.query(m.Dealer).all():
        g.add_node(("dealer", d.id), **_node_attrs("dealer", d))

    for r in session.query(m.Route).all():
        src = (r.source_type, r.source_id)
        dst = (r.dest_type, r.dest_id)
        if src not in g or dst not in g:
            continue
        edge_type = "supply_dependency" if r.source_type == "supplier" else (
            "inventory_flow" if r.dest_type in ("warehouse", "dealer") else "transport_route"
        )
        g.add_edge(
            src, dst,
            route_id=r.id, edge_type=edge_type, distance_km=r.distance_km,
            transport_mode=r.transport_mode, transit_time_hours=r.transit_time_hours,
            cost_per_unit=r.cost_per_unit, capacity=r.capacity_units,
            delay_probability=r.delay_probability, reliability=r.reliability,
        )

    return g


def downstream_of(g: nx.DiGraph, node_key: tuple[str, str]) -> list[tuple[str, str]]:
    """Ordered downstream nodes reachable from node_key, by BFS distance."""
    if node_key not in g:
        return []
    order = list(nx.bfs_tree(g, node_key).nodes())
    return [n for n in order if n != node_key]


def node_label(g: nx.DiGraph, node_key: tuple[str, str]) -> str:
    data = g.nodes.get(node_key, {})
    return data.get("name", f"{node_key[0]}:{node_key[1]}")
