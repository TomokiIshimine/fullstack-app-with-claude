"""Security tests for authorization and access control.

This module tests security aspects including:
- Authentication requirement enforcement
- Token tampering detection
- Token expiration handling
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt

from tests.helpers import assert_response_error, create_auth_client

# Authentication Requirement Tests


def test_unauthenticated_cannot_change_password(client):
    """Test that unauthenticated users cannot change password."""
    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_authenticated_user_can_access_protected_endpoint(app, test_user):
    """Test that authenticated users can access protected endpoints."""
    auth_client = create_auth_client(app, test_user)

    # Should be able to attempt password change (will fail due to wrong password, but 401 auth check passes)
    response = auth_client.post(
        "/api/password/change",
        json={"current_password": "wrong_password", "new_password": "new123"},
    )

    # Should NOT return 401 (authentication passed)
    # May return 400 or 403 (invalid password), but not 401
    assert response.status_code != 401


# Token Security Tests


def test_invalid_token_is_rejected(client):
    """Test that invalid JWT tokens are rejected."""
    client.set_cookie("access_token", "invalid_jwt_token")

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_expired_token_is_rejected(client, test_user):
    """Test that expired JWT tokens are rejected."""
    # Create an expired token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expired_time = datetime.now(timezone.utc) - timedelta(hours=1)
    payload = {"user_id": test_user, "email": "test@example.com", "exp": expired_time}
    expired_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    client.set_cookie("access_token", expired_token)

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_token_with_wrong_signature_is_rejected(client, test_user):
    """Test that tokens signed with wrong secret are rejected."""
    # Create a token with wrong secret
    wrong_secret = "wrong-secret-key"
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"user_id": test_user, "email": "test@example.com", "exp": expires_at}
    tampered_token = jwt.encode(payload, wrong_secret, algorithm=jwt_algorithm)

    client.set_cookie("access_token", tampered_token)

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_token_without_user_id_is_rejected(client):
    """Test that tokens without user_id are rejected."""
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"email": "test@example.com", "exp": expires_at}  # Missing user_id
    invalid_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    client.set_cookie("access_token", invalid_token)

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_token_for_nonexistent_user_is_accepted(client):
    """Test that tokens for non-existent users are accepted at auth level (business logic may fail)."""
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"user_id": 99999, "email": "nonexistent@example.com", "exp": expires_at}
    valid_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    client.set_cookie("access_token", valid_token)

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Authentication passes (200/400/404), but business logic may fail
    # Key: Should NOT return 401 (token is valid)
    assert response.status_code != 401


def test_missing_token_is_rejected(client):
    """Test that requests without token are rejected."""
    # Don't set any cookie

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


# Token Replay and Session Management Tests


def test_cannot_use_refresh_token_after_logout(client, test_user):
    """Test that refresh token becomes invalid after logout."""
    # Login to get both tokens
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200

    # Logout (revokes refresh token)
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200

    # Try to refresh (should fail because refresh token is revoked)
    refresh_response = client.post("/api/auth/refresh")
    assert_response_error(refresh_response, 401)


# Edge Cases and Boundary Tests


def test_malformed_token_format(client):
    """Test that malformed token format is handled gracefully."""
    # Set a malformed token (not proper JWT format)
    client.set_cookie("access_token", "not.a.jwt")

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


def test_empty_token_is_rejected(client):
    """Test that empty token is rejected."""
    client.set_cookie("access_token", "")

    response = client.post("/api/password/change", json={"current_password": "old123", "new_password": "new123"})

    # Should return 401 Unauthorized
    assert_response_error(response, 401)


# Integration Test


def test_complete_security_scenario(app, client, test_user):
    """Test a complete security scenario covering authentication and token validation."""
    auth_client = create_auth_client(app, test_user)

    # 1. Authenticated user can access protected endpoints
    auth_response = auth_client.post(
        "/api/password/change",
        json={"current_password": "wrong", "new_password": "new123"},
    )
    # Authentication passes (NOT 401), business logic may fail
    assert auth_response.status_code != 401

    # 2. Unauthenticated user cannot access protected endpoints
    unauth_response = client.post("/api/password/change", json={"current_password": "old", "new_password": "new"})
    assert unauth_response.status_code == 401

    # 3. Invalid token is rejected
    client.set_cookie("access_token", "fake_token")
    invalid_response = client.post("/api/password/change", json={"current_password": "old", "new_password": "new"})
    assert invalid_response.status_code == 401

    # 4. After logout, refresh token is revoked
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200

    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401
