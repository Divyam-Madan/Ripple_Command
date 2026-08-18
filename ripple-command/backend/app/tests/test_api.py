from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


def test_dashboard_summary_endpoint():
    with TestClient(app) as client:
        r = client.get("/api/dashboard/summary")
        assert r.status_code == 200
        body = r.json()
        assert "health" in body
        assert "kpis" in body


def test_full_flagship_flow_via_api():
    with TestClient(app) as client:
        scenarios = client.get("/api/scenarios").json()["items"]
        flagship = next(s for s in scenarios if s["is_flagship"])
        run = client.post(f"/api/scenarios/{flagship['id']}/run").json()
        assert run["total_financial_exposure"] > 0
        assert run["recovery_requirement"] is not None

        rec = client.post("/api/optimization/recover", json={
            "simulation_run_id": run["simulation_run_id"],
        }).json()
        recommended = [o for o in rec["options"] if o["is_recommended"]]
        assert len(recommended) == 1


def test_copilot_tool_test():
    with TestClient(app) as client:
        r = client.post("/api/copilot/query", json={"message": "What happens if S3 is delayed by 12 hours?"})
        assert r.status_code == 200
        body = r.json()
        assert "reply" in body
        assert "F1" in body["reply"] or "buffer" in body["reply"].lower()
