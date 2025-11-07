from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class SchemaMigration(Base):
    """Schema migration tracking model."""

    __tablename__ = "schema_migrations"
    __table_args__ = (
        Index("idx_schema_migrations_filename", "filename", unique=True),
        {"sqlite_autoincrement": True},
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    filename: Mapped[str] = mapped_column(String(length=255), nullable=False, unique=True)
    checksum: Mapped[str] = mapped_column(String(length=64), nullable=False)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"SchemaMigration(filename={self.filename!r}, applied_at={self.applied_at!r})"


__all__ = ["SchemaMigration"]
