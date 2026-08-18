from __future__ import annotations

from app.websocket.bus import manager


async def publish_event(event_type: str, payload: dict) -> None:
    """Broadcast to all connected dashboard/shipment clients. Supported
    event types: shipment.status_changed, disruption.created,
    dashboard.kpi_updated, simulation.completed, recommendation.updated."""
    await manager.broadcast(event_type, payload)
