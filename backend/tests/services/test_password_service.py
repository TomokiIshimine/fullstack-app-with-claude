"""Tests for PasswordService (password management business logic)."""

from __future__ import annotations

import pytest

from app.services.password_service import InvalidPasswordError, PasswordService
from tests.helpers import create_user


@pytest.fixture
def password_service(app):
    """Create PasswordService instance with test database session."""
    from app.database import get_session

    with app.app_context():
        session = get_session()
        return PasswordService(session)


# change_password tests


def test_change_password_success(app, password_service, client):
    """Test successful password change with correct current password."""
    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")

    # Change password
    password_service.change_password(user_id=user_id, current_password="oldpassword123", new_password="newpassword456")

    # Verify new password works
    login_response = client.post("/api/auth/login", json={"email": "user@example.com", "password": "newpassword456"})
    assert login_response.status_code == 200

    # Verify old password no longer works
    old_login = client.post("/api/auth/login", json={"email": "user@example.com", "password": "oldpassword123"})
    assert old_login.status_code == 401


def test_change_password_admin_can_change(app, password_service):
    """Test that admin users can change their passwords."""
    admin_id = create_user(app, email="admin@example.com", password="adminpass123", role="admin")

    # Should not raise any exception
    password_service.change_password(user_id=admin_id, current_password="adminpass123", new_password="newadminpass456")


def test_change_password_invalid_current_password_raises_error(app, password_service):
    """Test that incorrect current password raises InvalidPasswordError."""
    user_id = create_user(app, email="user@example.com", password="correctpass123", role="user")

    with pytest.raises(InvalidPasswordError) as exc_info:
        password_service.change_password(user_id=user_id, current_password="wrongpass123", new_password="newpass456")

    assert "パスワード" in exc_info.value.description
    assert exc_info.value.code == 401


def test_change_password_user_not_found_raises_invalid_password_error(app, password_service):
    """Test that non-existent user ID raises InvalidPasswordError (don't reveal user existence)."""
    with pytest.raises(InvalidPasswordError):
        password_service.change_password(user_id=99999, current_password="anypass123", new_password="newpass456")


def test_change_password_hashes_new_password(app, password_service):
    """Test that new password is properly hashed in database."""
    from app.database import get_session
    from app.repositories.user_repository import UserRepository

    user_id = create_user(app, email="user@example.com", password="oldpassword123", role="user")

    password_service.change_password(user_id=user_id, current_password="oldpassword123", new_password="newpassword456")

    # Verify password hash is stored (not plaintext)
    with app.app_context():
        session = get_session()
        repo = UserRepository(session)
        user = repo.find_by_id(user_id)

        assert user.password_hash != "newpassword456"
        assert user.password_hash.startswith("$2b$")  # bcrypt hash format


def test_change_password_multiple_times(app, password_service, client):
    """Test that password can be changed multiple times."""
    user_id = create_user(app, email="user@example.com", password="password1", role="user")

    # First change
    password_service.change_password(user_id=user_id, current_password="password1", new_password="password2")

    # Second change
    password_service.change_password(user_id=user_id, current_password="password2", new_password="password3")

    # Third change
    password_service.change_password(user_id=user_id, current_password="password3", new_password="finalpassword123")

    # Verify final password works
    login_response = client.post("/api/auth/login", json={"email": "user@example.com", "password": "finalpassword123"})
    assert login_response.status_code == 200


def test_change_password_case_sensitive(app, password_service):
    """Test that password verification is case-sensitive."""
    user_id = create_user(app, email="user@example.com", password="Password123", role="user")

    # Correct password with different case should fail
    with pytest.raises(InvalidPasswordError):
        password_service.change_password(user_id=user_id, current_password="password123", new_password="newpass456")

    # Correct case should succeed
    password_service.change_password(user_id=user_id, current_password="Password123", new_password="newpass456")
