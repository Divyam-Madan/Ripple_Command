# RIPPLE Command (AROC — Autonomous Resilient Operations Center)

**Predict. Simulate. Prescribe.**

A predictive supply-chain digital twin and decision-intelligence platform for
manufacturers. Core workflow: model the network as a graph → monitor current
state → simulate a disruption → propagate it through real dependencies →
price the impact → optimize a recovery → explain the recommendation → ask an
AI copilot that can only answer from the same backend tools.

This is a working vertical slice, not a mockup: every number on screen comes
from a seeded database row or a formula over seeded rows. Nothing is
hardcoded or randomly regenerated on each render.

---

## 1. What's here vs. what's scoped out

The original brief specifies an 18-deliverable enterprise platform (full
CRUD for 10+ entity types, Alembic migrations, live WebSocket-driven UI,
MapLibre GL with tiled basemaps, CSV/XLSX import, full auth/roles, a
comprehensive test suite, etc.). Building all of that to production
completeness is realistically a multi-week effort for a team. This delivery
prioritizes a **real, working flagship path end-to-end** over broad but
shallow coverage. Specifically:

**Fully built and working:**
- Complete relational schema (20+ entities), seeded synthetic Indian
  automotive network (15 suppliers / 5 factories / 12 warehouses / 8 hubs /
  30 dealers / 140+ shipments / 74 routes / 6 products)
- NetworkX digital-twin graph, rebuilt from the DB on every request
- Deterministic simulation engine: raw-material breach → production
  downtime → warehouse replenishment delay → dealer shortage, for
  `supplier_delay`/`shipment_delay`/`truck_breakdown`/`route_closure`/
  `weather_disruption`/`port_congestion` (shared upstream-delay pathway) plus
  dedicated logic for `warehouse_stockout` and `demand_surge`
- OR-Tools recovery optimizer (real small MIP, not a dressed-up `min()`)
  across 4 strategies: expedite shipment, alternate supplier, warehouse
  reallocation, do nothing
- Explainability ("Why This Action") derived from the actual option
  comparison, never invented
- AI copilot: 9 backend tools, deterministic fallback responder (works with
  zero external API keys) + a real OpenRouter tool-calling client that
  activates automatically once a key is configured
- Dashboard, Digital Twin (topology + geographic), Shipments, What-If
  Simulator with the signature Disruption Propagation Chain visual, Recovery
  Options, Disruption Center, Analytics, Scenario Library, Admin/master data
- WebSocket endpoint broadcasting `simulation.completed` /
  `recommendation.updated` events
- 19 backend unit/integration tests, all passing

**Deliberately simplified (documented, not silently cut):**
- **Database**: SQLite by default behind the exact same repository/session
  layer Postgres would use — set `DATABASE_URL` to point at real Postgres
  and nothing else changes. No Alembic migrations are wired up; `create_all`
  runs on startup. For a real deployment, add Alembic before your first
  schema change.
- **Geographic view**: a lightweight SVG lat/lon projection of the real
  seeded coordinates, not MapLibre GL with tiled basemaps. This avoids a
  hard dependency on a `MAPTILER_API_KEY` for the offline/demo path. Swapping
  in MapLibre is a contained change to `DigitalTwinPage`/`GeoView`.
  `VITE_ENABLE_MAP` is provided for this purpose.
- **Entity CRUD**: all list/read endpoints exist for every entity type,
  and *create* is fully wired for Suppliers, Factories, Warehouses, and
  Dealers (`app/api/routes/entities.py`, `app/domain/schemas.py`) with the
  Admin page shipping a complete working "Add Supplier" form as the pattern.
  Extending the same pattern to Products/Routes/Transport Hubs/Transporters/
  Drivers is mechanical (schema + route + form), not attempted here for
  time.
- **CSV/XLSX import**: not implemented. Not required for demo mode per the
  brief; flagged as a clear next step.
- **Auth/roles**: `User`/`Role` tables exist and are seeded, but no
  login/session flow sits in front of the API. Every request acts as the
  seeded admin user.
- **WebSocket → live UI wiring**: the backend publishes real events over
  `/ws`; the frontend doesn't yet subscribe to them (queries poll instead,
  e.g. dashboard every 30s). Wiring a `useEffect` WebSocket subscriber that
  invalidates the relevant React Query keys is the natural next step.

None of these simplifications touch the calculation core — the numbers you
see when you run the flagship scenario are real.

---

## 2. Architecture

```
backend/app/
  main.py                FastAPI app, router wiring, startup seeding
  config.py               env-driven settings, demo-mode fallback logic
  db/                      SQLAlchemy models, session/engine, repositories
  domain/                  enums, pydantic request/response schemas
  graph/builder.py         DB → NetworkX digital twin
  simulation/              inventory projection, production impact,
                            financial impact, and the orchestrating engine
  optimization/            recovery candidate generation + OR-Tools solver
  ai/                      tool schemas + implementations, deterministic
                            fallback, OpenRouter client, system prompt
  services/                simulation/optimization/dashboard/copilot
                            services — the layer routes actually call
  api/routes/               one file per resource
  websocket/                connection manager + publisher
  data/seed.py              deterministic synthetic network generator
  tests/                    19 tests across formulas, engine, optimizer, API

frontend/src/
  app/, config/            router, env config
  lib/api/                 typed fetch clients, one file per resource
  lib/formatting/           currency/date/number helpers
  types/                    shared TS types mirroring backend schemas
  components/layout/        AppShell, Sidebar, TopBar
  components/data-display/  KpiCard, StatusBadge
  components/feedback/      Loading/Empty/Error states
  features/dashboard/       Control Tower
  features/digital-twin/    Topology (React Flow) + Geographic (SVG) views
  features/simulation/      What-If Simulator + Impact Chain (signature UI)
  features/optimization/    Recovery Options cards
  features/shipments/       Shipment table + filters
  features/disruptions/     Disruption Center / alerts
  features/analytics/       Recharts panels over real aggregations
  features/scenarios/       Scenario Library
  features/admin/           Master data browser + Add Supplier form
  features/copilot/         AI Copilot side panel
```

**Why the numbers are trustworthy:** the simulation engine never marks a
downstream node "critical" just because it's downstream. It looks up the
real shipment carrying material into a factory, applies the delay to that
shipment's ETA, computes hours-of-cover from the factory's actual raw
material buffer and consumption rate, and only escalates the cascade if the
math says the buffer runs out before resupply arrives. The optimizer prices
each recovery candidate from real route costs, real supplier lead times, and
a haversine-distance estimate for inter-warehouse transfers — there's no
"pick a random plausible number" step anywhere in the path from disruption
to dollar figure.

---

## 3. Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or your preferred env tool
pip install -r requirements.txt
cp .env.example .env        # defaults work out of the box in DEMO_MODE
uvicorn app.main:app --reload --port 8000
```

On first startup with `DEMO_MODE=true` (default) and an empty database, the
app automatically seeds the full synthetic network. No manual seed step is
required. To force a reseed later: `POST /api/admin/reset-demo-data`, or
`python -m app.data.seed` directly.

**Database**: defaults to a local SQLite file at
`backend/data/_runtime/aroc.db`. To use Postgres (e.g. Supabase), set
`DATABASE_URL=postgresql+psycopg://user:pass@host:5432/aroc` in `.env` and
install `psycopg[binary]`. No code changes needed.

**AI**: works with zero configuration (deterministic fallback). To enable
real OpenRouter-backed responses, set `OPENROUTER_API_KEY` and
`OPENROUTER_MODEL` in `.env` and set `MOCK_EXTERNAL_APIS=false`. The key
never reaches the frontend — all AI calls happen server-side.

API docs: `http://localhost:8000/docs` (auto-generated OpenAPI).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # points at http://localhost:8000/api by default
npm run dev                  # http://localhost:5173
```

`npm run build` produces a static bundle deployable to Vercel or any static
host — it only needs `VITE_API_BASE_URL` pointed at wherever the backend is
deployed (Render/Railway/Fly.io).

### Tests

```bash
cd backend
pytest app/tests -q
```

19 tests covering: financial formulas, inventory projection, health score
composition, the full flagship simulation cascade, monotonicity of exposure
vs. delay hours, optimizer feasibility/recommendation logic, and 4
HTTP-level API tests including the complete flagship flow through
`TestClient`.

---

## 4. Sample demonstration workflow (the flagship scenario)

This is the same path the frontend's Scenario Library → "Supplier S3 Delay"
card runs, shown here via `curl` so it's auditable without the UI:

```bash
# 1. Confirm the network is seeded
curl -s localhost:8000/api/dashboard/summary | jq .health

# 2. Run the flagship disruption: S3 delayed 12h
SUPPLIER_ID=$(curl -s localhost:8000/api/entities/suppliers \
  | jq -r '.items[] | select(.name | startswith("S3 ")) | .id')

RUN=$(curl -s -X POST localhost:8000/api/simulations \
  -H 'Content-Type: application/json' \
  -d "{\"disruption_type\":\"supplier_delay\",\"target_type\":\"supplier\",\"target_id\":\"$SUPPLIER_ID\",\"delay_hours\":12}")

echo "$RUN" | jq '.impact_chain, .total_financial_exposure'
# → S3 critical → F1 buffer breach (~3.6h) → Production Line downtime (~11h)
#   → W4 replenishment delayed → D12 ~438-unit shortage, ~₹86K exposure

RUN_ID=$(echo "$RUN" | jq -r .simulation_run_id)

# 3. Optimize recovery
curl -s -X POST localhost:8000/api/optimization/recover \
  -H 'Content-Type: application/json' \
  -d "{\"simulation_run_id\":\"$RUN_ID\"}" | jq '.options, .recommended_reasons'
# → Warehouse Reallocation recommended (~₹11K, feasible, full recovery)
#   over Expedite Shipment (~₹43K) and Alternate Supplier (infeasible, 65h lead time)

# 4. Ask the copilot the same question in natural language
curl -s -X POST localhost:8000/api/copilot/query \
  -H 'Content-Type: application/json' \
  -d '{"message":"What happens if S3 is delayed by 12 hours?"}' | jq -r .reply
```

In the UI: **Scenario Library → "Supplier S3 Delay" → Load into Simulator →
Optimize Recovery**, or drive it manually from **What-If Simulator** with
the delay slider (0–24h) to see the cascade scale in real time.

---

## 5. Engineering decisions worth knowing about

- **"Production Line N"** in the impact chain is a display-only derived
  label (`hash(factory_id) % num_lines`), not a separate tracked entity —
  the downtime *math* is real (from the factory's buffer/consumption/ETA),
  only the specific line number is cosmetic. Documented in
  `simulation/production_impact.py`.
- **Recovery deadline** (`needed_within_hours`) is defined as "when the
  delayed shipment would arrive anyway" — i.e., a recovery option only
  counts as valuable if it beats doing nothing and waiting.
- **Idempotent optimization**: re-running `/optimization/recover` on the
  same simulation replaces prior `RecoveryOption`/`Recommendation` rows
  instead of accumulating duplicates (found and fixed during testing — see
  git-style comment in `optimization_service.py`).
- **Seed determinism**: `random.Random(42)` — the same network, same
  flagship numbers, every fresh boot. Useful for reproducible demos and for
  the test suite to assert on real figures.
