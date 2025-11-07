"""Authentication request/response schemas."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    """Login request schema."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if not v or not v.strip():
            raise ValueError("Email is required")
        # Basic email format validation
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v):
            raise ValueError("Invalid email format")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password format."""
        if not v or len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        # Check for alphanumeric characters
        if not re.search(r"[a-zA-Z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("Password must contain both letters and numbers")
        return v


class UserResponse(BaseModel):
    """User information in response."""

    id: int
    email: str
    role: Literal["admin", "user"]
    name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Login response schema."""

    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema (if needed for body, but we'll use cookies)."""

    pass


class RefreshTokenResponse(BaseModel):
    """Refresh token response schema."""

    message: str
    user: UserResponse


class LogoutResponse(BaseModel):
    """Logout response schema."""

    message: str


__all__ = ["LoginRequest", "LoginResponse", "UserResponse", "RefreshTokenRequest", "RefreshTokenResponse", "LogoutResponse"]
