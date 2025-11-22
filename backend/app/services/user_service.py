"""User management service for user CRUD operations."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse
from app.schemas.user import UserCreateResponse
from app.utils.password import hash_password
from app.utils.password_generator import generate_initial_password

logger = logging.getLogger(__name__)


class UserServiceError(Exception):
    """Base exception for user service errors."""


class UserAlreadyExistsError(UserServiceError):
    """Raised when attempting to create a user with duplicate email."""

    def __init__(self, email: str):
        super().__init__(f"User with email '{email}' already exists")
        self.email = email


class UserNotFoundError(UserServiceError):
    """Raised when user is not found."""

    def __init__(self, user_id: int):
        super().__init__(f"User with id {user_id} not found")
        self.user_id = user_id


class CannotDeleteAdminError(UserServiceError):
    """Raised when attempting to delete an admin user."""

    def __init__(self):
        super().__init__("Admin user cannot be deleted")


class UserService:
    """Service for user management operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.user_repo = UserRepository(session)

    def list_users(self) -> list[UserResponse]:
        """Get all users."""
        try:
            users = self.user_repo.find_all()
            logger.info(f"Retrieved {len(users)} users")
            return [UserResponse(id=user.id, email=user.email, role=user.role, name=user.name, created_at=user.created_at) for user in users]
        except Exception as exc:  # pragma: no cover - unexpected errors are logged and re-raised
            logger.error(f"Failed to list users: {exc}", exc_info=True)
            raise UserServiceError("Failed to retrieve users") from exc

    def create_user(self, email: str, name: str) -> UserCreateResponse:
        """Create a new user with random initial password."""
        existing_user = self.user_repo.find_by_email(email)
        if existing_user:
            logger.warning(f"User creation failed: email already exists - {email}")
            raise UserAlreadyExistsError(email)

        initial_password = generate_initial_password()
        password_hash = hash_password(initial_password)

        user = self.user_repo.create(
            email=email,
            password_hash=password_hash,
            role="user",
            name=name,
        )

        # Flush to assign IDs and load defaults without committing the transaction
        self.session.flush()
        self.session.refresh(user)

        logger.info(f"User created successfully: {email} (id={user.id}, name={name})")

        user_response = UserResponse(id=user.id, email=user.email, role=user.role, name=user.name, created_at=user.created_at)
        return UserCreateResponse(user=user_response, initial_password=initial_password)

    def update_user_profile(self, user_id: int, email: str, name: str) -> UserResponse:
        """Update an existing user's profile information."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            logger.warning(f"Profile update failed: user not found - id={user_id}")
            raise UserNotFoundError(user_id)

        existing_user = self.user_repo.find_by_email_excluding_id(email, user_id)
        if existing_user:
            logger.warning(
                "Profile update failed: email already in use",
                extra={"email": email, "user_id": user_id},
            )
            raise UserAlreadyExistsError(email)

        updated_user = self.user_repo.update(user, email=email, name=name)
        logger.info(
            "User profile updated successfully",
            extra={"user_id": user_id, "email": email, "display_name": name},
        )
        return UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            role=updated_user.role,
            name=updated_user.name,
            created_at=updated_user.created_at,
        )

    def delete_user(self, user_id: int) -> None:
        """Delete a user by ID."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            logger.warning(f"User deletion failed: user not found - id={user_id}")
            raise UserNotFoundError(user_id)

        if user.role == "admin":
            logger.warning(f"User deletion failed: cannot delete admin user - id={user_id}, email={user.email}")
            raise CannotDeleteAdminError()

        self.user_repo.delete(user)
        logger.info(f"User deleted successfully: id={user_id}, email={user.email}")


__all__ = [
    "UserService",
    "UserServiceError",
    "UserAlreadyExistsError",
    "UserNotFoundError",
    "CannotDeleteAdminError",
]
