from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH if ENV_PATH.exists() else None)

DEFAULT_DB_URL = "mysql+pymysql://app_user:example-password@db:3306/app_db"
DEFAULT_LOG_DIR = BASE_DIR / "logs"


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
