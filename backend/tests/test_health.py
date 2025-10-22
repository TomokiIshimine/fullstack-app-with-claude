from __future__ import annotations


def test_health_endpoint(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_todos_endpoint_available(client) -> None:
    response = client.get("/api/todos")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["items"] == []
    assert payload["meta"]["count"] == 0
