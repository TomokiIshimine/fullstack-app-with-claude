from __future__ import annotations

import logging
import os
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
_connector = None  # Cloud SQL Connector instance


def _create_cloud_sql_engine() -> Engine:
    """Create SQLAlchemy engine using Cloud SQL Python Connector with IAM authentication."""
    from google.cloud.sql.connector import Connector

    global _connector

    instance_connection_name = os.getenv("CLOUDSQL_INSTANCE")
    db_user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")
    enable_iam_auth = os.getenv("ENABLE_IAM_AUTH", "false").lower() == "true"

    if not all([instance_connection_name, db_user, db_name]):
        raise ValueError("CLOUDSQL_INSTANCE, DB_USER, and DB_NAME must be set when USE_CLOUD_SQL_CONNECTOR=true")

    logger.info(f"Initializing Cloud SQL Connector: instance={instance_connection_name}, user={db_user}, db={db_name}, iam_auth={enable_iam_auth}")

    _connector = Connector()

    def getconn():
        """Create a connection to Cloud SQL instance using the Connector."""
        conn_args = {
            "user": db_user,
            "db": db_name,
        }

        if enable_iam_auth:
            # IAM authentication - no password needed
            conn_args["enable_iam_auth"] = True
            logger.debug("Using IAM authentication for Cloud SQL connection")
        else:
            # Password-based authentication
            db_pass = os.getenv("DB_PASS")
            if not db_pass:
                raise ValueError("DB_PASS must be set when ENABLE_IAM_AUTH=false")
            conn_args["password"] = db_pass
            logger.debug("Using password authentication for Cloud SQL connection")

        return _connector.connect(instance_connection_name, "pymysql", **conn_args)

    # Pool size configuration
    pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
    max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))

    engine = create_engine(
        "mysql+pymysql://",
        creator=getconn,
        future=True,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
    )

    logger.info("Cloud SQL Connector engine initialized successfully")
    return engine


def _create_standard_engine(database_uri: str) -> Engine:
    """Create SQLAlchemy engine using standard connection URI (for local development)."""
    # Hide password in log by replacing it with ***
    safe_uri = database_uri
    if "@" in database_uri:
        parts = database_uri.split("@")
        if "://" in parts[0]:
            protocol_user = parts[0].split("://")
            if ":" in protocol_user[1]:
                user = protocol_user[1].split(":")[0]
                safe_uri = f"{protocol_user[0]}://{user}:***@{parts[1]}"

    logger.info(f"Initializing standard database engine: {safe_uri}")

    engine = create_engine(
        database_uri,
        future=True,
        pool_pre_ping=True,
    )

    logger.info("Standard database engine initialized successfully")
    return engine


def init_engine(database_uri: str) -> None:
    """Initialise SQLAlchemy engine and scoped session factory."""
    global _engine, _session_factory

    if _session_factory is not None:
        logger.debug("Removing existing session factory")
        _session_factory.remove()

    if _engine is not None:
        logger.debug("Disposing existing database engine")
        _engine.dispose()

    # Check if Cloud SQL Connector should be used
    use_cloud_sql_connector = os.getenv("USE_CLOUD_SQL_CONNECTOR", "false").lower() == "true"

    if use_cloud_sql_connector:
        _engine = _create_cloud_sql_engine()
    else:
        _engine = _create_standard_engine(database_uri)

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
