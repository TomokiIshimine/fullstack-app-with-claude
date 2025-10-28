from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class RefreshToken(Base):
    """Refresh token model for JWT authentication."""

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("idx_refresh_tokens_token", "token", unique=True),
        Index("idx_refresh_tokens_user_id", "user_id"),
        Index("idx_refresh_tokens_expires_at", "expires_at"),
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    token: Mapped[str] = mapped_column(String(length=500), nullable=False, unique=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )
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
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")  # type: ignore  # noqa: F821

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"RefreshToken(id={self.id!r}, user_id={self.user_id!r}, is_revoked={self.is_revoked!r})"


__all__ = ["RefreshToken"]
