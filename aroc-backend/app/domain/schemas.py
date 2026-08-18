from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class SupplierResponse(BaseModel):
    id: int
    name: str
    code: str
    location_name: str
    lat: float
    lng: float
    country: str
    capacity: float
    reliability_score: float
    lead_time_days: float
    cost_per_unit: float
    risk_level: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class FactoryResponse(BaseModel):
    id: int
    name: str
    code: str
    location_name: str
    lat: float
    lng: float
    production_rate_per_hour: float
    capacity: float
    current_utilization: float
    contribution_margin_per_unit: float
    status: str
    
    class Config:
        from_attributes = True

class WarehouseResponse(BaseModel):
    id: int
    name: str
    code: str
    location_name: str
    lat: float
    lng: float
    capacity: float
    current_inventory: float
    safety_stock_threshold: float
    status: str

    class Config:
        from_attributes = True

class TransportHubResponse(BaseModel):
    id: int
    name: str
    hub_type: str
    location_name: str
    lat: float
    lng: float
    throughput_capacity: float
    status: str

    class Config:
        from_attributes = True

class DealerResponse(BaseModel):
    id: int
    name: str
    code: str
    location_name: str
    lat: float
    lng: float
    monthly_demand: float
    status: str

    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    unit_cost: float
    weight_kg: float

    class Config:
        from_attributes = True

class RouteResponse(BaseModel):
    id: int
    origin_type: str
    origin_id: int
    destination_type: str
    destination_id: int
    transport_mode: str
    distance_km: float
    transit_time_hours: float
    cost_per_unit: float
    delay_probability: float
    reliability_score: float
    status: str

    class Config:
        from_attributes = True

class ShipmentResponse(BaseModel):
    id: int
    shipment_code: str
    product_id: int
    quantity: float
    origin_type: str
    origin_id: int
    destination_type: str
    destination_id: int
    carrier: str
    transport_mode: str
    status: str
    planned_departure: datetime
    actual_departure: Optional[datetime]
    planned_arrival: datetime
    predicted_arrival: Optional[datetime]
    current_location_name: Optional[str]
    current_lat: Optional[float]
    current_lng: Optional[float]
    delay_hours: float
    delay_probability: float
    risk_level: Optional[str]
    route_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ShipmentEventResponse(BaseModel):
    id: int
    shipment_id: int
    event_type: str
    description: str
    location_name: str
    timestamp: datetime

    class Config:
        from_attributes = True

class DisruptionResponse(BaseModel):
    id: int
    title: str
    disruption_type: str
    severity: str
    status: str
    source_node_type: str
    source_node_id: int
    description: str
    started_at: datetime
    estimated_delay_hours: float
    financial_exposure: float

    class Config:
        from_attributes = True

class SimulationRunRequest(BaseModel):
    supplier_id: int
    disruption_type: Optional[str] = "supplier_delay"
    delay_hours: float

class ImpactNodeResponse(BaseModel):
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

class SimulationResultResponse(BaseModel):
    simulation_run_id: Optional[int]
    supplier_id: int
    supplier_name: str
    disruption_type: str
    delay_hours: float
    impact_chain: List[ImpactNodeResponse]
    total_financial_exposure: float
    nodes_affected: int
    shipments_affected: int
    stockout_hours: Optional[float]
    production_at_risk: bool
    summary: str

class RecoveryOptionResponse(BaseModel):
    option_type: str
    name: str
    description: str
    cost: float
    lead_time_improvement_hours: float
    recovery_quality_pct: float
    remaining_risk_pct: float
    expected_savings: float
    feasible: bool
    recommended: bool

class DashboardKPIResponse(BaseModel):
    health_score: float
    active_disruptions: int
    shipments_at_risk: int
    total_financial_exposure: float

class AlertResponse(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    description: str
    source_node_type: str
    source_node_id: int
    simulation_run_id: Optional[int]
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True

class ScenarioResponse(BaseModel):
    id: int
    name: str
    description: str
    scenario_type: str
    config_json: str
    created_at: datetime

    class Config:
        from_attributes = True

class CopilotMessageRequest(BaseModel):
    messages: List[Dict[str, Any]]
    conversation_id: Optional[str] = None

class CopilotResponse(BaseModel):
    role: str
    content: str
    tool_calls_made: List[str]
    fallback_mode: bool

class AnalyticsDataPoint(BaseModel):
    label: str
    value: float
