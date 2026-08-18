from __future__ import annotations
from enum import Enum


class NodeType(str, Enum):
    supplier = "supplier"
    factory = "factory"
    warehouse = "warehouse"
    transport_hub = "transport_hub"
    dealer = "dealer"
    customer = "customer"


class NodeStatus(str, Enum):
    healthy = "healthy"
    warning = "warning"
    critical = "critical"
    inactive = "inactive"


class EdgeType(str, Enum):
    supply_dependency = "supply_dependency"
    transport_route = "transport_route"
    inventory_flow = "inventory_flow"
    order_dependency = "order_dependency"


class DisruptionType(str, Enum):
    supplier_delay = "supplier_delay"
    shipment_delay = "shipment_delay"
    truck_breakdown = "truck_breakdown"
    route_closure = "route_closure"
    weather_disruption = "weather_disruption"
    warehouse_stockout = "warehouse_stockout"
    port_congestion = "port_congestion"
    demand_surge = "demand_surge"


class DisruptionStatus(str, Enum):
    active = "active"
    simulated = "simulated"
    resolved = "resolved"


class ShipmentStatus(str, Enum):
    planned = "planned"
    in_transit = "in_transit"
    delayed = "delayed"
    delivered = "delivered"
    cancelled = "cancelled"


class TransportMode(str, Enum):
    road = "road"
    rail = "rail"
    sea = "sea"
    air = "air"


class RecoveryType(str, Enum):
    expedite_shipment = "expedite_shipment"
    alternate_supplier = "alternate_supplier"
    warehouse_reallocation = "warehouse_reallocation"
    do_nothing = "do_nothing"


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    informational = "informational"


class SimulationStatus(str, Enum):
    running = "running"
    completed = "completed"
    failed = "failed"
