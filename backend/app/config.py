from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH if ENV_PATH.exists() else None)

DEFAULT_DB_URL = "mysql+pymysql://app_user:example-password@db:3306/app_db"
DEFAULT_LOG_DIR = BASE_DIR / "logs"


@dataclass
class DatabaseConfig:
    """Database connection configuration."""

    use_cloud_sql_connector: bool
    database_uri: str
    pool_size: int = 5
    max_overflow: int = 10


@dataclass
class CloudSQLConfig:
    """Cloud SQL Connector specific configuration."""

    instance_connection_name: str
    db_user: str
    db_name: str
    db_pass: str | None
    enable_iam_auth: bool
    ip_type: str = "PRIVATE"  # PRIVATE or PUBLIC (PRIMARY)


def load_database_config() -> DatabaseConfig:
    """Load database configuration from environment variables."""
    use_cloud_sql = os.getenv("USE_CLOUD_SQL_CONNECTOR", "false").lower() == "true"
    database_uri = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
    pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
    max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))

    return DatabaseConfig(
        use_cloud_sql_connector=use_cloud_sql,
        database_uri=database_uri,
        pool_size=pool_size,
        max_overflow=max_overflow,
    )


def load_cloud_sql_config() -> CloudSQLConfig:
    """Load Cloud SQL Connector configuration from environment variables.

    Raises:
        ValueError: If required environment variables are not set.
    """
    instance_connection_name = os.getenv("CLOUDSQL_INSTANCE")
    db_user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")
    enable_iam_auth = os.getenv("ENABLE_IAM_AUTH", "false").lower() == "true"
    ip_type = os.getenv("CLOUDSQL_IP_TYPE", "PRIVATE").upper()

    if not all([instance_connection_name, db_user, db_name]):
        raise ValueError("CLOUDSQL_INSTANCE, DB_USER, and DB_NAME must be set when USE_CLOUD_SQL_CONNECTOR=true")

    # Password is required only when IAM auth is disabled
    db_pass = os.getenv("DB_PASS")
    if not enable_iam_auth and not db_pass:
        raise ValueError("DB_PASS must be set when ENABLE_IAM_AUTH=false")

    # Validate IP type
    if ip_type not in ("PRIVATE", "PUBLIC"):
        raise ValueError(f"CLOUDSQL_IP_TYPE must be 'PRIVATE' or 'PUBLIC', got: {ip_type}")

    return CloudSQLConfig(
        instance_connection_name=instance_connection_name,  # type: ignore
        db_user=db_user,  # type: ignore
        db_name=db_name,  # type: ignore
        db_pass=db_pass,
        enable_iam_auth=enable_iam_auth,
        ip_type=ip_type,
    )


class Config:
    """Base configuration loaded from environment variables."""

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Logging configuration
    LOG_DIR = os.getenv("LOG_DIR", str(DEFAULT_LOG_DIR))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")

    # Set TESTING flag for test environment
    TESTING = FLASK_ENV == "testing"

    # Determine log level based on environment
    # Development/Testing: DEBUG, Production: INFO
    _env_log_level = os.getenv("LOG_LEVEL")
    if _env_log_level:
        LOG_LEVEL = _env_log_level.upper()
    else:
        LOG_LEVEL = "DEBUG" if FLASK_ENV in ("development", "testing") else "INFO"

    @classmethod
    def refresh(cls) -> None:
        """Reload env vars into config. Useful for tests."""
        cls.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
        cls.LOG_DIR = os.getenv("LOG_DIR", str(DEFAULT_LOG_DIR))
        cls.FLASK_ENV = os.getenv("FLASK_ENV", "production")
        cls.TESTING = cls.FLASK_ENV == "testing"
        _env_log_level = os.getenv("LOG_LEVEL")
        if _env_log_level:
            cls.LOG_LEVEL = _env_log_level.upper()
        else:
            cls.LOG_LEVEL = "DEBUG" if cls.FLASK_ENV in ("development", "testing") else "INFO"
