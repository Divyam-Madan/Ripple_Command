"""
Relational schema. SQLAlchemy 2.0 declarative models.

These are the single source of truth for persisted state. The NetworkX graph
(app/graph/builder.py) is rebuilt FROM this data on demand - it is never the
system of record. All financial/inventory/production math (app/simulation/*)
reads only from these tables (or the graph derived from them), never from
values invented elsewhere.
"""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return uuid.uuid4().hex[:12]


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


# ---------------------------------------------------------------------------
# Identity
# ---------------------------------------------------------------------------


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, unique=True)  # admin, planner, viewer
    description: Mapped[str] = mapped_column(String, default="")


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    role_id: Mapped[str] = mapped_column(ForeignKey("roles.id"))
    role: Mapped["Role"] = relationship()


# ---------------------------------------------------------------------------
# Network entities
# ---------------------------------------------------------------------------


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    capacity_units_per_week: Mapped[float] = mapped_column(Float)
    lead_time_days: Mapped[float] = mapped_column(Float)
    reliability: Mapped[float] = mapped_column(Float, default=0.95)  # 0..1
    risk_score: Mapped[float] = mapped_column(Float, default=10.0)  # 0..100
    status: Mapped[str] = mapped_column(String, default="healthy")


class Factory(Base, TimestampMixin):
    __tablename__ = "factories"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    production_rate_units_per_day: Mapped[float] = mapped_column(Float)
    material_required_per_unit: Mapped[float] = mapped_column(Float, default=1.0)
    contribution_margin_per_unit: Mapped[float] = mapped_column(Float, default=45.0)
    num_production_lines: Mapped[int] = mapped_column(Integer, default=2)
    # Current buffer of critical input material, in material-units, on site.
    # Deliberately thin for at least one factory in the seed set so the
    # flagship "supplier delay" scenario has a real, calculable breach point
    # rather than a scripted one.
    raw_material_buffer_units: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="healthy")


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    capacity_units: Mapped[float] = mapped_column(Float)
    safety_stock_units: Mapped[float] = mapped_column(Float)
    on_hand_units: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String, default="healthy")


class TransportHub(Base, TimestampMixin):
    __tablename__ = "transport_hubs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    throughput_units_per_day: Mapped[float] = mapped_column(Float, default=5000.0)
    status: Mapped[str] = mapped_column(String, default="healthy")


class Dealer(Base, TimestampMixin):
    __tablename__ = "dealers"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    demand_units_per_week: Mapped[float] = mapped_column(Float)
    on_hand_units: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="healthy")


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.id"))


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sku: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    unit_cost: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[float] = mapped_column(Float)
    sla_penalty_per_unit_per_day: Mapped[float] = mapped_column(Float, default=8.0)


class Route(Base, TimestampMixin):
    __tablename__ = "routes"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source_type: Mapped[str] = mapped_column(String)
    source_id: Mapped[str] = mapped_column(String)
    dest_type: Mapped[str] = mapped_column(String)
    dest_id: Mapped[str] = mapped_column(String)
    distance_km: Mapped[float] = mapped_column(Float)
    transport_mode: Mapped[str] = mapped_column(String, default="road")
    transit_time_hours: Mapped[float] = mapped_column(Float)
    cost_per_unit: Mapped[float] = mapped_column(Float)
    capacity_units: Mapped[float] = mapped_column(Float)
    delay_probability: Mapped[float] = mapped_column(Float, default=0.05)
    reliability: Mapped[float] = mapped_column(Float, default=0.95)


class Shipment(Base, TimestampMixin):
    __tablename__ = "shipments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(String, default="")
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id"))
    source_type: Mapped[str] = mapped_column(String)
    source_id: Mapped[str] = mapped_column(String)
    dest_type: Mapped[str] = mapped_column(String)
    dest_id: Mapped[str] = mapped_column(String)
    quantity: Mapped[float] = mapped_column(Float)
    transport_mode: Mapped[str] = mapped_column(String, default="road")
    carrier: Mapped[str] = mapped_column(String, default="")
    planned_dispatch: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    promised_delivery: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    planned_eta: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    predicted_eta: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String, default="planned")
    delay_probability: Mapped[float] = mapped_column(Float, default=0.05)
    current_location: Mapped[str] = mapped_column(String, default="")
    priority: Mapped[str] = mapped_column(String, default="standard")


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    shipment_id: Mapped[str] = mapped_column(ForeignKey("shipments.id"))
    event_type: Mapped[str] = mapped_column(String)
    timestamp: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    description: Mapped[str] = mapped_column(String, default="")


class InventoryRecord(Base, TimestampMixin):
    __tablename__ = "inventory_records"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    node_type: Mapped[str] = mapped_column(String)
    node_id: Mapped[str] = mapped_column(String)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    on_hand: Mapped[float] = mapped_column(Float)
    safety_stock: Mapped[float] = mapped_column(Float)


class Order(Base, TimestampMixin):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    dealer_id: Mapped[str] = mapped_column(ForeignKey("dealers.id"))
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[float] = mapped_column(Float)
    requested_date: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String, default="open")


# ---------------------------------------------------------------------------
# Disruption / simulation / optimization
# ---------------------------------------------------------------------------


class Disruption(Base, TimestampMixin):
    __tablename__ = "disruptions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    type: Mapped[str] = mapped_column(String)
    target_type: Mapped[str] = mapped_column(String)
    target_id: Mapped[str] = mapped_column(String)
    delay_hours: Mapped[float] = mapped_column(Float, default=0.0)
    severity: Mapped[str] = mapped_column(String, default="medium")
    description: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="simulated")


class SimulationRun(Base, TimestampMixin):
    __tablename__ = "simulation_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    disruption_id: Mapped[str] = mapped_column(ForeignKey("disruptions.id"))
    params_json: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="completed")
    supply_chain_health_before: Mapped[float] = mapped_column(Float, default=0.0)
    supply_chain_health_after: Mapped[float] = mapped_column(Float, default=0.0)
    total_financial_exposure: Mapped[float] = mapped_column(Float, default=0.0)
    recovery_requirement_json: Mapped[dict] = mapped_column(JSON, default=dict)
    narrative_summary: Mapped[str] = mapped_column(Text, default="")


class SimulationImpact(Base):
    __tablename__ = "simulation_impacts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    simulation_run_id: Mapped[str] = mapped_column(ForeignKey("simulation_runs.id"))
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    node_type: Mapped[str] = mapped_column(String)
    node_id: Mapped[str] = mapped_column(String)
    node_name: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String)
    reason: Mapped[str] = mapped_column(String)
    estimated_time_hours: Mapped[float] = mapped_column(Float, default=0.0)
    affected_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    financial_impact: Mapped[float] = mapped_column(Float, default=0.0)


class RecoveryOption(Base):
    __tablename__ = "recovery_options"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    simulation_run_id: Mapped[str] = mapped_column(ForeignKey("simulation_runs.id"))
    type: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    cost: Mapped[float] = mapped_column(Float)
    eta_hours: Mapped[float] = mapped_column(Float)
    feasible: Mapped[bool] = mapped_column(Boolean, default=True)
    recovered_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    remaining_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    expected_savings: Mapped[float] = mapped_column(Float, default=0.0)
    total_expected_cost: Mapped[float] = mapped_column(Float, default=0.0)
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=False)


class Recommendation(Base, TimestampMixin):
    __tablename__ = "recommendations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    simulation_run_id: Mapped[str] = mapped_column(ForeignKey("simulation_runs.id"))
    recovery_option_id: Mapped[str] = mapped_column(ForeignKey("recovery_options.id"))
    reasons_json: Mapped[list] = mapped_column(JSON, default=list)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    severity: Mapped[str] = mapped_column(String)
    source_type: Mapped[str] = mapped_column(String)
    source_id: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    impact_summary: Mapped[str] = mapped_column(String, default="")
    recommended_action: Mapped[str] = mapped_column(String, default="")
    simulation_run_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    disruption_type: Mapped[str] = mapped_column(String)
    target_type: Mapped[str] = mapped_column(String, default="")
    target_id: Mapped[str] = mapped_column(String, default="")
    delay_hours: Mapped[float] = mapped_column(Float, default=0.0)
    is_flagship: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    actor: Mapped[str] = mapped_column(String, default="system")
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String, default="")
    entity_id: Mapped[str] = mapped_column(String, default="")
    details: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
