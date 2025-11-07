"""User management service for user CRUD operations."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session
from werkzeug.exceptions import Conflict, Forbidden, HTTPException, NotFound

from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse
from app.schemas.user import UserCreateResponse
from app.utils.password import hash_password
from app.utils.password_generator import generate_initial_password

logger = logging.getLogger(__name__)


class UserServiceError(HTTPException):
    """Base exception for user service errors."""

    pass


class UserAlreadyExistsError(UserServiceError, Conflict):
    """Raised when attempting to create a user with duplicate email."""

    def __init__(self, email: str):
        """Initialize error with email."""
        super().__init__(description=f"User with email '{email}' already exists")


class UserNotFoundError(UserServiceError, NotFound):
    """Raised when user is not found."""

    def __init__(self, user_id: int):
        """Initialize error with user ID."""
        super().__init__(description=f"User with id {user_id} not found")


class CannotDeleteAdminError(UserServiceError, Forbidden):
    """Raised when attempting to delete an admin user."""

    def __init__(self):
        """Initialize error."""
        super().__init__(description="Admin user cannot be deleted")


class UserService:
    """Service for user management operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.user_repo = UserRepository(session)

    def list_users(self) -> list[UserResponse]:
        """
        Get all users.

        Returns:
            List of UserResponse objects

        Raises:
            UserServiceError: If database operation fails
        """
        try:
            users = self.user_repo.find_all()
            logger.info(f"Retrieved {len(users)} users")
            return [UserResponse(id=user.id, email=user.email, role=user.role, name=user.name, created_at=user.created_at) for user in users]
        except Exception as e:
            logger.error(f"Failed to list users: {e}", exc_info=True)
            raise UserServiceError(description="Failed to retrieve users")

    def create_user(self, email: str, name: str) -> UserCreateResponse:
        """
        Create a new user with random initial password.

        Args:
            email: User's email address
            name: User's display name

        Returns:
            UserCreateResponse containing user info and initial password

        Raises:
            UserAlreadyExistsError: If email already exists
            UserServiceError: If user creation fails
        """
        try:
            # Check if email already exists
            existing_user = self.user_repo.find_by_email(email)
            if existing_user:
                logger.warning(f"User creation failed: email already exists - {email}")
                raise UserAlreadyExistsError(email)

            # Generate initial password
            initial_password = generate_initial_password()
            password_hash = hash_password(initial_password)

            # Create user with role='user'
            user = self.user_repo.create(
                email=email,
                password_hash=password_hash,
                role="user",
                name=name,
            )

            self.session.commit()
            logger.info(f"User created successfully: {email} (id={user.id}, name={name})")

            user_response = UserResponse(id=user.id, email=user.email, role=user.role, name=user.name, created_at=user.created_at)
            return UserCreateResponse(user=user_response, initial_password=initial_password)

        except UserAlreadyExistsError:
            # Re-raise this specific error
            self.session.rollback()
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to create user {email}: {e}", exc_info=True)
            raise UserServiceError(description="Failed to create user")

    def delete_user(self, user_id: int) -> None:
        """
        Delete a user by ID.

        Args:
            user_id: ID of user to delete

        Raises:
            UserNotFoundError: If user doesn't exist
            CannotDeleteAdminError: If attempting to delete admin user
            UserServiceError: If deletion fails
        """
        try:
            # Find user
            user = self.user_repo.find_by_id(user_id)
            if not user:
                logger.warning(f"User deletion failed: user not found - id={user_id}")
                raise UserNotFoundError(user_id)

            # Check if user is admin
            if user.role == "admin":
                logger.warning(f"User deletion failed: cannot delete admin user - id={user_id}, email={user.email}")
                raise CannotDeleteAdminError()

            # Delete user
            self.user_repo.delete(user)
            self.session.commit()
            logger.info(f"User deleted successfully: id={user_id}, email={user.email}")

        except (UserNotFoundError, CannotDeleteAdminError):
            # Re-raise these specific errors
            self.session.rollback()
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to delete user {user_id}: {e}", exc_info=True)
            raise UserServiceError(description="Failed to delete user")


__all__ = [
    "UserService",
    "UserServiceError",
    "UserAlreadyExistsError",
    "UserNotFoundError",
    "CannotDeleteAdminError",
]
