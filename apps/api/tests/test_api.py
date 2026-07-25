from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

SESSION_ID = str(uuid4())
HEADERS = {"x-session-id": SESSION_ID}
BRIEF = {
    "timingMode": "nights",
    "nights": 3,
    "adults": 2,
    "children": 0,
    "resortArea": "montego-bay",
    "interests": ["culture"],
    "pace": "balanced",
    "spendLevel": "flexible",
    "accommodationStyle": "no-preference",
    "accessibility": [],
    "note": "",
}


def test_health_and_fallback_plan() -> None:
    app = create_app(Settings(ai_enabled=False))
    with TestClient(app) as client:
        assert client.get("/health/live").json() == {"status": "ok"}
        assert client.get("/health/ready").status_code == 200
        response = client.post("/api/plan", headers=HEADERS, json=BRIEF)

    assert response.status_code == 200
    plan = response.json()
    assert plan["generationMode"] == "fallback"
    assert len(plan["days"]) == 3
    assert plan["recommendations"]


def test_trip_crud_is_scoped_to_session() -> None:
    app = create_app(Settings(ai_enabled=False))
    with TestClient(app) as client:
        plan = client.post("/api/plan", headers=HEADERS, json=BRIEF).json()
        trip_id = plan["id"]

        created = client.post("/api/trips", headers=HEADERS, json=plan)
        assert created.status_code == 201
        assert client.post("/api/trips", headers=HEADERS, json=plan).status_code == 409
        assert client.get("/api/trips", headers=HEADERS).json()[0]["id"] == trip_id
        assert client.get(f"/api/trips/{trip_id}", headers={"x-session-id": str(uuid4())}).status_code == 404

        plan["summary"] = "Updated device-scoped plan."
        updated = client.put(f"/api/trips/{trip_id}", headers=HEADERS, json=plan)
        assert updated.status_code == 200
        assert updated.json()["summary"] == "Updated device-scoped plan."

        assert client.delete(f"/api/trips/{trip_id}", headers=HEADERS).status_code == 204
        assert client.get(f"/api/trips/{trip_id}", headers=HEADERS).status_code == 404


def test_catalog_search_and_protected_reindex() -> None:
    app = create_app(Settings(ai_enabled=False))
    with TestClient(app) as client:
        response = client.get("/api/search", params={"q": "beach", "resort_area": "negril"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["backend"] == "catalog"
        assert payload["items"]
        assert all(item["resortArea"] == "negril" for item in payload["items"])
        assert client.post("/api/search/reindex").status_code == 403


def test_events_drop_unapproved_properties() -> None:
    app = create_app(Settings(ai_enabled=False, demo_mode=True))
    event = {
        "sessionId": SESSION_ID,
        "eventName": "brief_completed",
        "properties": {"resortArea": "negril", "interestCount": 2, "email": "visitor@example.com"},
    }
    with TestClient(app) as client:
        assert client.post("/api/events", json=event).status_code == 202
        saved = client.get("/api/dev/events").json()[0]

    assert saved["properties"] == {"resortArea": "negril", "interestCount": 2}


def test_plan_payload_size_is_bounded() -> None:
    app = create_app(Settings(ai_enabled=False))
    with TestClient(app) as client:
        response = client.post(
            "/api/plan",
            headers={**HEADERS, "content-type": "application/json"},
            content=b"x" * 12_001,
        )

    assert response.status_code == 413


def test_conversational_planner_uses_repository_grounded_fallback() -> None:
    app = create_app(Settings(ai_enabled=False))
    with TestClient(app) as client:
        response = client.post(
            "/api/ai-planner",
            headers=HEADERS,
            json={"request": "Create a 3 day family itinerary in Montego Bay"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["generationMode"] == "fallback"
    assert payload["searchBackend"] == "mock"
    assert payload["interpretedRequest"]["destination"] == "montego-bay"
    assert len(payload["days"]) == 3
    assert set(payload["sources"]) >= {activity["id"] for day in payload["days"] for activity in day["activities"]}
