"""Tests for password management routes."""

from __future__ import annotations

from tests.helpers import assert_response_error, assert_response_success, create_auth_client, create_user

# POST /api/password/change tests


def test_change_password_success(app, client):
    """Test successful password change with valid current password."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "oldpassword123", "new_password": "newpassword456"})

    data = assert_response_success(response, 200)
    assert "message" in data
    assert "変更" in data["message"]

    # Verify new password works by logging in
    login_response = client.post("/api/auth/login", json={"email": "user@example.com", "password": "newpassword456"})
    assert login_response.status_code == 200

    # Verify old password no longer works
    old_login_response = client.post("/api/auth/login", json={"email": "user@example.com", "password": "oldpassword123"})
    assert old_login_response.status_code == 401


def test_change_password_admin_can_change(app):
    """Test that admin users can also change their passwords."""
    admin_id = create_user(app, email="admin@example.com", password="adminpass123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/password/change", json={"current_password": "adminpass123", "new_password": "newadminpass456"})

    assert_response_success(response, 200)


def test_change_password_invalid_current_password(app):
    """Test that incorrect current password is rejected."""
    user_id = create_user(app, email="user@example.com", password="correctpass123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "wrongpass123", "new_password": "newpassword456"})

    assert_response_error(response, 401)
    data = response.get_json()
    assert "パスワード" in data["error"]["message"]


def test_change_password_new_password_too_short(app):
    """Test that new password must be at least 8 characters."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "oldpassword123", "new_password": "short1"})

    assert_response_error(response, 400)


def test_change_password_new_password_no_letters(app):
    """Test that new password must contain letters."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "oldpassword123", "new_password": "12345678"})

    assert_response_error(response, 400)


def test_change_password_new_password_no_numbers(app):
    """Test that new password must contain numbers."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "oldpassword123", "new_password": "onlyletters"})

    assert_response_error(response, 400)


def test_change_password_missing_current_password(app):
    """Test that current password is required."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"new_password": "newpassword456"})

    assert_response_error(response, 400)


def test_change_password_missing_new_password(app):
    """Test that new password is required."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", json={"current_password": "oldpassword123"})

    assert_response_error(response, 400)


def test_change_password_unauthorized_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.post("/api/password/change", json={"current_password": "oldpass123", "new_password": "newpass456"})

    assert_response_error(response, 401)


def test_change_password_missing_body(app):
    """Test that request body is required."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/password/change", data="", content_type="application/json")

    assert_response_error(response, 400)
