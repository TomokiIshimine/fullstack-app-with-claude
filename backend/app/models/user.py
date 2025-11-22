from __future__ import annotations

from datetime import datetime
from typing import Literal

from sqlalchemy import BigInteger, DateTime, Enum, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_role", "role"),
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    email: Mapped[str] = mapped_column(String(length=255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(length=255), nullable=False)
    role: Mapped[Literal["admin", "user"]] = mapped_column(
        Enum("admin", "user", name="user_role"),
        nullable=False,
        server_default="user",
    )
    name: Mapped[str | None] = mapped_column(String(length=100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # type: ignore  # noqa: F821
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"User(id={self.id!r}, email={self.email!r})"


__all__ = ["User"]
