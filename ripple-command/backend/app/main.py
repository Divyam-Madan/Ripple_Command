from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    analytics, copilot, dashboard, disruptions, entities, graph, health,
    optimization, scenarios, shipments, simulations, websocket,
)
from app.config import get_settings
from app.data.seed import seed_all
from app.db.session import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aroc")

settings = get_settings()

app = FastAPI(
    title="AROC - Autonomous Resilient Operations Center",
    description="Predictive supply-chain digital twin and decision-intelligence API.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(health.router, prefix=API_PREFIX, tags=["health"])
app.include_router(dashboard.router, prefix=API_PREFIX, tags=["dashboard"])
app.include_router(entities.router, prefix=API_PREFIX, tags=["entities"])
app.include_router(shipments.router, prefix=API_PREFIX, tags=["shipments"])
app.include_router(disruptions.router, prefix=API_PREFIX, tags=["disruptions"])
app.include_router(simulations.router, prefix=API_PREFIX, tags=["simulations"])
app.include_router(optimization.router, prefix=API_PREFIX, tags=["optimization"])
app.include_router(analytics.router, prefix=API_PREFIX, tags=["analytics"])
app.include_router(copilot.router, prefix=API_PREFIX, tags=["copilot"])
app.include_router(scenarios.router, prefix=API_PREFIX, tags=["scenarios"])
app.include_router(graph.router, prefix=API_PREFIX, tags=["graph"])
app.include_router(websocket.router, tags=["websocket"])


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    if settings.demo_mode:
        from app.db.session import get_session_factory
        session = get_session_factory()()
        try:
            from app.db import models as m
            has_data = session.query(m.Supplier).first() is not None
        finally:
            session.close()
        if not has_data:
            logger.info("DEMO_MODE active and database is empty - seeding synthetic network.")
            seed_all(reset=True)
        else:
            logger.info("DEMO_MODE active - existing data found, skipping reseed.")


@app.get("/")
def root():
    return {
        "name": "AROC",
        "tagline": "Predict. Simulate. Prescribe.",
        "docs": "/docs",
        "demo_mode": settings.demo_mode,
    }
