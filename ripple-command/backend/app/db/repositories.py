"""
Thin repository layer. Keeps API routes and services free of raw ORM query
sprawl and gives us one place to swap persistence later (e.g. a mock
in-memory repository for tests) without touching callers.
"""
from __future__ import annotations

from typing import Sequence, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models as m

T = TypeVar("T")


class Repository:
    """Generic CRUD wrapper over a SQLAlchemy model."""

    def __init__(self, session: Session, model: Type[T]):
        self.session = session
        self.model = model

    def get(self, id_: str) -> T | None:
        return self.session.get(self.model, id_)

    def list(self, **filters) -> Sequence[T]:
        stmt = select(self.model)
        for k, v in filters.items():
            stmt = stmt.where(getattr(self.model, k) == v)
        return self.session.execute(stmt).scalars().all()

    def add(self, obj: T) -> T:
        self.session.add(obj)
        self.session.flush()
        return obj

    def delete(self, obj: T) -> None:
        self.session.delete(obj)


NODE_MODEL_BY_TYPE = {
    "supplier": m.Supplier,
    "factory": m.Factory,
    "warehouse": m.Warehouse,
    "transport_hub": m.TransportHub,
    "dealer": m.Dealer,
    "customer": m.Customer,
}


def get_node(session: Session, node_type: str, node_id: str):
    model = NODE_MODEL_BY_TYPE.get(node_type)
    if model is None:
        return None
    return session.get(model, node_id)


def all_nodes(session: Session, node_type: str):
    model = NODE_MODEL_BY_TYPE.get(node_type)
    if model is None:
        return []
    return session.execute(select(model)).scalars().all()
