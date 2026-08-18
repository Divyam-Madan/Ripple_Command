from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.graph.builder import build_graph

router = APIRouter()


@router.get("/graph")
def get_graph(session: Session = Depends(get_db)):
    g = build_graph(session)
    nodes = [
        {"id": f"{t}:{i}", "node_type": t, "node_id": i, **{k: v for k, v in data.items() if k != "node_type"}}
        for (t, i), data in g.nodes(data=True)
    ]
    edges = [
        {
            "source": f"{u[0]}:{u[1]}", "target": f"{v[0]}:{v[1]}",
            "edge_type": data.get("edge_type"), "transport_mode": data.get("transport_mode"),
            "transit_time_hours": data.get("transit_time_hours"), "delay_probability": data.get("delay_probability"),
        }
        for u, v, data in g.edges(data=True)
    ]
    return {"nodes": nodes, "edges": edges}
