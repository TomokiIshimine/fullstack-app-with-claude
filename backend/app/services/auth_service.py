"""Authentication service for login and token management."""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy.orm import Session

from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginResponse, UserResponse
from app.utils.password import verify_password

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.user_repo = UserRepository(session)
        self.refresh_token_repo = RefreshTokenRepository(session)

        # JWT configuration from environment variables
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # Default: 1 day
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # Default: 7 days

    def login(self, email: str, password: str) -> tuple[LoginResponse, str, str]:
        """
        Authenticate user and generate tokens.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Tuple of (LoginResponse, access_token, refresh_token)

        Raises:
            ValueError: If authentication fails
        """
        # Find user by email
        user = self.user_repo.find_by_email(email)
        if not user:
            logger.warning(f"Login failed: user not found - {email}")
            raise ValueError("メールアドレスまたはパスワードが間違っています")

        # Verify password
        if not verify_password(password, user.password_hash):
            logger.warning(f"Login failed: invalid password - {email}")
            raise ValueError("メールアドレスまたはパスワードが間違っています")

        # Generate tokens
        access_token = self._generate_access_token(user.id, user.email, user.role)
        refresh_token = self._generate_refresh_token(user.id)

        # Store refresh token in database
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        self.refresh_token_repo.create(token=refresh_token, user_id=user.id, expires_at=expires_at)

        logger.info(f"User logged in successfully: {email} (id={user.id}, role={user.role})")

        response = LoginResponse(user=UserResponse(id=user.id, email=user.email, role=user.role, name=user.name, created_at=user.created_at))
        return response, access_token, refresh_token

    def refresh_access_token(self, refresh_token: str) -> tuple[str, str, object]:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token string

        Returns:
            Tuple of (new_access_token, new_refresh_token, user)

        Raises:
            ValueError: If refresh token is invalid or expired
        """
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("user_id")

            if not user_id:
                raise ValueError("Invalid refresh token")

            # Check if refresh token exists in database and is not revoked
            token_record = self.refresh_token_repo.find_by_token(refresh_token)
            if not token_record:
                logger.warning(f"Refresh token not found in database: user_id={user_id}")
                raise ValueError("リフレッシュトークンが無効です")

            if token_record.is_revoked:
                logger.warning(f"Refresh token is revoked: user_id={user_id}")
                raise ValueError("リフレッシュトークンが無効です")

            # Compare timezone-aware datetimes (database returns naive datetime, treat as UTC)
            expires_at_utc = (
                token_record.expires_at.replace(tzinfo=timezone.utc) if token_record.expires_at.tzinfo is None else token_record.expires_at
            )
            if expires_at_utc < datetime.now(timezone.utc):
                logger.warning(f"Refresh token expired: user_id={user_id}")
                raise ValueError("リフレッシュトークンが無効です")

            # Get user
            user = self.user_repo.find_by_id(user_id)
            if not user:
                logger.warning(f"User not found during token refresh: user_id={user_id}")
                raise ValueError("リフレッシュトークンが無効です")

            # Generate new tokens
            new_access_token = self._generate_access_token(user.id, user.email, user.role)
            new_refresh_token = self._generate_refresh_token(user.id)

            # Revoke old refresh token
            self.refresh_token_repo.revoke(refresh_token)

            # Store new refresh token
            expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
            self.refresh_token_repo.create(token=new_refresh_token, user_id=user.id, expires_at=expires_at)

            logger.info(f"Access token refreshed for user: {user.email} (id={user.id}, role={user.role})")

            return new_access_token, new_refresh_token, user

        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired (JWT)")
            raise ValueError("リフレッシュトークンが無効です")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token (JWT): {e}")
            raise ValueError("リフレッシュトークンが無効です")

    def logout(self, refresh_token: str) -> None:
        """
        Logout user by revoking refresh token.

        Args:
            refresh_token: Refresh token to revoke
        """
        self.refresh_token_repo.revoke(refresh_token)
        logger.info("User logged out, refresh token revoked")

    def _generate_access_token(self, user_id: int, email: str, role: str) -> str:
        """Generate JWT access token."""
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        payload = {"user_id": user_id, "email": email, "role": role, "exp": expires_at}
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def _generate_refresh_token(self, user_id: int) -> str:
        """Generate JWT refresh token with unique ID."""
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        payload = {"user_id": user_id, "jti": str(uuid.uuid4()), "exp": expires_at}
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)


__all__ = ["AuthService"]
