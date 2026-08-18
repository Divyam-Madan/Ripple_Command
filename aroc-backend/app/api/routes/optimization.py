from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_db
from app.engines.optimizer import optimize_recovery
from app.db.models import SimulationRun
from app.engines.simulation import SimulationResult

router = APIRouter()

@router.post("/{run_id}/optimize")
async def optimize_recovery_endpoint(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(SimulationRun, run_id)
    if not run:
        return {"error": "SimulationRun not found"}
    
    sim_result = SimulationResult(
        simulation_run_id=run.id,
        supplier_id=run.supplier_id or 0,
        supplier_name="Unknown",
        disruption_type=run.disruption_type,
        delay_hours=run.delay_hours,
        impact_chain=[],
        total_financial_exposure=run.total_financial_exposure,
        nodes_affected=run.nodes_affected,
        shipments_affected=run.shipments_affected,
        stockout_hours=None,
        production_at_risk=True,
        summary="Reconstructed for optimization"
    )
    
    options = optimize_recovery(sim_result)
    return options
