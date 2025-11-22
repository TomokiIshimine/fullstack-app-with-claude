"""Tests for user management routes (Admin only)."""

from __future__ import annotations

from tests.helpers import assert_response_error, assert_response_success, create_auth_client, create_user

# GET /api/users tests


def test_list_users_success_as_admin(app):
    """Test that admin can list all users."""
    # Create admin and regular user
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin", name="Admin User")
    user_id = create_user(app, email="user@example.com", password="password123", role="user", name="Regular User")

    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.get("/api/users")

    data = assert_response_success(response, 200)
    assert "users" in data
    assert len(data["users"]) == 2

    # Check admin user is in list
    admin_user = next(u for u in data["users"] if u["id"] == admin_id)
    assert admin_user["email"] == "admin@example.com"
    assert admin_user["role"] == "admin"
    assert admin_user["name"] == "Admin User"

    # Check regular user is in list
    regular_user = next(u for u in data["users"] if u["id"] == user_id)
    assert regular_user["email"] == "user@example.com"
    assert regular_user["role"] == "user"
    assert regular_user["name"] == "Regular User"


def test_list_users_forbidden_as_regular_user(app):
    """Test that regular users cannot list users."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.get("/api/users")

    assert_response_error(response, 403)


def test_list_users_unauthorized_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/users")

    assert_response_error(response, 401)


# POST /api/users tests


def test_create_user_success_as_admin(app):
    """Test that admin can create a new user with generated password."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/users", json={"email": "newuser@example.com", "name": "New User"})

    data = assert_response_success(response, 201)
    assert "user" in data
    assert "initial_password" in data

    # Check user data
    user = data["user"]
    assert user["email"] == "newuser@example.com"
    assert user["name"] == "New User"
    assert user["role"] == "user"
    assert "id" in user

    # Check initial password format (12 chars, alphanumeric)
    password = data["initial_password"]
    assert len(password) == 12
    assert any(c.isalpha() for c in password)
    assert any(c.isdigit() for c in password)


def test_create_user_forbidden_as_regular_user(app):
    """Test that regular users cannot create users."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.post("/api/users", json={"email": "newuser@example.com", "name": "New User"})

    assert_response_error(response, 403)


def test_create_user_duplicate_email(app):
    """Test that creating user with duplicate email fails."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    create_user(app, email="existing@example.com", password="password123", role="user")

    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/users", json={"email": "existing@example.com", "name": "Duplicate User"})

    assert_response_error(response, 409)


def test_create_user_invalid_email_format(app):
    """Test that invalid email format is rejected."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/users", json={"email": "notanemail", "name": "Test User"})

    assert_response_error(response, 400)


def test_create_user_missing_name(app):
    """Test that missing name is rejected."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/users", json={"email": "newuser@example.com"})

    assert_response_error(response, 400)


def test_create_user_empty_name(app):
    """Test that empty name is rejected."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.post("/api/users", json={"email": "newuser@example.com", "name": ""})

    assert_response_error(response, 400)


# DELETE /api/users/{id} tests


def test_delete_user_success_as_admin(app):
    """Test that admin can delete a regular user."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    user_id = create_user(app, email="user@example.com", password="password123", role="user")

    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.delete(f"/api/users/{user_id}")

    assert response.status_code == 204
    assert response.data == b""


def test_delete_user_cannot_delete_admin(app):
    """Test that admin users cannot be deleted."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.delete(f"/api/users/{admin_id}")

    assert_response_error(response, 403)
    data = response.get_json()
    assert "admin" in data["error"]["message"].lower()


def test_delete_user_not_found(app):
    """Test that deleting non-existent user returns 404."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")
    admin_client = create_auth_client(app, admin_id, email="admin@example.com", role="admin")

    response = admin_client.delete("/api/users/99999")

    assert_response_error(response, 404)


def test_delete_user_forbidden_as_regular_user(app):
    """Test that regular users cannot delete users."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    other_user_id = create_user(app, email="other@example.com", password="password123", role="user")

    user_client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = user_client.delete(f"/api/users/{other_user_id}")

    assert_response_error(response, 403)


def test_delete_user_unauthorized_without_auth(client):
    """Test that unauthenticated requests are rejected."""
    response = client.delete("/api/users/1")

    assert_response_error(response, 401)


# PATCH /api/users/me tests


def test_update_current_user_success(app):
    """Test that authenticated user can update their own profile."""
    user_id = create_user(
        app,
        email="user@example.com",
        password="password123",
        role="user",
        name="Old Name",
    )
    client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = client.patch(
        "/api/users/me",
        json={"email": "new@example.com", "name": "New Name"},
    )

    data = assert_response_success(response, 200)
    assert data["message"] == "プロフィールを更新しました"
    assert data["user"]["email"] == "new@example.com"
    assert data["user"]["name"] == "New Name"
    assert data["user"]["role"] == "user"


def test_update_current_user_duplicate_email(app):
    """Test that updating to an existing email returns conflict."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    create_user(app, email="existing@example.com", password="password123", role="user")
    client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = client.patch(
        "/api/users/me",
        json={"email": "existing@example.com", "name": "User"},
    )

    assert_response_error(response, 409)


def test_update_current_user_invalid_email(app):
    """Test that invalid email format returns validation error."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")
    client = create_auth_client(app, user_id, email="user@example.com", role="user")

    response = client.patch(
        "/api/users/me",
        json={"email": "invalid-email", "name": "User"},
    )

    assert_response_error(response, 400)
