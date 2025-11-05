from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

from flask import g, has_app_context
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, scoped_session, sessionmaker
from sqlalchemy.orm.scoping import ScopedSession

from app.config import CloudSQLConfig, DatabaseConfig, load_cloud_sql_config, load_database_config

# Conditional import for Cloud SQL Connector
try:
    from google.cloud.sql.connector import Connector, IPTypes

    CLOUD_SQL_AVAILABLE = True
except ImportError:
    CLOUD_SQL_AVAILABLE = False
    Connector = None  # type: ignore
    IPTypes = None  # type: ignore

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_session_factory: ScopedSession[Session] | None = None
_connector: Connector | None = None  # Cloud SQL Connector instance


def _convert_ip_type_to_enum(ip_type_str: str):  # type: ignore
    """Convert IP type string to IPTypes enum.

    Args:
        ip_type_str: IP type as string ("PRIVATE" or "PUBLIC").

    Returns:
        IPTypes enum value.

    Raises:
        ValueError: If ip_type_str is not "PRIVATE" or "PUBLIC".
    """
    if not CLOUD_SQL_AVAILABLE or IPTypes is None:
        raise RuntimeError("Cloud SQL Connector is not available")

    if ip_type_str == "PRIVATE":
        return IPTypes.PRIVATE
    elif ip_type_str == "PUBLIC":
        return IPTypes.PUBLIC
    else:
        raise ValueError(f"Invalid IP type: {ip_type_str}. Must be 'PRIVATE' or 'PUBLIC'")


def _create_connection_factory(cloud_sql_config: CloudSQLConfig, connector: Connector):  # type: ignore
    """Create a connection factory function for Cloud SQL Connector.

    Args:
        cloud_sql_config: Cloud SQL configuration.
        connector: Cloud SQL Connector instance.

    Returns:
        A callable that creates database connections.
    """

    def getconn():  # type: ignore
        """Create a connection to Cloud SQL instance using the Connector."""
        conn_args: dict[str, str | bool] = {
            "user": cloud_sql_config.db_user,
            "db": cloud_sql_config.db_name,
        }

        if cloud_sql_config.enable_iam_auth:
            # IAM authentication - no password needed
            conn_args["enable_iam_auth"] = True
            logger.debug("Using IAM authentication for Cloud SQL connection")
        else:
            # Password-based authentication
            if cloud_sql_config.db_pass:
                conn_args["password"] = cloud_sql_config.db_pass
            logger.debug("Using password authentication for Cloud SQL connection")

        # Convert IP type string to IPTypes enum
        ip_type_enum = _convert_ip_type_to_enum(cloud_sql_config.ip_type)
        logger.debug(f"Connecting to Cloud SQL using IP type: {cloud_sql_config.ip_type} ({ip_type_enum})")
        return connector.connect(cloud_sql_config.instance_connection_name, "pymysql", ip_type=ip_type_enum, **conn_args)

    return getconn


def _create_cloud_sql_engine(db_config: DatabaseConfig, cloud_sql_config: CloudSQLConfig) -> Engine:
    """Create SQLAlchemy engine using Cloud SQL Python Connector.

    Args:
        db_config: Database configuration (pool size, etc.).
        cloud_sql_config: Cloud SQL specific configuration.

    Returns:
        SQLAlchemy Engine instance.

    Raises:
        RuntimeError: If Cloud SQL Connector is not available.
    """
    global _connector

    if not CLOUD_SQL_AVAILABLE or Connector is None:
        raise RuntimeError("Cloud SQL Connector is not installed. Install with: pip install 'cloud-sql-python-connector[pymysql]'")

    logger.info(
        f"Initializing Cloud SQL Connector: instance={cloud_sql_config.instance_connection_name}, "
        f"user={cloud_sql_config.db_user}, db={cloud_sql_config.db_name}, iam_auth={cloud_sql_config.enable_iam_auth}"
    )

    _connector = Connector()

    # Create connection factory
    getconn = _create_connection_factory(cloud_sql_config, _connector)

    engine = create_engine(
        "mysql+pymysql://",
        creator=getconn,
        future=True,
        pool_pre_ping=True,
        pool_size=db_config.pool_size,
        max_overflow=db_config.max_overflow,
    )

    logger.info("Cloud SQL Connector engine initialized successfully")
    return engine


def _mask_password_in_uri(database_uri: str) -> str:
    """Mask password in database URI for safe logging.

    Args:
        database_uri: Database connection URI.

    Returns:
        URI with password replaced by '***'.
    """
    safe_uri = database_uri
    if "@" in database_uri:
        parts = database_uri.split("@")
        if "://" in parts[0]:
            protocol_user = parts[0].split("://")
            if ":" in protocol_user[1]:
                user = protocol_user[1].split(":")[0]
                safe_uri = f"{protocol_user[0]}://{user}:***@{parts[1]}"
    return safe_uri


def _create_standard_engine(db_config: DatabaseConfig) -> Engine:
    """Create SQLAlchemy engine using standard connection URI (for local development).

    Args:
        db_config: Database configuration.

    Returns:
        SQLAlchemy Engine instance.
    """
    safe_uri = _mask_password_in_uri(db_config.database_uri)
    logger.info(f"Initializing standard database engine: {safe_uri}")

    # Build engine kwargs
    engine_kwargs: dict[str, bool | int] = {
        "future": True,
        "pool_pre_ping": True,
    }

    # SQLite uses SingletonThreadPool which doesn't support pool_size and max_overflow
    # Only add these parameters for non-SQLite databases
    if not db_config.database_uri.startswith("sqlite"):
        engine_kwargs["pool_size"] = db_config.pool_size
        engine_kwargs["max_overflow"] = db_config.max_overflow

    engine = create_engine(db_config.database_uri, **engine_kwargs)  # type: ignore

    logger.info("Standard database engine initialized successfully")
    return engine


def cleanup_connector() -> None:
    """Clean up Cloud SQL Connector resources.

    Should be called when shutting down the application to properly close
    the Connector instance and release resources.
    """
    global _connector

    if _connector is not None:
        logger.debug("Closing Cloud SQL Connector")
        _connector.close()
        _connector = None


def init_engine(database_uri: str) -> None:
    """Initialise SQLAlchemy engine and scoped session factory.

    Args:
        database_uri: Database connection URI (used only when USE_CLOUD_SQL_CONNECTOR is false).
                     For backward compatibility, this parameter is still required.

    Note:
        This function maintains backward compatibility by accepting database_uri parameter.
        When USE_CLOUD_SQL_CONNECTOR=true, the database_uri parameter is ignored and
        configuration is loaded from environment variables via load_database_config()
        and load_cloud_sql_config().
    """
    global _engine, _session_factory

    if _session_factory is not None:
        logger.debug("Removing existing session factory")
        _session_factory.remove()

    if _engine is not None:
        logger.debug("Disposing existing database engine")
        _engine.dispose()

    # Clean up existing connector if any
    cleanup_connector()

    # Load database configuration from environment variables
    db_config = load_database_config()

    if db_config.use_cloud_sql_connector:
        # Cloud SQL Connector mode
        cloud_sql_config = load_cloud_sql_config()
        _engine = _create_cloud_sql_engine(db_config, cloud_sql_config)
    else:
        # Standard connection mode (backward compatible)
        # Use database_uri parameter for backward compatibility
        # If database_uri is not provided, use the one from db_config
        db_config.database_uri = database_uri or db_config.database_uri
        _engine = _create_standard_engine(db_config)

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
    "cleanup_connector",
    "get_engine",
    "get_session_factory",
    "get_session",
    "session_scope",
]
