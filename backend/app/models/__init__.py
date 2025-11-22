"""Database models package."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


# Import models to ensure they are registered with Base metadata
from .refresh_token import RefreshToken  # noqa: E402, F401
from .schema_migration import SchemaMigration  # noqa: E402, F401
from .user import User  # noqa: E402, F401

__all__ = ["Base", "User", "RefreshToken", "SchemaMigration"]
