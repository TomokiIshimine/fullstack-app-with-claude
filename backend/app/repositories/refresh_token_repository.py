"""Refresh token repository for database operations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    """Repository for RefreshToken model database operations."""

    def __init__(self, session: Session):
        """Initialize repository with database session."""
        self.session = session

    def create(self, token: str, user_id: int, expires_at: datetime) -> RefreshToken:
        """
        Create a new refresh token.

        Args:
            token: Token string
            user_id: User ID who owns the token
            expires_at: Token expiration datetime

        Returns:
            Created RefreshToken instance
        """
        refresh_token = RefreshToken(token=token, user_id=user_id, expires_at=expires_at, is_revoked=False)
        self.session.add(refresh_token)
        self.session.commit()
        self.session.refresh(refresh_token)
        return refresh_token

    def find_by_token(self, token: str) -> RefreshToken | None:
        """
        Find a refresh token by token string.

        Args:
            token: Token string to search for

        Returns:
            RefreshToken if found, None otherwise
        """
        return self.session.query(RefreshToken).filter(RefreshToken.token == token).first()

    def revoke(self, token: str) -> bool:
        """
        Revoke a refresh token.

        Args:
            token: Token string to revoke

        Returns:
            True if token was revoked, False if not found
        """
        refresh_token = self.find_by_token(token)
        if refresh_token:
            refresh_token.is_revoked = True
            self.session.commit()
            return True
        return False

    def revoke_all_for_user(self, user_id: int) -> int:
        """
        Revoke all refresh tokens for a user.

        Args:
            user_id: User ID whose tokens should be revoked

        Returns:
            Number of tokens revoked
        """
        count = (
            self.session.query(RefreshToken)
            .filter(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
            .update({RefreshToken.is_revoked: True})
        )
        self.session.commit()
        return count


__all__ = ["RefreshTokenRepository"]
