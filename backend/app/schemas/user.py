"""User management request/response schemas."""

from __future__ import annotations

import re

from pydantic import BaseModel, field_validator

from app.schemas.auth import UserResponse


class UserValidationError(ValueError):
    """Raised when user data validation fails."""

    pass


class UserCreateRequest(BaseModel):
    """Schema for creating a new user."""

    email: str
    name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if not v or not v.strip():
            raise UserValidationError("Email is required")
        # Basic email format validation
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v.strip()):
            raise UserValidationError("Invalid email format")
        return v.strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name."""
        if not v or not v.strip():
            raise UserValidationError("Name is required")
        trimmed = v.strip()
        if len(trimmed) > 100:
            raise UserValidationError("Name must be at most 100 characters")
        return trimmed


class UserCreateResponse(BaseModel):
    """Schema for user creation response."""

    user: UserResponse
    initial_password: str


class UserUpdateRequest(BaseModel):
    """Schema for updating an existing user."""

    email: str
    name: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format."""
        if not v or not v.strip():
            raise UserValidationError("Email is required")
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v.strip()):
            raise UserValidationError("Invalid email format")
        return v.strip()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name."""
        if not v or not v.strip():
            raise UserValidationError("Name is required")
        trimmed = v.strip()
        if len(trimmed) > 100:
            raise UserValidationError("Name must be at most 100 characters")
        return trimmed


class UserUpdateResponse(BaseModel):
    """Schema for user update response."""

    message: str
    user: UserResponse


class UserListResponse(BaseModel):
    """Schema for user list response."""

    users: list[UserResponse]


__all__ = [
    "UserCreateRequest",
    "UserCreateResponse",
    "UserUpdateRequest",
    "UserUpdateResponse",
    "UserListResponse",
    "UserValidationError",
    "UserResponse",
]
