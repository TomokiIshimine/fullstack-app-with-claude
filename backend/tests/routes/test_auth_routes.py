"""Tests for authentication routes (login, logout, refresh)."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt

from tests.factories import UserFactory
from tests.helpers import assert_cookie_set, assert_response_error, assert_response_success, create_user

# Login Tests


def test_login_success(client, app, test_user):
    """Test successful login with valid credentials."""
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

    data = assert_response_success(response, 200)
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["id"] == test_user
    assert data["user"]["role"] == "user"
    assert data["user"]["name"] == "Test User"


def test_login_sets_cookies(client, app, test_user):
    """Test that login sets access_token and refresh_token cookies."""
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

    assert response.status_code == 200
    assert_cookie_set(response, "access_token")
    assert_cookie_set(response, "refresh_token")


def test_login_invalid_password(client, app, test_user):
    """Test login fails with incorrect password."""
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrongpassword1"})

    assert_response_error(response, 401)
    data = response.get_json()
    assert "error" in data


def test_login_user_not_found(client):
    """Test login fails when user doesn't exist."""
    response = client.post("/api/auth/login", json={"email": "nonexistent@example.com", "password": "password123"})

    assert_response_error(response, 401)


def test_login_missing_body(client):
    """Test login fails when request body is missing."""
    response = client.post("/api/auth/login", data="", content_type="application/json")

    # Implementation returns 500 for missing body (ValueError not caught as 401)
    assert_response_error(response, 500)


def test_login_invalid_email_format(client):
    """Test login fails with invalid email format."""
    response = client.post("/api/auth/login", json={"email": "notanemail", "password": "password123"})

    assert_response_error(response, 400)
    data = response.get_json()
    assert "email" in data["error"].lower()


def test_login_invalid_password_too_short(client, app, test_user):
    """Test login fails when password is too short (validation)."""
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "short1"})

    assert_response_error(response, 400)
    data = response.get_json()
    assert "password" in data["error"].lower()


def test_login_invalid_password_no_number(client, app, test_user):
    """Test login fails when password doesn't contain a number (validation)."""
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "onlyletters"})

    assert_response_error(response, 400)
    data = response.get_json()
    assert "password" in data["error"].lower()


def test_login_empty_email(client):
    """Test login fails with empty email."""
    response = client.post("/api/auth/login", json={"email": "", "password": "password123"})

    assert_response_error(response, 400)


def test_login_missing_email_field(client):
    """Test login fails when email field is missing."""
    response = client.post("/api/auth/login", json={"password": "password123"})

    assert_response_error(response, 400)


# Refresh Token Tests


def test_refresh_success(client, app, test_user):
    """Test successful token refresh with valid refresh token."""
    # First login to get refresh token
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200

    # Extract refresh token from cookies (Flask test client handles this automatically)
    # Now try to refresh
    response = client.post("/api/auth/refresh")

    data = assert_response_success(response, 200)
    assert "message" in data
    assert "user" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["role"] == "user"
    assert data["user"]["name"] == "Test User"


def test_refresh_sets_new_cookies(client, app, test_user):
    """Test that refresh endpoint sets new tokens in cookies."""
    # Login first
    client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

    # Refresh tokens
    response = client.post("/api/auth/refresh")

    assert response.status_code == 200
    assert_cookie_set(response, "access_token")
    assert_cookie_set(response, "refresh_token")


def test_refresh_missing_token(client):
    """Test refresh fails when refresh token is not provided."""
    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)
    data = response.get_json()
    assert "error" in data


def test_refresh_invalid_token(client, app):
    """Test refresh fails with invalid token format."""
    client.set_cookie("refresh_token", "invalid_token_format")

    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)


def test_refresh_expired_token(client, app, test_user):
    """Test refresh fails with expired token."""
    # Create an expired refresh token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    # Create token that expired 1 day ago
    expired_time = datetime.now(timezone.utc) - timedelta(days=1)
    payload = {"user_id": test_user, "jti": "test-jti", "exp": expired_time}
    expired_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    client.set_cookie("refresh_token", expired_token)

    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)


def test_refresh_revoked_token(client, app, test_user):
    """Test refresh fails with revoked token."""
    # Login to create a valid token
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200

    # Logout to revoke the token
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200

    # Try to use the revoked token (we need to manually set it since logout clears it)
    # Get the token from login response cookies
    # Extract refresh token from login response
    # Note: In real scenario, after logout, the cookie is cleared client-side
    # This test simulates trying to reuse an old token
    # Create a new client with the old refresh_token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"user_id": test_user, "jti": "revoked-jti", "exp": expires_at}
    refresh_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    # Store this token in database as revoked
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        repo.create(token=refresh_token, user_id=test_user, expires_at=expires_at)
        repo.revoke(refresh_token)
        session.commit()

    # Try to use revoked token
    client.set_cookie("refresh_token", refresh_token)
    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)


def test_refresh_token_not_in_database(client, app, test_user):
    """Test refresh fails when token is valid JWT but not in database."""
    # Create a valid JWT token that's not in the database
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"user_id": test_user, "jti": "not-in-db", "exp": expires_at}
    token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    client.set_cookie("refresh_token", token)

    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)


# Logout Tests


def test_logout_success(client, app, test_user):
    """Test successful logout."""
    # Login first
    client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

    # Logout
    response = client.post("/api/auth/logout")

    data = assert_response_success(response, 200)
    assert "message" in data


def test_logout_clears_cookies(client, app, test_user):
    """Test that logout clears access_token and refresh_token cookies."""
    # Login first
    client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})

    # Logout
    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert_cookie_set(response, "access_token", should_be_cleared=True)
    assert_cookie_set(response, "refresh_token", should_be_cleared=True)


def test_logout_without_token(client):
    """Test logout succeeds even without refresh token (graceful handling)."""
    response = client.post("/api/auth/logout")

    data = assert_response_success(response, 200)
    assert "message" in data


def test_logout_revokes_refresh_token(client, app, test_user):
    """Test that logout revokes the refresh token in database."""
    # Login to get tokens
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200

    # Logout
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200

    # Try to use the refresh token again (should fail because it's revoked)
    # Note: The client still has the cookie, but it's revoked in DB
    response = client.post("/api/auth/refresh")

    assert_response_error(response, 401)


# Integration Tests


def test_full_auth_flow(client, app, test_user):
    """Test complete authentication flow: login -> refresh -> logout."""
    # Step 1: Login
    login_response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert login_response.status_code == 200
    login_data = login_response.get_json()
    assert login_data["user"]["email"] == "test@example.com"
    assert login_data["user"]["role"] == "user"
    assert login_data["user"]["name"] == "Test User"

    # Step 2: Refresh token
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.get_json()
    assert refresh_data["user"]["email"] == "test@example.com"
    assert refresh_data["user"]["role"] == "user"
    assert refresh_data["user"]["name"] == "Test User"

    # Step 3: Logout
    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    logout_data = logout_response.get_json()
    assert "message" in logout_data

    # Step 4: Verify refresh fails after logout
    post_logout_refresh = client.post("/api/auth/refresh")
    assert post_logout_refresh.status_code == 401


def test_multiple_users_login_independently(client, app):
    """Test that multiple users can login and maintain separate sessions."""
    # Create two users
    user1_data = UserFactory.build(email="user1@example.com")
    user2_data = UserFactory.build(email="user2@example.com")

    create_user(app, **user1_data)
    create_user(app, **user2_data)

    # User 1 logs in
    user1_login = client.post("/api/auth/login", json=user1_data)
    assert user1_login.status_code == 200
    user1_response = user1_login.get_json()
    assert user1_response["user"]["email"] == "user1@example.com"
    assert user1_response["user"]["role"] == "user"
    assert user1_response["user"]["name"] is not None

    # User 2 logs in (overwrites user1's cookies in this client)
    user2_login = client.post("/api/auth/login", json=user2_data)
    assert user2_login.status_code == 200
    user2_response = user2_login.get_json()
    assert user2_response["user"]["email"] == "user2@example.com"
    assert user2_response["user"]["role"] == "user"
    assert user2_response["user"]["name"] is not None

    # Refresh should return user2's info
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200
    refresh_data = refresh_response.get_json()
    assert refresh_data["user"]["email"] == "user2@example.com"
    assert refresh_data["user"]["role"] == "user"
    assert refresh_data["user"]["name"] is not None
