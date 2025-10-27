from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

from flask import g, has_app_context
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from sqlalchemy.orm.scoping import ScopedSession

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_session_factory: ScopedSession[Session] | None = None


def init_engine(database_uri: str) -> None:
    """Initialise SQLAlchemy engine and scoped session factory."""
    global _engine, _session_factory

    # Hide password in log by replacing it with ***
    safe_uri = database_uri
    if "@" in database_uri:
        parts = database_uri.split("@")
        if "://" in parts[0]:
            protocol_user = parts[0].split("://")
            if ":" in protocol_user[1]:
                user = protocol_user[1].split(":")[0]
                safe_uri = f"{protocol_user[0]}://{user}:***@{parts[1]}"

    logger.info(f"Initializing database engine: {safe_uri}")

    if _session_factory is not None:
        logger.debug("Removing existing session factory")
        _session_factory.remove()

    if _engine is not None:
        logger.debug("Disposing existing database engine")
        _engine.dispose()

    _engine = create_engine(
        database_uri,
        future=True,
        pool_pre_ping=True,
    )

    _session_factory = scoped_session(sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False))
    logger.info("Database engine and session factory initialized successfully")


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Database engine is not initialised.")
    return _engine


def get_session_factory() -> ScopedSession[Session]:
    if _session_factory is None:
        raise RuntimeError("Database session factory is not initialised.")
    return _session_factory


def get_session() -> Session:
    """Return a SQLAlchemy session bound to the current context."""
    factory = get_session_factory()

    if has_app_context():
        session = g.get("db_session")
        if session is None:
            session = factory()
            g.db_session = session
        return session

    # Outside of Flask application context (e.g. in tests), return a new session.
    return factory()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope for scripts or tests."""
    session = get_session()
    logger.debug("Starting database transaction scope")
    try:
        yield session
        session.commit()
        logger.debug("Database transaction committed successfully")
    except Exception as e:
        logger.error(f"Database transaction failed, rolling back: {e}", exc_info=True)
        session.rollback()
        raise
    finally:
        if not has_app_context():
            logger.debug("Closing database session outside Flask context")
            session.close()
            get_session_factory().remove()


__all__ = [
    "init_engine",
    "get_engine",
    "get_session_factory",
    "get_session",
    "session_scope",
]
