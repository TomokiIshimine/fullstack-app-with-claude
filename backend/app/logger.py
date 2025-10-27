from __future__ import annotations

import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path


def setup_logging(app_logger: logging.Logger, log_dir: str | Path, log_level: str, is_development: bool, is_testing: bool = False) -> None:
    """
    Configure application logging with file rotation and optional console output.

    Args:
        app_logger: Flask app logger to configure
        log_dir: Directory path for log files
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        is_development: If True, also output logs to console
        is_testing: If True, skip file logging (console only)
    """
    # Convert log_level string to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    app_logger.setLevel(numeric_level)

    # Clear existing handlers to avoid duplicates (close them first)
    for handler in app_logger.handlers[:]:
        handler.close()
        app_logger.removeHandler(handler)

    # Create formatter (text format)
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # In testing mode, use console only (no file logging to avoid resource warnings)
    if is_testing:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        app_logger.addHandler(console_handler)
        app_logger.propagate = False
        app_logger.info(f"Logging initialized: level={log_level}, mode=testing (console only)")
        return

    # Create log directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    # Configure log file path
    log_file = log_path / "app.log"

    # Create file handler with daily rotation (midnight), keeping 5 backups
    file_handler = TimedRotatingFileHandler(
        filename=str(log_file),
        when="midnight",  # Rotate at midnight
        interval=1,  # Daily
        backupCount=5,  # Keep 5 old log files
        encoding="utf-8",
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)

    # Add file handler
    app_logger.addHandler(file_handler)

    # Add console handler only in development
    if is_development:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        app_logger.addHandler(console_handler)

    # Prevent propagation to avoid duplicate logs
    app_logger.propagate = False

    app_logger.info(f"Logging initialized: level={log_level}, file={log_file}, console={'enabled' if is_development else 'disabled'}")


__all__ = ["setup_logging"]
