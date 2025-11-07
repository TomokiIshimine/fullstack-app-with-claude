"""Tests for UserService (user management business logic)."""

from __future__ import annotations

import pytest

from app.services.user_service import CannotDeleteAdminError, UserAlreadyExistsError, UserNotFoundError, UserService
from tests.helpers import create_user


@pytest.fixture
def user_service(app):
    """Create UserService instance with test database session."""
    from app.database import get_session

    with app.app_context():
        session = get_session()
        return UserService(session)


# list_users tests


def test_list_users_returns_all_users(app, user_service):
    """Test that list_users returns all users including admin and regular users."""
    # Create multiple users
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin", name="Admin User")
    user1_id = create_user(app, email="user1@example.com", password="password123", role="user", name="User One")
    user2_id = create_user(app, email="user2@example.com", password="password123", role="user", name="User Two")

    users = user_service.list_users()

    assert len(users) == 3

    # Verify all users are present
    user_ids = {u.id for u in users}
    assert admin_id in user_ids
    assert user1_id in user_ids
    assert user2_id in user_ids

    # Verify roles and names
    admin_user = next(u for u in users if u.id == admin_id)
    assert admin_user.role == "admin"
    assert admin_user.name == "Admin User"


def test_list_users_returns_empty_list_when_no_users(app, user_service):
    """Test that list_users returns empty list when no users exist."""
    users = user_service.list_users()

    assert len(users) == 0
    assert users == []


# create_user tests


def test_create_user_success(app, user_service):
    """Test successful user creation with generated initial password."""
    result = user_service.create_user(email="newuser@example.com", name="New User")

    assert result.user.email == "newuser@example.com"
    assert result.user.name == "New User"
    assert result.user.role == "user"
    assert result.user.id is not None

    # Verify initial password format (12 chars, alphanumeric)
    password = result.initial_password
    assert len(password) == 12
    assert any(c.isupper() for c in password)
    assert any(c.islower() for c in password)
    assert any(c.isdigit() for c in password)


def test_create_user_password_is_hashed(app, user_service, client):
    """Test that initial password is properly hashed in database."""
    result = user_service.create_user(email="newuser@example.com", name="New User")

    # Try to login with the initial password
    login_response = client.post("/api/auth/login", json={"email": "newuser@example.com", "password": result.initial_password})

    assert login_response.status_code == 200


def test_create_user_duplicate_email_raises_error(app, user_service):
    """Test that creating user with duplicate email raises UserAlreadyExistsError."""
    create_user(app, email="existing@example.com", password="password123", role="user")

    with pytest.raises(UserAlreadyExistsError) as exc_info:
        user_service.create_user(email="existing@example.com", name="Duplicate User")

    assert "existing@example.com" in str(exc_info.value.description)
    assert exc_info.value.code == 409


def test_create_user_always_creates_with_user_role(app, user_service):
    """Test that create_user always creates users with 'user' role."""
    result = user_service.create_user(email="newuser@example.com", name="New User")

    assert result.user.role == "user"


# delete_user tests


def test_delete_user_success(app, user_service):
    """Test successful deletion of a regular user."""
    user_id = create_user(app, email="user@example.com", password="password123", role="user")

    # Should not raise any exception
    user_service.delete_user(user_id)

    # Verify user is deleted
    from app.database import get_session
    from app.repositories.user_repository import UserRepository

    with app.app_context():
        session = get_session()
        repo = UserRepository(session)
        user = repo.find_by_id(user_id)
        assert user is None


def test_delete_user_cannot_delete_admin(app, user_service):
    """Test that deleting admin user raises CannotDeleteAdminError."""
    admin_id = create_user(app, email="admin@example.com", password="admin123", role="admin")

    with pytest.raises(CannotDeleteAdminError) as exc_info:
        user_service.delete_user(admin_id)

    assert "admin" in exc_info.value.description.lower()
    assert exc_info.value.code == 403

    # Verify admin user still exists
    from app.database import get_session
    from app.repositories.user_repository import UserRepository

    with app.app_context():
        session = get_session()
        repo = UserRepository(session)
        user = repo.find_by_id(admin_id)
        assert user is not None


def test_delete_user_not_found_raises_error(app, user_service):
    """Test that deleting non-existent user raises UserNotFoundError."""
    with pytest.raises(UserNotFoundError) as exc_info:
        user_service.delete_user(99999)

    assert "99999" in str(exc_info.value.description)
    assert exc_info.value.code == 404


def test_delete_user_cascades_related_data(app, user_service):
    """Test that deleting user also deletes related todos and refresh tokens."""
    from app.database import get_session
    from app.models.todo import Todo

    # Create user and related data
    user_id = create_user(app, email="user@example.com", password="password123", role="user")

    with app.app_context():
        session = get_session()
        # Create a todo for the user
        todo = Todo(user_id=user_id, title="Test Todo")
        session.add(todo)
        session.commit()
        todo_id = todo.id

    # Delete user
    user_service.delete_user(user_id)

    # Verify todo is also deleted (CASCADE)
    with app.app_context():
        session = get_session()
        todo = session.query(Todo).filter(Todo.id == todo_id).first()
        assert todo is None
