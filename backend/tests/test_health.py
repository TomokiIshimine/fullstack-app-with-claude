from __future__ import annotations

from unittest.mock import patch


def test_health_endpoint(client) -> None:
    """Test health endpoint returns basic status and database connection."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data


def test_health_endpoint_with_version(client, monkeypatch) -> None:
    """Test health endpoint returns version from environment variable."""
    # Set APP_VERSION environment variable
    monkeypatch.setenv("APP_VERSION", "v1.0.0-test")

    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "v1.0.0-test"


def test_health_endpoint_without_version(client, monkeypatch) -> None:
    """Test health endpoint returns 'unknown' when APP_VERSION is not set."""
    # Ensure APP_VERSION is not set
    monkeypatch.delenv("APP_VERSION", raising=False)

    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "unknown"


def test_health_endpoint_db_error_with_version(client, monkeypatch) -> None:
    """Test health endpoint returns version even when database connection fails."""
    # Set APP_VERSION environment variable
    monkeypatch.setenv("APP_VERSION", "v1.0.0-error-test")

    # Mock database session to raise an exception
    with patch("app.routes.health.get_session") as mock_get_session:
        mock_session = mock_get_session.return_value.__enter__.return_value
        mock_session.execute.side_effect = Exception("Database connection failed")

        response = client.get("/api/health")
        assert response.status_code == 503
        data = response.get_json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert data["version"] == "v1.0.0-error-test"
        assert "error" in data
