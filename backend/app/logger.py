from __future__ import annotations

import logging
from datetime import datetime
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

    # Configure root logger to ensure all module loggers inherit settings
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers from root logger
    for handler in root_logger.handlers[:]:
        handler.close()
        root_logger.removeHandler(handler)

    # Configure Flask app logger level (it will use root logger's handlers)
    app_logger.setLevel(numeric_level)

    # Clear Flask app logger's default handlers to avoid duplicates
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
        root_logger.addHandler(console_handler)
        app_logger.info(f"Logging initialized: level={log_level}, mode=testing (console only)")
        return

    # Create log directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    # Configure log file path with current date (e.g., app-2025-10-27.log)
    current_date = datetime.now().strftime("%Y-%m-%d")
    log_file = log_path / f"app-{current_date}.log"

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

    # Custom namer to ensure rotated files have date-based names
    def namer(default_name: str) -> str:
        """Generate date-based filename for rotated logs."""
        # TimedRotatingFileHandler appends a timestamp, we want just the date
        # Extract the date portion and create a clean filename
        dir_name, base_name = default_name.rsplit("/", 1) if "/" in default_name else ("", default_name)
        parts = base_name.split(".")
        if len(parts) >= 3:  # app-2025-10-27.log.2025-10-28 -> app-2025-10-28.log
            # Extract the date from the suffix
            date_suffix = parts[-1]  # 2025-10-28
            return f"{dir_name}/app-{date_suffix}.log" if dir_name else f"app-{date_suffix}.log"
        return default_name

    file_handler.namer = namer

    # Add file handler to root logger (all loggers inherit)
    root_logger.addHandler(file_handler)

    # Add console handler only in development
    if is_development:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    app_logger.info(f"Logging initialized: level={log_level}, file={log_file}, console={'enabled' if is_development else 'disabled'}")


__all__ = ["setup_logging"]
