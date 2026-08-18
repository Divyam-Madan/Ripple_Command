"""
Deterministic synthetic seed data: an Indian automotive component network.

Fixed random seed (42) so every fresh DEMO_MODE boot produces the same
network, the same flagship scenario, and the same numbers - required for a
repeatable SIH demonstration and for the unit tests that assert on it.

Everything downstream (dashboard KPIs, simulation, optimization, copilot
answers) is derived from these rows. No screen invents its own numbers.
"""
from __future__ import annotations

import datetime as dt
import random

from sqlalchemy.orm import Session

from app.db import models as m
from app.db.session import get_session_factory, init_db

RNG_SEED = 42

CITIES = [
    ("Chennai", 13.0827, 80.2707),
    ("Sriperumbudur", 12.9675, 79.9436),
    ("Hosur", 12.7409, 77.8253),
    ("Coimbatore", 11.0168, 76.9558),
    ("Bengaluru", 12.9716, 77.5946),
    ("Pune", 18.5204, 73.8567),
    ("Chakan", 18.7614, 73.8647),
    ("Nashik", 19.9975, 73.7898),
    ("Aurangabad", 19.8762, 75.3433),
    ("Ahmedabad", 23.0225, 72.5714),
    ("Sanand", 22.9917, 72.3833),
    ("Vadodara", 22.3072, 73.1812),
    ("Gurugram", 28.4595, 77.0266),
    ("Manesar", 28.3540, 76.9350),
    ("Faridabad", 28.4089, 77.3178),
    ("Rewari", 28.1990, 76.6173),
    ("Pithampur", 22.6062, 75.6836),
    ("Jamshedpur", 22.8046, 86.2029),
    ("Rudrapur", 28.9877, 79.4139),
    ("Vizag", 17.6868, 83.2185),
]

SUPPLIER_FRAGMENTS = [
    "Precision Forgings", "Auto Components", "Deccan Castings", "Metal Works",
    "Electricals", "Fastener Industries", "Rubber & Polymer", "Die Casting",
    "Bearings Ltd", "Wiring Systems", "Sheet Metal", "Sensors & Systems",
    "Tooling Co", "Alloy Works", "Precision Instruments",
]

PRODUCTS = [
    ("ECU-100", "Engine Control Unit", 4200.0, 6800.0),
    ("ALT-220", "Alternator Assembly", 2600.0, 4100.0),
    ("BRK-310", "Brake Caliper Set", 1800.0, 2900.0),
    ("SUS-410", "Suspension Strut", 2100.0, 3300.0),
    ("WIR-500", "Wiring Harness", 950.0, 1600.0),
    ("SEN-610", "Sensor Module Pack", 1200.0, 2000.0),
]

TRANSPORT_MODES = ["road", "rail", "sea", "air"]


def _jitter(lat: float, lon: float, rng: random.Random) -> tuple[float, float]:
    return lat + rng.uniform(-0.35, 0.35), lon + rng.uniform(-0.35, 0.35)


def seed_all(reset: bool = True) -> None:
    init_db()
    SessionLocal = get_session_factory()
    session: Session = SessionLocal()
    try:
        if reset:
            for table in reversed(m.Base.metadata.sorted_tables):
                session.execute(table.delete())
            session.commit()

        rng = random.Random(RNG_SEED)
        now = dt.datetime.now(dt.timezone.utc)

        # --- roles / user -------------------------------------------------
        admin_role = m.Role(name="admin", description="Full read/write access")
        planner_role = m.Role(name="planner", description="Simulation and recovery planning")
        viewer_role = m.Role(name="viewer", description="Read-only")
        session.add_all([admin_role, planner_role, viewer_role])
        session.flush()
        session.add(
            m.User(name="Ops Controller", email="controller@aroc.local", role_id=admin_role.id)
        )

        # --- products -------------------------------------------------------
        products = []
        for sku, name, cost, price in PRODUCTS:
            p = m.Product(sku=sku, name=name, unit_cost=cost, unit_price=price,
                           sla_penalty_per_unit_per_day=cost * 0.015)
            session.add(p)
            products.append(p)
        session.flush()

        # --- suppliers (15) ---------------------------------------------
        suppliers = []
        for i in range(1, 16):
            city, lat, lon = CITIES[(i - 1) % len(CITIES)]
            jlat, jlon = _jitter(lat, lon, rng)
            frag = SUPPLIER_FRAGMENTS[(i - 1) % len(SUPPLIER_FRAGMENTS)]
            s = m.Supplier(
                name=f"S{i} \u00b7 {city} {frag}",
                city=city, lat=jlat, lon=jlon,
                capacity_units_per_week=rng.uniform(800, 4000),
                lead_time_days=rng.uniform(1.5, 9.0),
                reliability=rng.uniform(0.86, 0.99),
                risk_score=rng.uniform(5, 35),
                status="healthy",
            )
            session.add(s)
            suppliers.append(s)
        session.flush()
        supplier_by_code = {f"S{i}": suppliers[i - 1] for i in range(1, 16)}

        # --- factories (5) -------------------------------------------------
        factories = []
        for i in range(1, 6):
            city, lat, lon = CITIES[(i * 3) % len(CITIES)]
            jlat, jlon = _jitter(lat, lon, rng)
            production_rate = rng.uniform(180, 420)
            f = m.Factory(
                name=f"F{i} \u00b7 {city} Assembly Plant",
                city=city, lat=jlat, lon=jlon,
                production_rate_units_per_day=production_rate,
                material_required_per_unit=rng.uniform(0.9, 1.4),
                contribution_margin_per_unit=rng.uniform(900, 2200),
                num_production_lines=rng.choice([2, 3, 4]),
                raw_material_buffer_units=production_rate * rng.uniform(1.6, 3.2),
                status="healthy",
            )
            session.add(f)
            factories.append(f)
        session.flush()
        factory_by_code = {f"F{i}": factories[i - 1] for i in range(1, 6)}

        # Flagship wiring: S3 is the SOLE critical supplier of F1's key input,
        # with a deliberately thin on-site buffer so a 12h delay produces a
        # real, non-trivial breach (not scripted - just realistically tight).
        f1 = factory_by_code["F1"]
        f1.material_required_per_unit = 1.15
        f1.production_rate_units_per_day = 288.0
        f1.raw_material_buffer_units = 50.0  # ~3.6h of true cover - genuinely tight
        f1.num_production_lines = 3
        f1.contribution_margin_per_unit = 1450.0

        # --- warehouses (12) -------------------------------------------
        warehouses = []
        for i in range(1, 13):
            city, lat, lon = CITIES[(i * 2 + 1) % len(CITIES)]
            jlat, jlon = _jitter(lat, lon, rng)
            capacity = rng.uniform(3000, 9000)
            w = m.Warehouse(
                name=f"W{i} \u00b7 {city} DC",
                city=city, lat=jlat, lon=jlon,
                capacity_units=capacity,
                safety_stock_units=capacity * rng.uniform(0.12, 0.22),
                on_hand_units=capacity * rng.uniform(0.35, 0.7),
                status="healthy",
            )
            session.add(w)
            warehouses.append(w)
        session.flush()
        warehouse_by_code = {f"W{i}": warehouses[i - 1] for i in range(1, 13)}

        w4 = warehouse_by_code["W4"]
        w4.capacity_units = 6200.0
        w4.safety_stock_units = 900.0
        w4.on_hand_units = 910.0  # thin cushion - replenishment-dependent

        # --- transport hubs (8) -----------------------------------------
        hubs = []
        for i in range(1, 9):
            city, lat, lon = CITIES[(i * 5) % len(CITIES)]
            jlat, jlon = _jitter(lat, lon, rng)
            h = m.TransportHub(
                name=f"H{i} \u00b7 {city} Logistics Hub", city=city, lat=jlat, lon=jlon,
                throughput_units_per_day=rng.uniform(3000, 9000), status="healthy",
            )
            session.add(h)
            hubs.append(h)
        session.flush()

        # --- dealers (30) ---------------------------------------------------
        dealers = []
        for i in range(1, 31):
            city, lat, lon = CITIES[(i * 7) % len(CITIES)]
            jlat, jlon = _jitter(lat, lon, rng)
            demand = rng.uniform(60, 340)
            d = m.Dealer(
                name=f"D{i} \u00b7 {city} Dealership",
                city=city, lat=jlat, lon=jlon,
                demand_units_per_week=demand,
                on_hand_units=demand * rng.uniform(0.4, 1.3),
                status="healthy",
            )
            session.add(d)
            dealers.append(d)
        session.flush()
        dealer_by_code = {f"D{i}": dealers[i - 1] for i in range(1, 31)}

        d12 = dealer_by_code["D12"]
        # D12 is a high-volume metro fleet account - large enough weekly draw
        # that a real double-digit-hour disruption produces a material,
        # non-trivial unit shortage rather than a rounding error.
        d12.demand_units_per_week = 4800.0
        d12.on_hand_units = 100.0  # thin - replenishment-dependent

        session.flush()

        # --- customers (light) -------------------------------------------
        for i, d in enumerate(dealers[:12], start=1):
            session.add(m.Customer(name=f"Fleet Account {i}", dealer_id=d.id))

        # --- routes ----------------------------------------------------------
        routes: list[m.Route] = []

        def make_route(src_type, src, dst_type, dst, distance, mode, transit_h, cost, cap, delay_p, reliab):
            r = m.Route(
                source_type=src_type, source_id=src.id, dest_type=dst_type, dest_id=dst.id,
                distance_km=distance, transport_mode=mode, transit_time_hours=transit_h,
                cost_per_unit=cost, capacity_units=cap, delay_probability=delay_p, reliability=reliab,
            )
            session.add(r)
            routes.append(r)
            return r

        # supplier -> factory (each factory sources from 3 suppliers)
        supplier_pool = suppliers[:]
        rng.shuffle(supplier_pool)
        for idx, f in enumerate(factories):
            sup_slice = [suppliers[(idx * 3 + k) % len(suppliers)] for k in range(3)]
            for s in sup_slice:
                dist = rng.uniform(120, 1400)
                make_route(
                    "supplier", s, "factory", f, dist, rng.choice(TRANSPORT_MODES),
                    dist / rng.uniform(35, 55), rng.uniform(18, 60), rng.uniform(400, 1500),
                    rng.uniform(0.03, 0.18), rng.uniform(0.82, 0.98),
                )
        # ensure the flagship dependency exists explicitly and is the tight one
        s3_f1_route = make_route(
            "supplier", supplier_by_code["S3"], "factory", f1, 640.0, "road",
            14.0, 32.0, 620.0, 0.22, 0.87,
        )

        # factory -> hub -> warehouse
        for f in factories:
            linked_hubs = [hubs[(hash(f.id + str(k)) % len(hubs))] for k in range(2)]
            for h in linked_hubs:
                dist = rng.uniform(80, 900)
                make_route("factory", f, "transport_hub", h, dist, rng.choice(TRANSPORT_MODES),
                            dist / rng.uniform(40, 60), rng.uniform(6, 20), rng.uniform(600, 2000),
                            rng.uniform(0.02, 0.12), rng.uniform(0.88, 0.99))
        for h in hubs:
            linked_wh = [warehouses[(hash(h.id + str(k)) % len(warehouses))] for k in range(2)]
            for w in linked_wh:
                dist = rng.uniform(50, 700)
                make_route("transport_hub", h, "warehouse", w, dist, rng.choice(TRANSPORT_MODES),
                            dist / rng.uniform(40, 60), rng.uniform(4, 15), rng.uniform(600, 2000),
                            rng.uniform(0.02, 0.12), rng.uniform(0.88, 0.99))
        # explicit flagship replenishment lane F1 -> W4
        f1_w4_route = make_route("factory", f1, "warehouse", w4, 410.0, "road", 9.0, 11.0, 900.0, 0.1, 0.93)

        # warehouse -> dealer
        for d in dealers:
            wh = warehouses[(hash(d.id) % len(warehouses))]
            dist = rng.uniform(20, 450)
            make_route("warehouse", wh, "dealer", d, dist, rng.choice(["road", "rail"]),
                        dist / rng.uniform(35, 55), rng.uniform(3, 12), rng.uniform(200, 900),
                        rng.uniform(0.02, 0.15), rng.uniform(0.85, 0.98))
        # explicit flagship lane W4 -> D12
        w4_d12_route = make_route("warehouse", w4, "dealer", d12, 165.0, "road", 5.0, 6.5, 700.0, 0.08, 0.94)

        session.flush()

        # --- shipments (120+) ------------------------------------------------
        statuses = ["in_transit", "planned", "delivered", "delayed"]
        shipments = []
        for i in range(140):
            r = routes[rng.randrange(len(routes))]
            product = products[rng.randrange(len(products))]
            qty = rng.uniform(40, 900)
            dispatch = now - dt.timedelta(hours=rng.uniform(0, 96))
            planned_eta = dispatch + dt.timedelta(hours=r.transit_time_hours)
            status = rng.choices(statuses, weights=[0.45, 0.2, 0.25, 0.1])[0]
            slip = rng.uniform(0, r.transit_time_hours * 0.4) if status == "delayed" else 0.0
            predicted_eta = planned_eta + dt.timedelta(hours=slip)
            sh = m.Shipment(
                order_id=f"ORD-{2000 + i}",
                product_id=product.id, route_id=r.id,
                source_type=r.source_type, source_id=r.source_id,
                dest_type=r.dest_type, dest_id=r.dest_id,
                quantity=qty, transport_mode=r.transport_mode,
                carrier=rng.choice(["BlueDart Freight", "Safexpress", "TCI Logistics", "VRL Carriers", "GATI"]),
                planned_dispatch=dispatch, promised_delivery=planned_eta + dt.timedelta(hours=6),
                planned_eta=planned_eta, predicted_eta=predicted_eta,
                status=status, delay_probability=r.delay_probability,
                current_location=r.source_type, priority=rng.choice(["standard", "standard", "high"]),
            )
            session.add(sh)
            shipments.append(sh)
        session.flush()

        for sh in shipments[:60]:
            session.add(m.ShipmentEvent(shipment_id=sh.id, event_type="dispatched",
                                         timestamp=sh.planned_dispatch, description="Shipment dispatched"))

        # The flagship "next" raw-material delivery: S3 -> F1, currently
        # in transit, ETA calculated from the route's real transit time. This
        # is the shipment the flagship disruption will delay.
        flagship_dispatch = now - dt.timedelta(hours=2.0)
        flagship_planned_eta = flagship_dispatch + dt.timedelta(hours=s3_f1_route.transit_time_hours)
        flagship_shipment = m.Shipment(
            order_id="ORD-S3-F1-NEXT",
            product_id=products[0].id, route_id=s3_f1_route.id,
            source_type="supplier", source_id=supplier_by_code["S3"].id,
            dest_type="factory", dest_id=f1.id,
            quantity=520.0, transport_mode="road", carrier="TCI Logistics",
            planned_dispatch=flagship_dispatch, promised_delivery=flagship_planned_eta,
            planned_eta=flagship_planned_eta, predicted_eta=flagship_planned_eta,
            status="in_transit", delay_probability=s3_f1_route.delay_probability,
            current_location="supplier", priority="high",
        )
        session.add(flagship_shipment)

        # The flagship replenishment shipment F1 -> W4 already queued
        repl_dispatch = now - dt.timedelta(hours=1.0)
        repl_eta = repl_dispatch + dt.timedelta(hours=f1_w4_route.transit_time_hours)
        session.add(m.Shipment(
            order_id="ORD-F1-W4-NEXT", product_id=products[0].id, route_id=f1_w4_route.id,
            source_type="factory", source_id=f1.id, dest_type="warehouse", dest_id=w4.id,
            quantity=700.0, transport_mode="road", carrier="Safexpress",
            planned_dispatch=repl_dispatch, promised_delivery=repl_eta,
            planned_eta=repl_eta, predicted_eta=repl_eta, status="in_transit",
            delay_probability=f1_w4_route.delay_probability, current_location="factory", priority="high",
        ))

        # --- inventory records (finished goods at warehouses/dealers) --------
        for w in warehouses:
            for p in products:
                session.add(m.InventoryRecord(
                    node_type="warehouse", node_id=w.id, product_id=p.id,
                    on_hand=w.on_hand_units / len(products),
                    safety_stock=w.safety_stock_units / len(products),
                ))
        for d in dealers:
            p = products[rng.randrange(len(products))]
            session.add(m.InventoryRecord(
                node_type="dealer", node_id=d.id, product_id=p.id,
                on_hand=d.on_hand_units, safety_stock=d.demand_units_per_week * 0.25,
            ))

        # --- orders -----------------------------------------------------------
        for i in range(40):
            d = dealers[rng.randrange(len(dealers))]
            p = products[rng.randrange(len(products))]
            session.add(m.Order(
                dealer_id=d.id, product_id=p.id, quantity=rng.uniform(20, 300),
                requested_date=now + dt.timedelta(days=rng.uniform(1, 14)), status="open",
            ))

        # --- scenario library --------------------------------------------
        scenarios = [
            ("Normal Operations", "Baseline network state, no active disruption.", "supplier_delay", "", "", 0.0, False),
            ("Supplier S3 Delay", "S3 shipment to F1 delayed, testing raw-material breach cascade.",
             "supplier_delay", "supplier", supplier_by_code["S3"].id, 12.0, True),
            ("Monsoon Route Disruption", "Western corridor road routes degraded by monsoon flooding.",
             "weather_disruption", "transport_hub", hubs[2].id, 18.0, False),
            ("Truck Breakdown", "Carrier vehicle breakdown on an active high-priority shipment.",
             "truck_breakdown", "route", routes[5].id, 6.0, False),
            ("Warehouse Shortage", "Regional DC falls below safety stock ahead of peak demand.",
             "warehouse_stockout", "warehouse", warehouses[7].id, 0.0, False),
            ("Route Closure", "Primary highway corridor closed for infrastructure work.",
             "route_closure", "route", routes[10].id, 24.0, False),
            ("Demand Surge", "Festive-season demand spike at a dealer cluster.",
             "demand_surge", "dealer", dealer_by_code["D12"].id, 0.0, False),
            ("Port Congestion", "Import-linked supplier shipments queued at port of entry.",
             "port_congestion", "supplier", suppliers[9].id, 30.0, False),
        ]
        for name, desc, dtype, ttype, tid, delay, flagship in scenarios:
            session.add(m.Scenario(
                name=name, description=desc, disruption_type=dtype,
                target_type=ttype, target_id=tid, delay_hours=delay, is_flagship=flagship,
            ))

        # --- baseline informational alerts (pre-existing state) --------------
        session.add(m.Alert(
            severity="informational", source_type="supplier", source_id=supplier_by_code["S3"].id,
            message="S3 reliability trending down over the last two weeks",
            impact_summary="No active breach. Flagged for monitoring.",
            recommended_action="Review upcoming S3 shipments before committing new orders.",
        ))
        session.add(m.Alert(
            severity="medium", source_type="warehouse", source_id=warehouses[7].id,
            message=f"{warehouses[7].name} inventory approaching safety stock",
            impact_summary="Cushion below 18% of capacity.",
            recommended_action="Schedule an early replenishment run this week.",
        ))

        session.commit()
    finally:
        session.close()


if __name__ == "__main__":
    seed_all(reset=True)
    print("Seed complete.")
