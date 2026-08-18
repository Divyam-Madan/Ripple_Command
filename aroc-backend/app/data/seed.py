from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import (
    Supplier, Factory, Warehouse, TransportHub, Dealer,
    Product, Route, Shipment, InventoryRecord, Order,
    Disruption, Alert, Scenario
)
from datetime import datetime, timedelta, timezone
import random

random.seed(42)  # deterministic seed

async def seed_database(db: AsyncSession):
    # Guard: idempotent
    if (await db.execute(select(Supplier))).scalars().first():
        return

    now = datetime.now(timezone.utc)

    # ─── SUPPLIERS (15) ────────────────────────────────────────────────────────
    suppliers_data = [
        dict(name="Tata Metalics",       code="S01", location_name="Jamshedpur",  lat=22.80, lng=86.18, country="India", capacity=5000,  reliability_score=0.94, lead_time_days=3, cost_per_unit=2800,  risk_level="low",    status="active"),
        dict(name="Minda Industries",    code="S02", location_name="Pune",         lat=18.52, lng=73.86, country="India", capacity=3000,  reliability_score=0.91, lead_time_days=2, cost_per_unit=1200,  risk_level="low",    status="active"),
        dict(name="Motherson Sumi",      code="S03", location_name="Noida",        lat=28.57, lng=77.32, country="India", capacity=4500,  reliability_score=0.78, lead_time_days=4, cost_per_unit=3400,  risk_level="medium", status="active"),
        dict(name="Sundram Fasteners",   code="S04", location_name="Chennai",      lat=13.08, lng=80.27, country="India", capacity=8000,  reliability_score=0.96, lead_time_days=2, cost_per_unit=450,   risk_level="low",    status="active"),
        dict(name="Bharat Forge",        code="S05", location_name="Pune",         lat=18.62, lng=73.72, country="India", capacity=6000,  reliability_score=0.93, lead_time_days=5, cost_per_unit=5600,  risk_level="low",    status="active"),
        dict(name="Asahi India Glass",   code="S06", location_name="Rewari",       lat=28.20, lng=76.62, country="India", capacity=2000,  reliability_score=0.89, lead_time_days=3, cost_per_unit=2100,  risk_level="medium", status="active"),
        dict(name="CEAT Tyres",          code="S07", location_name="Nashik",       lat=19.99, lng=73.79, country="India", capacity=10000, reliability_score=0.92, lead_time_days=2, cost_per_unit=8500,  risk_level="low",    status="active"),
        dict(name="Lumax Industries",    code="S08", location_name="Gurgaon",      lat=28.45, lng=77.03, country="India", capacity=1500,  reliability_score=0.87, lead_time_days=3, cost_per_unit=4200,  risk_level="medium", status="active"),
        dict(name="Subros Limited",      code="S09", location_name="Noida",        lat=28.53, lng=77.39, country="India", capacity=1200,  reliability_score=0.75, lead_time_days=4, cost_per_unit=12000, risk_level="high",   status="active"),
        dict(name="Rane Group",          code="S10", location_name="Chennai",      lat=13.01, lng=80.21, country="India", capacity=3500,  reliability_score=0.90, lead_time_days=3, cost_per_unit=6800,  risk_level="low",    status="active"),
        dict(name="Suprajit Engineering",code="S11", location_name="Bengaluru",    lat=12.97, lng=77.59, country="India", capacity=4000,  reliability_score=0.88, lead_time_days=4, cost_per_unit=1800,  risk_level="medium", status="active"),
        dict(name="Rico Auto",           code="S12", location_name="Gurgaon",      lat=28.47, lng=77.06, country="India", capacity=2500,  reliability_score=0.82, lead_time_days=5, cost_per_unit=3100,  risk_level="high",   status="active"),
        dict(name="Shriram Pistons",     code="S13", location_name="Haridwar",     lat=29.94, lng=78.16, country="India", capacity=3000,  reliability_score=0.91, lead_time_days=3, cost_per_unit=2400,  risk_level="low",    status="active"),
        dict(name="Bosch India",         code="S14", location_name="Bengaluru",    lat=12.90, lng=77.60, country="India", capacity=5500,  reliability_score=0.97, lead_time_days=2, cost_per_unit=15000, risk_level="low",    status="active"),
        dict(name="Sandhar Technologies",code="S15", location_name="Delhi",        lat=28.61, lng=77.21, country="India", capacity=2000,  reliability_score=0.80, lead_time_days=4, cost_per_unit=3800,  risk_level="high",   status="active"),
    ]
    suppliers = [Supplier(**d) for d in suppliers_data]
    db.add_all(suppliers)
    await db.flush()

    # ─── FACTORIES (5) ─────────────────────────────────────────────────────────
    factories_data = [
        dict(name="Mahindra Pune Plant",      code="F01", location_name="Chakan, Pune",    lat=18.76, lng=73.86, production_rate_per_hour=45, capacity=20000, current_utilization=0.82, contribution_margin_per_unit=8000,  status="active"),
        dict(name="Maruti Manesar Plant",     code="F02", location_name="Manesar",          lat=28.35, lng=76.94, production_rate_per_hour=80, capacity=35000, current_utilization=0.91, contribution_margin_per_unit=6500,  status="active"),
        dict(name="Hyundai Chennai Plant",    code="F03", location_name="Sriperumbudur",    lat=12.97, lng=79.87, production_rate_per_hour=60, capacity=28000, current_utilization=0.78, contribution_margin_per_unit=9200,  status="active"),
        dict(name="Tata Motors Sanand",       code="F04", location_name="Sanand",           lat=22.99, lng=72.38, production_rate_per_hour=40, capacity=18000, current_utilization=0.75, contribution_margin_per_unit=7500,  status="active"),
        dict(name="Toyota Bidadi Plant",      code="F05", location_name="Bidadi",           lat=12.80, lng=77.39, production_rate_per_hour=35, capacity=15000, current_utilization=0.68, contribution_margin_per_unit=11000, status="active"),
    ]
    factories = [Factory(**d) for d in factories_data]
    db.add_all(factories)
    await db.flush()

    # ─── WAREHOUSES (12) ───────────────────────────────────────────────────────
    warehouses_data = [
        dict(name="Pune Central WH",       code="W01", location_name="Pune",        lat=18.52, lng=73.86, capacity=50000, current_inventory=32000, safety_stock_threshold=10000, status="active"),
        dict(name="Delhi NCR WH",          code="W02", location_name="Gurugram",     lat=28.45, lng=77.03, capacity=45000, current_inventory=28000, safety_stock_threshold=9000,  status="active"),
        dict(name="Chennai South WH",      code="W03", location_name="Chennai",      lat=13.08, lng=80.27, capacity=40000, current_inventory=22000, safety_stock_threshold=8000,  status="active"),
        dict(name="Mumbai JNPT WH",        code="W04", location_name="Navi Mumbai",  lat=18.95, lng=72.95, capacity=60000, current_inventory=41000, safety_stock_threshold=12000, status="active"),
        dict(name="Bengaluru Hub WH",      code="W05", location_name="Bengaluru",    lat=12.97, lng=77.59, capacity=35000, current_inventory=18000, safety_stock_threshold=7000,  status="active"),
        dict(name="Kolkata East WH",       code="W06", location_name="Kolkata",      lat=22.57, lng=88.36, capacity=30000, current_inventory=15000, safety_stock_threshold=6000,  status="active"),
        dict(name="Ahmedabad WH",          code="W07", location_name="Ahmedabad",    lat=23.02, lng=72.57, capacity=25000, current_inventory=19000, safety_stock_threshold=5000,  status="active"),
        dict(name="Hyderabad WH",          code="W08", location_name="Hyderabad",    lat=17.38, lng=78.48, capacity=28000, current_inventory=14000, safety_stock_threshold=5500,  status="active"),
        dict(name="Jaipur NW WH",          code="W09", location_name="Jaipur",       lat=26.91, lng=75.79, capacity=20000, current_inventory=11000, safety_stock_threshold=4000,  status="active"),
        dict(name="Nagpur Central WH",     code="W10", location_name="Nagpur",       lat=21.14, lng=79.08, capacity=22000, current_inventory=9500,  safety_stock_threshold=4400,  status="active"),
        dict(name="Ludhiana North WH",     code="W11", location_name="Ludhiana",     lat=30.90, lng=75.85, capacity=18000, current_inventory=7000,  safety_stock_threshold=3600,  status="warning"),
        dict(name="Kochi Port WH",         code="W12", location_name="Kochi",        lat=9.93,  lng=76.26, capacity=15000, current_inventory=6000,  safety_stock_threshold=3000,  status="active"),
    ]
    warehouses = [Warehouse(**d) for d in warehouses_data]
    db.add_all(warehouses)
    await db.flush()

    # ─── TRANSPORT HUBS (8) ────────────────────────────────────────────────────
    hubs_data = [
        dict(name="JNPT Mumbai",      hub_type="port",    location_name="Navi Mumbai",  lat=18.95, lng=72.95, throughput_capacity=100000, status="active"),
        dict(name="Chennai Port",     hub_type="port",    location_name="Chennai",      lat=13.08, lng=80.30, throughput_capacity=80000,  status="active"),
        dict(name="Mundra Port",      hub_type="port",    location_name="Mundra",       lat=22.83, lng=69.72, throughput_capacity=120000, status="active"),
        dict(name="Delhi ICD",        hub_type="rail",    location_name="Tughlakabad",  lat=28.52, lng=77.31, throughput_capacity=60000,  status="active"),
        dict(name="Bengaluru ICD",    hub_type="rail",    location_name="Whitefield",   lat=12.97, lng=77.75, throughput_capacity=40000,  status="active"),
        dict(name="Kolkata Dock",     hub_type="port",    location_name="Kolkata",      lat=22.54, lng=88.32, throughput_capacity=55000,  status="active"),
        dict(name="Hyderabad ICD",    hub_type="rail",    location_name="Hyderabad",    lat=17.38, lng=78.52, throughput_capacity=35000,  status="active"),
        dict(name="Delhi Air Cargo",  hub_type="air",     location_name="Delhi IGI",    lat=28.56, lng=77.10, throughput_capacity=25000,  status="active"),
    ]
    hubs = [TransportHub(**d) for d in hubs_data]
    db.add_all(hubs)
    await db.flush()

    # ─── DEALERS (15 for brevity but representative) ───────────────────────────
    dealer_cities = [
        ("Mumbai Central", "D01", 19.07, 72.87, 1200),
        ("Delhi East",     "D02", 28.65, 77.23, 1500),
        ("Pune Dealer",    "D03", 18.52, 73.86, 900),
        ("Bengaluru",      "D04", 12.97, 77.59, 1100),
        ("Chennai",        "D05", 13.08, 80.27, 1000),
        ("Hyderabad",      "D06", 17.38, 78.48, 850),
        ("Ahmedabad",      "D07", 23.02, 72.57, 700),
        ("Kolkata",        "D08", 22.57, 88.36, 800),
        ("Jaipur",         "D09", 26.91, 75.79, 550),
        ("Nagpur",         "D10", 21.14, 79.08, 480),
        ("Chandigarh",     "D11", 30.73, 76.78, 420),
        ("Surat",          "D12", 21.17, 72.83, 610),
        ("Kochi",          "D13",  9.93, 76.26, 380),
        ("Bhopal",         "D14", 23.25, 77.40, 350),
        ("Lucknow",        "D15", 26.84, 80.94, 460),
    ]
    dealers = [
        Dealer(name=f"{c[0]} Dealer", code=c[1], location_name=c[0], lat=c[2], lng=c[3], monthly_demand=c[4], status="active")
        for c in dealer_cities
    ]
    db.add_all(dealers)
    await db.flush()

    # ─── PRODUCTS (10) ─────────────────────────────────────────────────────────
    products_data = [
        dict(name="Engine Block",         sku="ENG-001", category="Powertrain",   unit_cost=45000, weight_kg=120.0),
        dict(name="Wiring Harness",       sku="WRG-003", category="Electrical",   unit_cost=3000,  weight_kg=15.0),
        dict(name="Dashboard Assembly",   sku="DSH-005", category="Interior",     unit_cost=8500,  weight_kg=12.0),
        dict(name="Chassis Frame",        sku="CHS-002", category="Structural",   unit_cost=62000, weight_kg=280.0),
        dict(name="Brake Assembly",       sku="BRK-007", category="Safety",       unit_cost=12000, weight_kg=25.0),
        dict(name="Seat Assembly",        sku="SAT-004", category="Interior",     unit_cost=18000, weight_kg=35.0),
        dict(name="Transmission Unit",    sku="TRN-006", category="Powertrain",   unit_cost=38000, weight_kg=85.0),
        dict(name="Fuel Injector Set",    sku="FUL-008", category="Fuel System",  unit_cost=9500,  weight_kg=4.0),
        dict(name="Tyre Set (4)",         sku="TYR-009", category="Tyres",        unit_cost=32000, weight_kg=80.0),
        dict(name="Windshield Glass",     sku="WND-010", category="Glazing",      unit_cost=7200,  weight_kg=22.0),
    ]
    products = [Product(**d) for d in products_data]
    db.add_all(products)
    await db.flush()

    # Build lookup maps
    sup = {s.code: s for s in suppliers}
    fac = {f.code: f for f in factories}
    wh  = {w.code: w for w in warehouses}
    pro = {p.sku: p for p in products}

    # ─── ROUTES (representative set) ───────────────────────────────────────────
    routes_data = [
        # S03 → F01 (the disruption route)
        dict(origin_type="supplier",  origin_id=sup["S03"].id, destination_type="factory", destination_id=fac["F01"].id, transport_mode="road",  distance_km=1480, transit_time_hours=36, cost_per_unit=180, delay_probability=0.28, reliability_score=0.72, status="active"),
        dict(origin_type="supplier",  origin_id=sup["S03"].id, destination_type="factory", destination_id=fac["F02"].id, transport_mode="road",  distance_km=210,  transit_time_hours=5,  cost_per_unit=45,  delay_probability=0.12, reliability_score=0.88, status="active"),
        # S01 → F01, F04
        dict(origin_type="supplier",  origin_id=sup["S01"].id, destination_type="factory", destination_id=fac["F01"].id, transport_mode="road",  distance_km=1900, transit_time_hours=42, cost_per_unit=210, delay_probability=0.10, reliability_score=0.90, status="active"),
        dict(origin_type="supplier",  origin_id=sup["S01"].id, destination_type="factory", destination_id=fac["F04"].id, transport_mode="rail",  distance_km=1600, transit_time_hours=30, cost_per_unit=160, delay_probability=0.08, reliability_score=0.92, status="active"),
        # S14 → F01, F02, F03
        dict(origin_type="supplier",  origin_id=sup["S14"].id, destination_type="factory", destination_id=fac["F01"].id, transport_mode="road",  distance_km=850,  transit_time_hours=18, cost_per_unit=120, delay_probability=0.06, reliability_score=0.94, status="active"),
        dict(origin_type="supplier",  origin_id=sup["S14"].id, destination_type="factory", destination_id=fac["F03"].id, transport_mode="road",  distance_km=350,  transit_time_hours=8,  cost_per_unit=65,  delay_probability=0.05, reliability_score=0.95, status="active"),
        # S04 → F03, F05
        dict(origin_type="supplier",  origin_id=sup["S04"].id, destination_type="factory", destination_id=fac["F03"].id, transport_mode="road",  distance_km=80,   transit_time_hours=2,  cost_per_unit=20,  delay_probability=0.04, reliability_score=0.96, status="active"),
        dict(origin_type="supplier",  origin_id=sup["S04"].id, destination_type="factory", destination_id=fac["F05"].id, transport_mode="road",  distance_km=520,  transit_time_hours=12, cost_per_unit=80,  delay_probability=0.06, reliability_score=0.94, status="active"),
        # S07 → All factories
        dict(origin_type="supplier",  origin_id=sup["S07"].id, destination_type="factory", destination_id=fac["F01"].id, transport_mode="road",  distance_km=180,  transit_time_hours=5,  cost_per_unit=40,  delay_probability=0.07, reliability_score=0.93, status="active"),
        dict(origin_type="supplier",  origin_id=sup["S07"].id, destination_type="factory", destination_id=fac["F02"].id, transport_mode="road",  distance_km=1100, transit_time_hours=24, cost_per_unit=130, delay_probability=0.09, reliability_score=0.91, status="active"),
        # Factories → Warehouses
        dict(origin_type="factory",   origin_id=fac["F01"].id, destination_type="warehouse", destination_id=wh["W01"].id, transport_mode="road", distance_km=25,  transit_time_hours=1,  cost_per_unit=15,  delay_probability=0.03, reliability_score=0.97, status="active"),
        dict(origin_type="factory",   origin_id=fac["F02"].id, destination_type="warehouse", destination_id=wh["W02"].id, transport_mode="road", distance_km=30,  transit_time_hours=1,  cost_per_unit=18,  delay_probability=0.03, reliability_score=0.97, status="active"),
        dict(origin_type="factory",   origin_id=fac["F03"].id, destination_type="warehouse", destination_id=wh["W03"].id, transport_mode="road", distance_km=60,  transit_time_hours=2,  cost_per_unit=22,  delay_probability=0.04, reliability_score=0.96, status="active"),
        dict(origin_type="factory",   origin_id=fac["F01"].id, destination_type="warehouse", destination_id=wh["W04"].id, transport_mode="road", distance_km=150, transit_time_hours=4,  cost_per_unit=35,  delay_probability=0.05, reliability_score=0.95, status="active"),
        # Warehouses → Dealers (sample)
        dict(origin_type="warehouse", origin_id=wh["W01"].id, destination_type="dealer", destination_id=dealers[2].id, transport_mode="road", distance_km=12,  transit_time_hours=1,  cost_per_unit=10, delay_probability=0.02, reliability_score=0.98, status="active"),
        dict(origin_type="warehouse", origin_id=wh["W02"].id, destination_type="dealer", destination_id=dealers[1].id, transport_mode="road", distance_km=25,  transit_time_hours=1,  cost_per_unit=12, delay_probability=0.02, reliability_score=0.98, status="active"),
    ]
    routes = [Route(**d) for d in routes_data]
    db.add_all(routes)
    await db.flush()

    # ─── INVENTORY RECORDS ─────────────────────────────────────────────────────
    inventory_records = [
        # Factory inventories (F01 has borderline stock for wiring harness — enables flagship demo)
        InventoryRecord(node_type="factory", node_id=fac["F01"].id, product_id=pro["WRG-003"].id, quantity=900,   safety_stock=1500),
        InventoryRecord(node_type="factory", node_id=fac["F01"].id, product_id=pro["ENG-001"].id, quantity=4200,  safety_stock=2000),
        InventoryRecord(node_type="factory", node_id=fac["F02"].id, product_id=pro["WRG-003"].id, quantity=5500,  safety_stock=2000),
        InventoryRecord(node_type="factory", node_id=fac["F02"].id, product_id=pro["CHS-002"].id, quantity=1800,  safety_stock=800),
        InventoryRecord(node_type="factory", node_id=fac["F03"].id, product_id=pro["BRK-007"].id, quantity=3200,  safety_stock=1200),
        InventoryRecord(node_type="factory", node_id=fac["F04"].id, product_id=pro["TRN-006"].id, quantity=850,   safety_stock=400),
        InventoryRecord(node_type="factory", node_id=fac["F05"].id, product_id=pro["SAT-004"].id, quantity=2100,  safety_stock=900),
        # Warehouse inventories
        InventoryRecord(node_type="warehouse", node_id=wh["W01"].id, product_id=pro["ENG-001"].id, quantity=1200, safety_stock=500),
        InventoryRecord(node_type="warehouse", node_id=wh["W02"].id, product_id=pro["WRG-003"].id, quantity=8000, safety_stock=3000),
        InventoryRecord(node_type="warehouse", node_id=wh["W03"].id, product_id=pro["BRK-007"].id, quantity=2500, safety_stock=1000),
        InventoryRecord(node_type="warehouse", node_id=wh["W04"].id, product_id=pro["TYR-009"].id, quantity=4800, safety_stock=2000),
        InventoryRecord(node_type="warehouse", node_id=wh["W11"].id, product_id=pro["DSH-005"].id, quantity=320,  safety_stock=400),  # below safety stock → warning
    ]
    db.add_all(inventory_records)
    await db.flush()

    # ─── SHIPMENTS (100+) ──────────────────────────────────────────────────────
    shipments = []
    carriers = ["BlueDart", "Gati", "DTDC", "Delhivery", "XpressBees", "TCI", "Safexpress"]
    statuses_pool = (
        ["in_transit"] * 55 +
        ["delivered"] * 25 +
        ["delayed"] * 10 +
        ["at_risk"] * 7 +
        ["pending"] * 3
    )

    # Flagship S03 → F01 shipments (ensure these exist for demo)
    flagship_shipments = [
        Shipment(shipment_code="SHP-S03-F01-001", product_id=pro["WRG-003"].id, quantity=500,
            origin_type="supplier", origin_id=sup["S03"].id,
            destination_type="factory", destination_id=fac["F01"].id,
            carrier="BlueDart", transport_mode="road", status="in_transit",
            planned_departure=now - timedelta(hours=18), planned_arrival=now + timedelta(hours=18),
            predicted_arrival=now + timedelta(hours=30),  # already 12h late
            current_location_name="Indore", current_lat=22.72, current_lng=75.86,
            delay_hours=12.0, delay_probability=0.78, risk_level="high"),
        Shipment(shipment_code="SHP-S03-F01-002", product_id=pro["WRG-003"].id, quantity=700,
            origin_type="supplier", origin_id=sup["S03"].id,
            destination_type="factory", destination_id=fac["F01"].id,
            carrier="Gati", transport_mode="road", status="pending",
            planned_departure=now + timedelta(hours=6), planned_arrival=now + timedelta(days=4),
            predicted_arrival=now + timedelta(days=4),
            current_location_name="Noida", current_lat=28.57, current_lng=77.32,
            delay_hours=0.0, delay_probability=0.45, risk_level="medium"),
        Shipment(shipment_code="SHP-S03-F02-001", product_id=pro["DSH-005"].id, quantity=300,
            origin_type="supplier", origin_id=sup["S03"].id,
            destination_type="factory", destination_id=fac["F02"].id,
            carrier="DTDC", transport_mode="road", status="in_transit",
            planned_departure=now - timedelta(hours=4), planned_arrival=now + timedelta(hours=3),
            predicted_arrival=now + timedelta(hours=3),
            current_location_name="Rewari", current_lat=28.20, current_lng=76.62,
            delay_hours=0.0, delay_probability=0.22, risk_level="low"),
    ]
    shipments.extend(flagship_shipments)

    # Generate remaining shipments (mix of suppliers/factories/warehouses)
    route_pairs = [
        (sup["S01"].id, "supplier", fac["F01"].id, "factory",    pro["ENG-001"].id, "TCI",       "rail"),
        (sup["S01"].id, "supplier", fac["F04"].id, "factory",    pro["ENG-001"].id, "Safexpress","rail"),
        (sup["S14"].id, "supplier", fac["F01"].id, "factory",    pro["FUL-008"].id, "BlueDart",  "road"),
        (sup["S14"].id, "supplier", fac["F03"].id, "factory",    pro["FUL-008"].id, "Gati",      "road"),
        (sup["S04"].id, "supplier", fac["F03"].id, "factory",    pro["BRK-007"].id, "DTDC",      "road"),
        (sup["S04"].id, "supplier", fac["F05"].id, "factory",    pro["BRK-007"].id, "Delhivery", "road"),
        (sup["S05"].id, "supplier", fac["F01"].id, "factory",    pro["CHS-002"].id, "TCI",       "road"),
        (sup["S05"].id, "supplier", fac["F02"].id, "factory",    pro["CHS-002"].id, "Safexpress","road"),
        (sup["S07"].id, "supplier", fac["F01"].id, "factory",    pro["TYR-009"].id, "XpressBees","road"),
        (sup["S07"].id, "supplier", fac["F02"].id, "factory",    pro["TYR-009"].id, "BlueDart",  "road"),
        (sup["S07"].id, "supplier", fac["F03"].id, "factory",    pro["TYR-009"].id, "Gati",      "road"),
        (sup["S09"].id, "supplier", fac["F02"].id, "factory",    pro["DSH-005"].id, "DTDC",      "road"),
        (sup["S12"].id, "supplier", fac["F01"].id, "factory",    pro["TRN-006"].id, "TCI",       "road"),
        (fac["F01"].id, "factory",  wh["W01"].id,  "warehouse",  pro["ENG-001"].id, "BlueDart",  "road"),
        (fac["F02"].id, "factory",  wh["W02"].id,  "warehouse",  pro["CHS-002"].id, "Gati",      "road"),
        (fac["F03"].id, "factory",  wh["W03"].id,  "warehouse",  pro["BRK-007"].id, "DTDC",      "road"),
        (fac["F01"].id, "factory",  wh["W04"].id,  "warehouse",  pro["WRG-003"].id, "Safexpress","road"),
        (wh["W01"].id,  "warehouse",dealers[0].id, "dealer",     pro["ENG-001"].id, "Delhivery", "road"),
        (wh["W02"].id,  "warehouse",dealers[1].id, "dealer",     pro["CHS-002"].id, "BlueDart",  "road"),
        (wh["W03"].id,  "warehouse",dealers[4].id, "dealer",     pro["BRK-007"].id, "DTDC",      "road"),
    ]

    idx = 100
    locations = [
        ("Nagpur", 21.14, 79.08), ("Indore", 22.72, 75.86), ("Bhopal", 23.25, 77.40),
        ("Surat", 21.17, 72.83),  ("Vadodara", 22.31, 73.18), ("Nashik", 19.99, 73.79),
        ("Agra", 27.18, 78.01),   ("Kanpur", 26.46, 80.33),  ("Vizag", 17.69, 83.22),
        ("Coimbatore", 11.02, 76.97), ("Mysuru", 12.30, 76.64), ("Kochi", 9.93, 76.26),
    ]

    for pair in route_pairs:
        org_id, org_type, dst_id, dst_type, prod_id, carrier, mode = pair
        for batch in range(4):
            status = statuses_pool[(idx + batch) % len(statuses_pool)]
            days_ago = random.randint(0, 4)
            days_ahead = random.randint(1, 5)
            delay_h = random.choice([0, 0, 0, 4, 8, 12, 18, 24]) if status in ("delayed", "at_risk") else 0
            d_prob = (0.6 + random.random() * 0.35) if status in ("delayed", "at_risk") else (random.random() * 0.25)
            loc = random.choice(locations)
            risk = "high" if status in ("delayed", "at_risk") else ("medium" if d_prob > 0.3 else "low")
            shipments.append(Shipment(
                shipment_code=f"SHP-{idx:04d}-{batch}",
                product_id=prod_id,
                quantity=random.randint(100, 1000),
                origin_type=org_type, origin_id=org_id,
                destination_type=dst_type, destination_id=dst_id,
                carrier=carrier, transport_mode=mode, status=status,
                planned_departure=now - timedelta(days=days_ago),
                planned_arrival=now + timedelta(days=days_ahead),
                predicted_arrival=now + timedelta(days=days_ahead, hours=delay_h),
                current_location_name=loc[0], current_lat=loc[1], current_lng=loc[2],
                delay_hours=float(delay_h), delay_probability=round(d_prob, 2), risk_level=risk,
            ))
        idx += 10

    db.add_all(shipments)
    await db.flush()

    # ─── ORDERS ────────────────────────────────────────────────────────────────
    orders_data = [
        dict(order_code="ORD-9001", product_id=pro["WRG-003"].id, quantity=2000, status="active", promised_delivery=now + timedelta(days=5),  priority=1, sla_penalty_per_day=50000),
        dict(order_code="ORD-9002", product_id=pro["ENG-001"].id, quantity=500,  status="active", promised_delivery=now + timedelta(days=7),  priority=1, sla_penalty_per_day=75000),
        dict(order_code="ORD-9003", product_id=pro["CHS-002"].id, quantity=300,  status="active", promised_delivery=now + timedelta(days=10), priority=2, sla_penalty_per_day=60000),
        dict(order_code="ORD-9004", product_id=pro["TRN-006"].id, quantity=200,  status="active", promised_delivery=now + timedelta(days=8),  priority=2, sla_penalty_per_day=45000),
        dict(order_code="ORD-9005", product_id=pro["BRK-007"].id, quantity=1500, status="active", promised_delivery=now + timedelta(days=6),  priority=1, sla_penalty_per_day=30000),
        dict(order_code="ORD-9006", product_id=pro["TYR-009"].id, quantity=800,  status="active", promised_delivery=now + timedelta(days=4),  priority=1, sla_penalty_per_day=25000),
        dict(order_code="ORD-9007", product_id=pro["DSH-005"].id, quantity=400,  status="active", promised_delivery=now + timedelta(days=9),  priority=3, sla_penalty_per_day=20000),
        dict(order_code="ORD-9008", product_id=pro["SAT-004"].id, quantity=600,  status="active", promised_delivery=now + timedelta(days=12), priority=3, sla_penalty_per_day=18000),
        dict(order_code="ORD-9009", product_id=pro["FUL-008"].id, quantity=1200, status="active", promised_delivery=now + timedelta(days=3),  priority=1, sla_penalty_per_day=35000),
        dict(order_code="ORD-9010", product_id=pro["WND-010"].id, quantity=350,  status="active", promised_delivery=now + timedelta(days=14), priority=4, sla_penalty_per_day=12000),
        # A few fulfilled
        dict(order_code="ORD-8001", product_id=pro["ENG-001"].id, quantity=200,  status="fulfilled", promised_delivery=now - timedelta(days=2), priority=1, sla_penalty_per_day=50000),
        dict(order_code="ORD-8002", product_id=pro["WRG-003"].id, quantity=900,  status="fulfilled", promised_delivery=now - timedelta(days=5), priority=2, sla_penalty_per_day=30000),
    ]
    orders = [Order(**d) for d in orders_data]
    db.add_all(orders)
    await db.flush()

    # ─── DISRUPTIONS ───────────────────────────────────────────────────────────
    disruptions_data = [
        Disruption(title="Motherson Sumi Delivery Delay", disruption_type="supplier_delay", severity="high",
            status="active", source_node_type="supplier", source_node_id=sup["S03"].id,
            description="Shipment SHP-S03-F01-001 from Motherson Sumi (Noida) delayed 12h due to highway closure on NH-44.",
            estimated_delay_hours=12.0, financial_exposure=4850000.0),
        Disruption(title="Ludhiana WH Below Safety Stock", disruption_type="warehouse_stockout", severity="medium",
            status="active", source_node_type="warehouse", source_node_id=wh["W11"].id,
            description="Dashboard assembly inventory in Ludhiana WH has dropped below safety stock threshold.",
            estimated_delay_hours=0.0, financial_exposure=850000.0),
    ]
    db.add_all(disruptions_data)
    await db.flush()

    # ─── ALERTS ────────────────────────────────────────────────────────────────
    alerts_data = [
        Alert(alert_type="disruption", severity="high",    title="S03 Shipment Delayed 12h",               description="Motherson Sumi shipment to Pune Plant at risk. Wiring harness inventory may breach safety stock by ~7h.",          source_node_type="supplier",  source_node_id=sup["S03"].id, is_read=False),
        Alert(alert_type="inventory",  severity="medium",  title="Ludhiana WH: Dashboard Stock Critical",  description="Current stock 320 units vs safety stock 400 units. Reorder recommended.",                                          source_node_type="warehouse", source_node_id=wh["W11"].id,  is_read=False),
        Alert(alert_type="risk",       severity="medium",  title="Subros Limited Risk Elevated",           description="Subros (S09) reliability score dropped to 0.75. Consider alternate supplier qualification.",                       source_node_type="supplier",  source_node_id=sup["S09"].id, is_read=False),
        Alert(alert_type="shipment",   severity="low",     title="3 Shipments Approaching SLA Threshold",  description="SHP-9100-0, SHP-9100-2, SHP-9110-1 are within 24h of SLA breach. Monitor closely.",                              source_node_type="supplier",  source_node_id=sup["S01"].id, is_read=True),
        Alert(alert_type="system",     severity="informational", title="Daily Health Score: 91.4",         description="Supply chain health score computed at 91.4 / 100. 2 active disruptions. See dashboard for full breakdown.",         source_node_type="supplier",  source_node_id=sup["S01"].id, is_read=True),
    ]
    db.add_all(alerts_data)
    await db.flush()

    # ─── SCENARIOS ─────────────────────────────────────────────────────────────
    import json
    scenarios_data = [
        Scenario(name="Normal Operations",       description="Baseline healthy state with all suppliers on-time and optimal inventory.",            scenario_type="baseline",   config_json=json.dumps({"supplier_id": None, "disruption_type": None, "delay_hours": 0})),
        Scenario(name="S03 Delay — 12 Hours",    description="Motherson Sumi (S03) delayed 12h. Flagship SIH demo scenario. Triggers cascade to F01.", scenario_type="supplier_delay", config_json=json.dumps({"supplier_id": 3, "disruption_type": "supplier_delay", "delay_hours": 12})),
        Scenario(name="Monsoon Route Disruption",description="NH-44 closed due to monsoon flooding. Affects all road shipments Noida → Pune.",        scenario_type="route_closure", config_json=json.dumps({"supplier_id": 3, "disruption_type": "route_closure", "delay_hours": 24})),
        Scenario(name="Truck Breakdown",         description="BlueDart fleet breakdown affects 8 shipments across 3 routes.",                          scenario_type="truck_breakdown", config_json=json.dumps({"supplier_id": 3, "disruption_type": "truck_breakdown", "delay_hours": 18})),
        Scenario(name="Ludhiana WH Shortage",    description="Dashboard assembly stock below safety stock in Ludhiana warehouse.",                     scenario_type="warehouse_stockout", config_json=json.dumps({"supplier_id": 8, "disruption_type": "warehouse_stockout", "delay_hours": 0})),
        Scenario(name="Route Closure NH-44",     description="National Highway 44 closed for 36h due to accident. All road freight rerouted.",         scenario_type="route_closure", config_json=json.dumps({"supplier_id": 3, "disruption_type": "route_closure", "delay_hours": 36})),
        Scenario(name="Demand Surge — Festive",  description="Festive season demand surge. Dealer orders 40% above forecast across top 10 cities.",    scenario_type="demand_surge", config_json=json.dumps({"supplier_id": None, "disruption_type": "demand_surge", "delay_hours": 0, "demand_multiplier": 1.4})),
        Scenario(name="JNPT Port Congestion",    description="Port congestion at JNPT Mumbai adds 48h to all sea freight shipments.",                  scenario_type="port_congestion", config_json=json.dumps({"supplier_id": None, "disruption_type": "port_congestion", "delay_hours": 48})),
    ]
    db.add_all(scenarios_data)
    await db.commit()
