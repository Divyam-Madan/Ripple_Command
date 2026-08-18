from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import init_db, AsyncSessionLocal
from app.data.seed import seed_database

from app.api.routes.health import router as health_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.entities import router as entities_router
from app.api.routes.shipments import router as shipments_router
from app.api.routes.disruptions import router as disruptions_router
from app.api.routes.simulations import router as simulations_router
from app.api.routes.optimization import router as optimization_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.copilot import router as copilot_router
from app.api.routes.scenarios import router as scenarios_router
from app.api.routes.websocket_router import router as ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if settings.DEMO_MODE:
        async with AsyncSessionLocal() as db:
            await seed_database(db)
    yield

app = FastAPI(
    title="AROC API",
    description="Autonomous Resilient Operations Center — Supply Chain Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(dashboard_router,    prefix="/api/dashboard",    tags=["dashboard"])
app.include_router(entities_router,     prefix="/api/entities",     tags=["entities"])
app.include_router(shipments_router,    prefix="/api/shipments",    tags=["shipments"])
app.include_router(disruptions_router,  prefix="/api/disruptions",  tags=["disruptions"])
app.include_router(simulations_router,  prefix="/api/simulations",  tags=["simulations"])
app.include_router(optimization_router, prefix="/api/optimization", tags=["optimization"])
app.include_router(analytics_router,    prefix="/api/analytics",    tags=["analytics"])
app.include_router(copilot_router,      prefix="/api/copilot",      tags=["copilot"])
app.include_router(scenarios_router,    prefix="/api/scenarios",    tags=["scenarios"])
app.include_router(ws_router,           tags=["websocket"])
