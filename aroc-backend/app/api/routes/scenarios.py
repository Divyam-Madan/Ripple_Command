from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Scenario, Supplier

router = APIRouter()

@router.get("")
async def list_scenarios(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(Scenario).order_by(Scenario.id))
    scenarios = q.scalars().all()
    import json
    return [
        {
            "id": s.id, "name": s.name, "description": s.description,
            "scenario_type": s.scenario_type,
            "config_json": json.loads(s.config_json) if s.config_json else {},
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in scenarios
    ]

@router.post("/{scenario_id}/load")
async def load_scenario(scenario_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns the scenario config pre-filled for the simulator.
    Does NOT auto-run the simulation — that's the user's choice.
    """
    s = await db.get(Scenario, scenario_id)
    if not s:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scenario not found")
    import json
    config = json.loads(s.config_json) if s.config_json else {}

    # Resolve supplier name if supplier_id present
    supplier_name = None
    if config.get("supplier_id"):
        sup = await db.get(Supplier, config["supplier_id"])
        if sup:
            supplier_name = sup.name

    return {
        "scenario_id": s.id,
        "scenario_name": s.name,
        "scenario_type": s.scenario_type,
        "config": config,
        "supplier_name": supplier_name,
        "loaded": True,
    }
