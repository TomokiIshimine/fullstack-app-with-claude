"""Password management request/response schemas."""

from __future__ import annotations

import re

from pydantic import BaseModel, field_validator


class PasswordValidationError(ValueError):
    """Raised when password validation fails."""

    pass


class PasswordChangeRequest(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str

    @field_validator("current_password")
    @classmethod
    def validate_current_password(cls, v: str) -> str:
        """Validate current password is not empty."""
        if not v:
            raise PasswordValidationError("Current password is required")
        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password format."""
        if not v or len(v) < 8:
            raise PasswordValidationError("Password must be at least 8 characters long")
        # Check for alphanumeric characters
        if not re.search(r"[a-zA-Z]", v) or not re.search(r"[0-9]", v):
            raise PasswordValidationError("Password must contain both letters and numbers")
        return v


class PasswordChangeResponse(BaseModel):
    """Schema for password change response."""

    message: str


__all__ = [
    "PasswordChangeRequest",
    "PasswordChangeResponse",
    "PasswordValidationError",
]
