from dataclasses import dataclass, field
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Supplier, Factory, Warehouse, Shipment, InventoryRecord, Order
from app.engines.inventory import project_inventory, hours_to_stockout


@dataclass
class ImpactNode:
    node_type: str
    node_id: int
    node_name: str
    impact_type: str
    severity: str
    delay_hours: float
    inventory_breach: bool
    shortage_quantity: float
    production_loss_hours: float
    financial_impact: float
    reason: str
    sequence_order: int

@dataclass
class SimulationResult:
    simulation_run_id: Optional[int]
    supplier_id: int
    supplier_name: str
    disruption_type: str
    delay_hours: float
    impact_chain: List[ImpactNode]
    total_financial_exposure: float
    nodes_affected: int
    shipments_affected: int
    stockout_hours: Optional[float]
    production_at_risk: bool
    summary: str

async def simulate_supplier_delay(
    supplier_id: int,
    delay_hours: float,
    db: AsyncSession,
) -> SimulationResult:
    supplier = await db.get(Supplier, supplier_id)
    
    shipments_q = await db.execute(
        select(Shipment).where(
            Shipment.origin_type == "supplier",
            Shipment.origin_id == supplier_id,
            Shipment.status.in_(["pending", "in_transit"])
        )
    )
    affected_shipments = shipments_q.scalars().all()
    
    factory_ids = list(set(
        s.destination_id for s in affected_shipments 
        if s.destination_type == "factory"
    ))
    
    impact_chain = []
    sequence = 0
    
    impact_chain.append(ImpactNode(
        node_type="supplier", node_id=supplier_id, node_name=supplier.name if supplier else "Unknown",
        impact_type="delay", severity="critical",
        delay_hours=delay_hours, inventory_breach=False, shortage_quantity=0,
        production_loss_hours=0,
        financial_impact=0,
        reason=f"{supplier.name if supplier else 'Unknown'} shipment delayed by {delay_hours:.0f}h. {len(affected_shipments)} active shipments affected.",
        sequence_order=sequence
    ))
    sequence += 1
    
    total_financial = 0.0
    first_stockout_hours = None
    production_at_risk = False
    
    for factory_id in factory_ids:
        factory = await db.get(Factory, factory_id)
        if not factory:
            continue
        
        inv_q = await db.execute(
            select(InventoryRecord).where(
                InventoryRecord.node_type == "factory",
                InventoryRecord.node_id == factory_id
            )
        )
        inv_records = inv_q.scalars().all()
        
        for inv in inv_records:
            consumption_rate = factory.production_rate_per_hour * 0.8
            projected_qty = project_inventory(
                current=float(inv.quantity),
                consumption_rate_per_hour=consumption_rate,
                delay_hours=delay_hours
            )
            stockout_in = hours_to_stockout(float(inv.quantity), consumption_rate)
            breach = projected_qty < float(inv.safety_stock)
            shortage = max(0, float(inv.safety_stock) - projected_qty)
            
            if stockout_in < delay_hours:
                if first_stockout_hours is None or stockout_in < first_stockout_hours:
                    first_stockout_hours = stockout_in
                production_at_risk = True
            
            downtime_hours = (shortage / consumption_rate) if consumption_rate > 0 else 0
            prod_loss = downtime_hours * factory.production_rate_per_hour * factory.contribution_margin_per_unit
            total_financial += prod_loss
            
            sev = "critical" if breach else ("high" if stockout_in < delay_hours * 1.5 else "medium")
            
            impact_chain.append(ImpactNode(
                node_type="factory", node_id=factory_id, node_name=factory.name,
                impact_type="inventory_breach" if breach else "delay",
                severity=sev,
                delay_hours=delay_hours,
                inventory_breach=breach,
                shortage_quantity=shortage,
                production_loss_hours=downtime_hours,
                financial_impact=prod_loss,
                reason=f"Inventory drops to {projected_qty:.0f} units. Safety stock: {inv.safety_stock}. Stockout in {stockout_in:.1f}h.",
                sequence_order=sequence
            ))
            sequence += 1
        
        whse_q = await db.execute(select(Warehouse).limit(3))
        warehouses = whse_q.scalars().all()
        for wh in warehouses[:2]:
            impact_chain.append(ImpactNode(
                node_type="warehouse", node_id=wh.id, node_name=wh.name,
                impact_type="replenishment_delay",
                severity="high",
                delay_hours=delay_hours * 0.8,
                inventory_breach=False,
                shortage_quantity=delay_hours * 10,
                production_loss_hours=0,
                financial_impact=delay_hours * 500,
                reason=f"Replenishment from {factory.name} delayed. Buffer stock reduces.",
                sequence_order=sequence
            ))
            total_financial += delay_hours * 500
            sequence += 1
    
    orders_q = await db.execute(select(Order).where(Order.status == "active").limit(10))
    orders = orders_q.scalars().all()
    sla_penalty = sum(float(o.sla_penalty_per_day) * (delay_hours / 24) for o in orders[:5])
    total_financial += sla_penalty
    
    return SimulationResult(
        simulation_run_id=None,
        supplier_id=supplier_id,
        supplier_name=supplier.name if supplier else f"Supplier {supplier_id}",
        disruption_type="supplier_delay",
        delay_hours=delay_hours,
        impact_chain=impact_chain,
        total_financial_exposure=round(total_financial, 2),
        nodes_affected=len(impact_chain),
        shipments_affected=len(affected_shipments),
        stockout_hours=first_stockout_hours,
        production_at_risk=production_at_risk,
        summary=f"{supplier.name if supplier else 'Supplier'} delayed {delay_hours:.0f}h. {len(impact_chain)} nodes affected. Financial exposure: ₹{total_financial:,.0f}."
    )
