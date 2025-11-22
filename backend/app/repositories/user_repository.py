"""User repository for database operations."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Repository for User model database operations."""

    def __init__(self, session: Session):
        """Initialize repository with database session."""
        self.session = session

    def find_by_email(self, email: str) -> User | None:
        """
        Find a user by email address.

        Args:
            email: Email address to search for

        Returns:
            User if found, None otherwise
        """
        return self.session.query(User).filter(User.email == email).first()

    def find_by_id(self, user_id: int) -> User | None:
        """
        Find a user by ID.

        Args:
            user_id: User ID to search for

        Returns:
            User if found, None otherwise
        """
        return self.session.query(User).filter(User.id == user_id).first()

    def find_by_email_excluding_id(self, email: str, user_id: int) -> User | None:
        """
        Find a user by email address excluding a specific user ID.

        Args:
            email: Email address to search for
            user_id: User ID to exclude from search

        Returns:
            User if found (excluding the specified user), None otherwise
        """
        return self.session.query(User).filter(User.email == email, User.id != user_id).first()

    def find_all(self) -> Sequence[User]:
        """
        Find all users ordered by created_at.

        Returns:
            Sequence of all User instances
        """
        return self.session.query(User).order_by(User.created_at.asc()).all()

    def create(self, email: str, password_hash: str, role: str = "user", name: str | None = None) -> User:
        """
        Create a new user.

        Args:
            email: User's email address
            password_hash: Hashed password
            role: User role (default: 'user')
            name: User's display name (optional)

        Returns:
            Created User instance
        """
        user = User(email=email, password_hash=password_hash, role=role, name=name)
        self.session.add(user)
        return user

    def update(self, user: User, *, email: str, name: str) -> User:
        """
        Update user attributes.

        Args:
            user: User instance to update
            email: New email address
            name: New display name

        Returns:
            Updated User instance
        """
        user.email = email
        user.name = name
        return user

    def delete(self, user: User) -> None:
        """
        Delete a user.

        Args:
            user: User instance to delete
        """
        self.session.delete(user)


__all__ = ["UserRepository"]
