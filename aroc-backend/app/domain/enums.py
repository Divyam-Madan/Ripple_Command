from enum import Enum

class ShipmentStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELAYED = "delayed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    AT_RISK = "at_risk"

class DisruptionType(str, Enum):
    SUPPLIER_DELAY = "supplier_delay"
    SHIPMENT_DELAY = "shipment_delay"
    TRUCK_BREAKDOWN = "truck_breakdown"
    ROUTE_CLOSURE = "route_closure"
    WEATHER = "weather_disruption"
    WAREHOUSE_STOCKOUT = "warehouse_stockout"
    PORT_CONGESTION = "port_congestion"
    DEMAND_SURGE = "demand_surge"

class NodeType(str, Enum):
    SUPPLIER = "supplier"
    FACTORY = "factory"
    WAREHOUSE = "warehouse"
    TRANSPORT_HUB = "transport_hub"
    DEALER = "dealer"
    CUSTOMER = "customer"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RecoveryOptionType(str, Enum):
    EXPEDITE = "expedite"
    ALTERNATE_SUPPLIER = "alternate_supplier"
    WAREHOUSE_REALLOCATION = "warehouse_reallocation"
    DO_NOTHING = "do_nothing"
