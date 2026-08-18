import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Supplier, Factory, Warehouse, Route

async def build_supply_chain_graph(db: AsyncSession) -> nx.DiGraph:
    G = nx.DiGraph()
    
    suppliers = (await db.execute(select(Supplier))).scalars().all()
    for s in suppliers:
        G.add_node(f"supplier_{s.id}", type="supplier", name=s.name, 
                   lat=s.lat, lng=s.lng, risk=s.risk_level, status="active")
    
    factories = (await db.execute(select(Factory))).scalars().all()
    for f in factories:
        G.add_node(f"factory_{f.id}", type="factory", name=f.name,
                   lat=f.lat, lng=f.lng, utilization=f.current_utilization, status="active")
    
    warehouses = (await db.execute(select(Warehouse))).scalars().all()
    for w in warehouses:
        G.add_node(f"warehouse_{w.id}", type="warehouse", name=w.name,
                   lat=w.lat, lng=w.lng, status="active")
    
    routes = (await db.execute(select(Route).where(Route.status == "active"))).scalars().all()
    for r in routes:
        src = f"{r.origin_type}_{r.origin_id}"
        dst = f"{r.destination_type}_{r.destination_id}"
        if src in G and dst in G:
            G.add_edge(src, dst, 
                      mode=r.transport_mode, 
                      distance=r.distance_km,
                      transit_time=r.transit_time_hours,
                      delay_prob=r.delay_probability)
    
    return G

def get_downstream_nodes(G: nx.DiGraph, node_key: str) -> list:
    return list(nx.descendants(G, node_key))
