"""User repository for database operations."""

from __future__ import annotations

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

    def create(self, email: str, password_hash: str) -> User:
        """
        Create a new user.

        Args:
            email: User's email address
            password_hash: Hashed password

        Returns:
            Created User instance
        """
        user = User(email=email, password_hash=password_hash)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user


__all__ = ["UserRepository"]
