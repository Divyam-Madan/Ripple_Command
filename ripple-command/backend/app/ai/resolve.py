"""
Resolves a short natural-language reference ("S3", "supplier S3", "F1",
"Factory F1 Coimbatore") to a concrete (node_type, node_id, name). Used by
both the real LLM tool layer and the deterministic fallback so "what if S3
is delayed" and a typed dropdown selection go through the exact same lookup
- no separate, divergent parsing path for the AI.
"""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.db import models as m

CODE_PREFIX_TO_TYPE = {
    "S": ("supplier", m.Supplier),
    "F": ("factory", m.Factory),
    "W": ("warehouse", m.Warehouse),
    "H": ("transport_hub", m.TransportHub),
    "D": ("dealer", m.Dealer),
}

CODE_RE = re.compile(r"\b([SFWHD])\s?-?(\d{1,3})\b", re.IGNORECASE)


def resolve_entity_reference(session: Session, text: str) -> tuple[str, str, str] | None:
    """Best-effort resolution of a code like 'S3' inside free text. Returns
    (node_type, node_id, name) or None if nothing matched a real seeded row."""
    if not text:
        return None
    match = CODE_RE.search(text)
    if match:
        letter, number = match.group(1).upper(), match.group(2)
        node_type, model = CODE_PREFIX_TO_TYPE.get(letter, (None, None))
        if model is not None:
            code = f"{letter}{number}"
            row = session.query(model).filter(model.name.like(f"{code} \u00b7%")).first()
            if row:
                return node_type, row.id, row.name

    # fall back to substring match against any entity name
    for node_type, model in (
        ("supplier", m.Supplier), ("factory", m.Factory), ("warehouse", m.Warehouse),
        ("transport_hub", m.TransportHub), ("dealer", m.Dealer),
    ):
        row = session.query(model).filter(model.name.ilike(f"%{text.strip()}%")).first()
        if row:
            return node_type, row.id, row.name
    return None
