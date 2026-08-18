from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.domain.schemas import SimulationRunRequest, SimulationResultResponse
from app.engines.simulation import simulate_supplier_delay
from app.db.models import SimulationRun, SimulationImpactNode
from app.events.manager import manager

router = APIRouter()

@router.post("/run", response_model=SimulationResultResponse)
async def run_simulation(request: SimulationRunRequest, db: AsyncSession = Depends(get_db)):
    result = await simulate_supplier_delay(request.supplier_id, request.delay_hours, db)
    
    run = SimulationRun(
        supplier_id=request.supplier_id,
        disruption_type=request.disruption_type or "supplier_delay",
        delay_hours=request.delay_hours,
        status="completed",
        total_financial_exposure=result.total_financial_exposure,
        nodes_affected=result.nodes_affected,
        shipments_affected=result.shipments_affected
    )
    db.add(run)
    await db.flush()
    
    for n in result.impact_chain:
        impact = SimulationImpactNode(
            simulation_run_id=run.id,
            node_type=n.node_type,
            node_id=n.node_id,
            node_name=n.node_name,
            impact_type=n.impact_type,
            severity=n.severity,
            delay_hours=n.delay_hours,
            inventory_breach=n.inventory_breach,
            shortage_quantity=n.shortage_quantity,
            production_loss_hours=n.production_loss_hours,
            financial_impact=n.financial_impact,
            reason=n.reason,
            sequence_order=n.sequence_order
        )
        db.add(impact)
    
    await db.commit()
    result.simulation_run_id = run.id
    
    await manager.broadcast("SIMULATION_COMPLETE", {"run_id": run.id, "exposure": result.total_financial_exposure})
    
    # Simple conversion to dict for response
    return {
        "simulation_run_id": result.simulation_run_id,
        "supplier_id": result.supplier_id,
        "supplier_name": result.supplier_name,
        "disruption_type": result.disruption_type,
        "delay_hours": result.delay_hours,
        "impact_chain": [
            {
                "node_type": n.node_type,
                "node_id": n.node_id,
                "node_name": n.node_name,
                "impact_type": n.impact_type,
                "severity": n.severity,
                "delay_hours": n.delay_hours,
                "inventory_breach": n.inventory_breach,
                "shortage_quantity": n.shortage_quantity,
                "production_loss_hours": n.production_loss_hours,
                "financial_impact": n.financial_impact,
                "reason": n.reason,
                "sequence_order": n.sequence_order
            } for n in result.impact_chain
        ],
        "total_financial_exposure": result.total_financial_exposure,
        "nodes_affected": result.nodes_affected,
        "shipments_affected": result.shipments_affected,
        "stockout_hours": result.stockout_hours,
        "production_at_risk": result.production_at_risk,
        "summary": result.summary
    }
