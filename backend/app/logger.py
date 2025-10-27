from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

from flask import g, has_request_context


class RequestIDFilter(logging.Filter):
    """Add request ID to log records when available."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add request_id attribute to log record."""
        if has_request_context() and hasattr(g, "request_id"):
            record.request_id = g.request_id
        else:
            record.request_id = "no-request"
        return True


class SensitiveDataFilter(logging.Filter):
    """Filter sensitive information from log messages."""

    # Patterns to detect and mask sensitive data
    SENSITIVE_PATTERNS = [
        (re.compile(r"(password['\"\s:=]+)[\w\S]+", re.IGNORECASE), r"\1***"),
        (re.compile(r"(token['\"\s:=]+)[\w\S]+", re.IGNORECASE), r"\1***"),
        (re.compile(r"(api[_-]?key['\"\s:=]+)[\w\S]+", re.IGNORECASE), r"\1***"),
        (re.compile(r"(secret['\"\s:=]+)[\w\S]+", re.IGNORECASE), r"\1***"),
        (re.compile(r"(authorization['\"\s:=]+bearer\s+)[\w\S]+", re.IGNORECASE), r"\1***"),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        """Mask sensitive information in log messages."""
        if hasattr(record, "msg") and isinstance(record.msg, str):
            msg = record.msg
            for pattern, replacement in self.SENSITIVE_PATTERNS:
                msg = pattern.sub(replacement, msg)
            record.msg = msg

        # Also filter args if present
        if hasattr(record, "args") and record.args:
            try:
                if isinstance(record.args, dict):
                    filtered_args_dict = {}
                    for key, value in record.args.items():
                        if isinstance(value, str):
                            filtered_value = value
                            for pattern, replacement in self.SENSITIVE_PATTERNS:
                                filtered_value = pattern.sub(replacement, filtered_value)
                            filtered_args_dict[key] = filtered_value
                        else:
                            filtered_args_dict[key] = value
                    record.args = filtered_args_dict  # type: ignore
                elif isinstance(record.args, (list, tuple)):
                    filtered_args_list = []
                    for arg in record.args:
                        if isinstance(arg, str):
                            filtered_arg = arg
                            for pattern, replacement in self.SENSITIVE_PATTERNS:
                                filtered_arg = pattern.sub(replacement, filtered_arg)
                            filtered_args_list.append(filtered_arg)
                        else:
                            filtered_args_list.append(arg)  # type: ignore
                    record.args = tuple(filtered_args_list) if isinstance(record.args, tuple) else filtered_args_list  # type: ignore
            except Exception:
                # If filtering args fails, keep original to avoid breaking logging
                pass

        return True


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "no-request"),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add pathname and line number for errors and warnings
        if record.levelno >= logging.WARNING:
            log_data["file"] = record.pathname
            log_data["line"] = record.lineno
            log_data["function"] = record.funcName

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(app_logger: logging.Logger, log_dir: str | Path, log_level: str, is_development: bool, is_testing: bool = False) -> None:
    """
    Configure application logging with file rotation and optional console output.

    Args:
        app_logger: Flask app logger to configure
        log_dir: Directory path for log files
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        is_development: If True, also output logs to console with text format
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

    # Determine if this is production (not development and not testing)
    is_production = not is_development and not is_testing

    # Create formatter based on environment
    # Production uses JSON for structured logging, others use text format
    formatter: logging.Formatter
    if is_production:
        formatter = JsonFormatter()  # type: ignore
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s - [%(request_id)s] - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Create filters
    request_id_filter = RequestIDFilter()
    sensitive_data_filter = SensitiveDataFilter()

    # In testing mode, use console only (no file logging to avoid resource warnings)
    if is_testing:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(request_id_filter)
        console_handler.addFilter(sensitive_data_filter)
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
    file_handler.addFilter(request_id_filter)
    file_handler.addFilter(sensitive_data_filter)

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
        console_handler.addFilter(request_id_filter)
        console_handler.addFilter(sensitive_data_filter)
        root_logger.addHandler(console_handler)

    # Configure werkzeug logger to reduce noise in production
    werkzeug_logger = logging.getLogger("werkzeug")
    if not is_development:
        # In production, only log warnings and errors from werkzeug
        werkzeug_logger.setLevel(logging.WARNING)
    else:
        # In development, use the same level as root logger
        werkzeug_logger.setLevel(numeric_level)

    format_type = "JSON" if is_production else "text"
    console_status = "enabled" if is_development else "disabled"
    app_logger.info(f"Logging initialized: level={log_level}, format={format_type}, file={log_file}, console={console_status}")


__all__ = ["setup_logging"]
