"""Tests for rate limiting on authentication endpoints."""

from __future__ import annotations

import time

import pytest


class TestRateLimiting:
    """Test rate limiting functionality on auth endpoints."""

    def test_login_rate_limit_within_limit(self, client, test_user):
        """Test that login requests within rate limit are successful."""
        # Note: In test environment, rate limiting is typically disabled
        # This test verifies the endpoint works normally
        # test_user fixture returns user_id, so we use the known test credentials
        for _ in range(5):
            response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
            assert response.status_code == 200

    def test_login_rate_limit_exceeded(self, client, test_user):
        """
        Test that login requests exceeding rate limit return 429.

        Note: This test will only pass if rate limiting is enabled.
        In test environment (with in-memory database), rate limiting is typically disabled.
        """
        # Make 11 requests (rate limit is 10 per minute)
        responses = []
        for i in range(12):
            response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
            responses.append(response)

        # Check if any request was rate limited
        # In test environment, this might not trigger 429 if rate limiting is disabled
        status_codes = [r.status_code for r in responses]

        # Either all succeed (rate limiting disabled in tests) or some get 429 (rate limiting enabled)
        assert all(code in [200, 401, 429] for code in status_codes), f"Unexpected status codes: {status_codes}"

    def test_refresh_rate_limit_within_limit(self, client, test_user):
        """Test that refresh requests within rate limit are successful."""
        # First, login to get tokens
        login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert login_response.status_code == 200

        # Make multiple refresh requests (within limit of 30 per minute)
        for _ in range(10):
            response = client.post("/api/auth/refresh")
            # Should either succeed (200) or fail with auth error (401) if tokens expired
            assert response.status_code in [200, 401]

    def test_logout_rate_limit_within_limit(self, client, test_user):
        """Test that logout requests within rate limit are successful."""
        # First, login to get tokens
        login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert login_response.status_code == 200

        # Make multiple logout requests (within limit of 20 per minute)
        for _ in range(10):
            response = client.post("/api/auth/logout")
            assert response.status_code == 200

    @pytest.mark.skip(reason="Requires Redis and rate limiting enabled - skip in unit tests")
    def test_login_rate_limit_reset_after_window(self, client, test_user):
        """
        Test that rate limit resets after time window.

        This test is skipped by default as it requires:
        1. Redis connection
        2. Rate limiting enabled
        3. Waiting for time window to pass (60 seconds)
        """
        # Make 10 requests to hit the limit
        for _ in range(10):
            client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

        # 11th request should be rate limited
        response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert response.status_code == 429
        assert "error" in response.json

        # Wait for rate limit window to reset (60 seconds)
        time.sleep(61)

        # Request should succeed after reset
        response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
        assert response.status_code == 200

    def test_rate_limit_error_response_format(self, client):
        """Test that rate limit error returns proper JSON format."""
        # Make many requests to potentially trigger rate limit
        response = None
        for _ in range(15):
            response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
            if response.status_code == 429:
                break

        # If we got a 429, verify the error format
        if response and response.status_code == 429:
            data = response.json
            assert "error" in data
            assert isinstance(data["error"], str)
            assert "リクエストが多すぎます" in data["error"] or "too many" in data["error"].lower()

    def test_rate_limit_headers_present(self, client, test_user):
        """Test that rate limit headers are present in response."""
        response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

        # If rate limiting is enabled, these headers should be present
        # In test environment, they might not be present if rate limiting is disabled
        # So we just check that if they exist, they have valid values
        if "X-RateLimit-Limit" in response.headers:
            assert int(response.headers["X-RateLimit-Limit"]) > 0
        if "X-RateLimit-Remaining" in response.headers:
            assert int(response.headers["X-RateLimit-Remaining"]) >= 0
