from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    country = Column(String)
    capacity = Column(Float)
    reliability_score = Column(Float)
    lead_time_days = Column(Float)
    cost_per_unit = Column(Float)
    risk_level = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())

class Factory(Base):
    __tablename__ = "factories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    production_rate_per_hour = Column(Float)
    capacity = Column(Float)
    current_utilization = Column(Float)
    contribution_margin_per_unit = Column(Float)
    status = Column(String)

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    code = Column(String, unique=True)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    capacity = Column(Float)
    current_inventory = Column(Float)
    safety_stock_threshold = Column(Float)
    status = Column(String)

class TransportHub(Base):
    __tablename__ = "transport_hubs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    hub_type = Column(String)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    throughput_capacity = Column(Float)
    status = Column(String)

class Dealer(Base):
    __tablename__ = "dealers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    code = Column(String, unique=True)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    monthly_demand = Column(Float)
    status = Column(String)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    sku = Column(String, unique=True)
    category = Column(String)
    unit_cost = Column(Float)
    weight_kg = Column(Float)

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    origin_type = Column(String)
    origin_id = Column(Integer)
    destination_type = Column(String)
    destination_id = Column(Integer)
    transport_mode = Column(String)
    distance_km = Column(Float)
    transit_time_hours = Column(Float)
    cost_per_unit = Column(Float)
    delay_probability = Column(Float)
    reliability_score = Column(Float)
    status = Column(String)

class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True, index=True)
    shipment_code = Column(String, unique=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float)
    origin_type = Column(String)
    origin_id = Column(Integer)
    destination_type = Column(String)
    destination_id = Column(Integer)
    carrier = Column(String)
    transport_mode = Column(String)
    status = Column(String)
    planned_departure = Column(DateTime(timezone=True))
    actual_departure = Column(DateTime(timezone=True), nullable=True)
    planned_arrival = Column(DateTime(timezone=True))
    predicted_arrival = Column(DateTime(timezone=True), nullable=True)
    current_location_name = Column(String, nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    delay_hours = Column(Float, default=0.0)
    delay_probability = Column(Float, default=0.0)
    risk_level = Column(String, nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class ShipmentEvent(Base):
    __tablename__ = "shipment_events"
    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"))
    event_type = Column(String)
    description = Column(String)
    location_name = Column(String)
    timestamp = Column(DateTime(timezone=True), default=func.now())

class InventoryRecord(Base):
    __tablename__ = "inventory_records"
    id = Column(Integer, primary_key=True, index=True)
    node_type = Column(String)
    node_id = Column(Integer)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float)
    safety_stock = Column(Float)
    last_updated = Column(DateTime(timezone=True), default=func.now())

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String, unique=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float)
    status = Column(String)
    promised_delivery = Column(DateTime(timezone=True))
    priority = Column(Integer)
    sla_penalty_per_day = Column(Float)

class Disruption(Base):
    __tablename__ = "disruptions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    disruption_type = Column(String)
    severity = Column(String)
    status = Column(String)
    source_node_type = Column(String)
    source_node_id = Column(Integer)
    description = Column(Text)
    started_at = Column(DateTime(timezone=True), default=func.now())
    estimated_delay_hours = Column(Float)
    financial_exposure = Column(Float)

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, nullable=True)
    disruption_type = Column(String)
    delay_hours = Column(Float)
    run_at = Column(DateTime(timezone=True), default=func.now())
    status = Column(String)
    total_financial_exposure = Column(Float)
    nodes_affected = Column(Integer)
    shipments_affected = Column(Integer)

class SimulationImpactNode(Base):
    __tablename__ = "simulation_impact_nodes"
    id = Column(Integer, primary_key=True, index=True)
    simulation_run_id = Column(Integer, ForeignKey("simulation_runs.id"))
    node_type = Column(String)
    node_id = Column(Integer)
    node_name = Column(String)
    impact_type = Column(String)
    severity = Column(String)
    delay_hours = Column(Float)
    inventory_breach = Column(Boolean)
    shortage_quantity = Column(Float)
    production_loss_hours = Column(Float)
    financial_impact = Column(Float)
    reason = Column(Text)
    sequence_order = Column(Integer)

class RecoveryOption(Base):
    __tablename__ = "recovery_options"
    id = Column(Integer, primary_key=True, index=True)
    simulation_run_id = Column(Integer, ForeignKey("simulation_runs.id"))
    option_type = Column(String)
    name = Column(String)
    description = Column(Text)
    cost = Column(Float)
    lead_time_improvement_hours = Column(Float)
    recovery_quality_pct = Column(Float)
    remaining_risk_pct = Column(Float)
    expected_savings = Column(Float)
    feasible = Column(Boolean)
    recommended = Column(Boolean)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String)
    severity = Column(String)
    title = Column(String)
    description = Column(Text)
    source_node_type = Column(String)
    source_node_id = Column(Integer)
    simulation_run_id = Column(Integer, ForeignKey("simulation_runs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    is_read = Column(Boolean, default=False)

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    scenario_type = Column(String)
    config_json = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
