from __future__ import annotations


def test_health_endpoint(client) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_todos_endpoint_available(auth_client) -> None:
    response = auth_client.get("/api/todos")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["items"] == []
    assert payload["meta"]["count"] == 0
