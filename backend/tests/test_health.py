from __future__ import annotations


def test_health_endpoint(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_ping_endpoint(client) -> None:
    response = client.get("/api/ping")
    assert response.status_code == 200
    assert response.get_json() == {"message": "pong"}
