from __future__ import annotations

import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class SimulateRequest(BaseModel):
    disruption_type: str = Field(examples=["supplier_delay"])
    target_type: str = Field(examples=["supplier"])
    target_id: str
    delay_hours: float = 0.0


class OptimizeRequest(BaseModel):
    simulation_run_id: str


class CompareRequest(BaseModel):
    simulation_run_id: str
    option_types: list[str]


class SupplierCreate(BaseModel):
    name: str
    city: str
    lat: float
    lon: float
    capacity_units_per_week: float = Field(gt=0)
    lead_time_days: float = Field(ge=0)
    reliability: float = Field(ge=0, le=1, default=0.95)
    risk_score: float = Field(ge=0, le=100, default=10.0)


class FactoryCreate(BaseModel):
    name: str
    city: str
    lat: float
    lon: float
    production_rate_units_per_day: float = Field(gt=0)
    material_required_per_unit: float = Field(gt=0, default=1.0)
    contribution_margin_per_unit: float = Field(ge=0, default=45.0)
    num_production_lines: int = Field(gt=0, default=2)
    raw_material_buffer_units: float = Field(ge=0, default=0.0)


class WarehouseCreate(BaseModel):
    name: str
    city: str
    lat: float
    lon: float
    capacity_units: float = Field(gt=0)
    safety_stock_units: float = Field(ge=0)
    on_hand_units: float = Field(ge=0)


class DealerCreate(BaseModel):
    name: str
    city: str
    lat: float
    lon: float
    demand_units_per_week: float = Field(ge=0)
    on_hand_units: float = Field(ge=0, default=0.0)


class ShipmentCreate(BaseModel):
    product_id: str
    route_id: str
    source_type: str
    source_id: str
    dest_type: str
    dest_id: str
    quantity: float = Field(gt=0)
    transport_mode: str = "road"
    carrier: str = ""
    priority: str = "standard"
    planned_dispatch: Optional[dt.datetime] = None
    promised_delivery: Optional[dt.datetime] = None


class CopilotQuery(BaseModel):
    message: str
    conversation_id: Optional[str] = None
