from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Any

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
        (re.compile(r"([\w.+-]+@\w+\.[\w.-]+)"), "***"),
    ]

    SENSITIVE_KEYWORDS = (
        "password",
        "passwd",
        "secret",
        "token",
        "api_key",
        "apikey",
        "credential",
        "authorization",
        "auth",
        "email",
    )

    def _mask_string(self, value: str) -> str:
        masked = value
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            masked = pattern.sub(replacement, masked)
        return masked

    def _should_mask_key(self, key: Any) -> bool:
        if key is None:
            return False
        try:
            key_str = str(key).lower()
        except Exception:
            return False
        return any(keyword in key_str for keyword in self.SENSITIVE_KEYWORDS)

    def _sanitize(self, value: Any, *, key: Any | None = None) -> Any:
        if value is None:
            return None

        if isinstance(value, str):
            if key is not None and self._should_mask_key(key):
                return "***"
            return self._mask_string(value)

        if isinstance(value, dict):
            sanitized_dict: dict[Any, Any] = {}
            for dict_key, dict_value in value.items():
                if self._should_mask_key(dict_key):
                    sanitized_dict[dict_key] = "***"
                else:
                    sanitized_dict[dict_key] = self._sanitize(dict_value)
            return sanitized_dict

        if isinstance(value, list):
            return [self._sanitize(item) for item in value]

        if isinstance(value, tuple):
            return tuple(self._sanitize(item) for item in value)

        return value

    def filter(self, record: logging.LogRecord) -> bool:
        """Mask sensitive information in log messages and structured data."""
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = self._mask_string(record.msg)

        if hasattr(record, "args") and record.args:
            try:
                if isinstance(record.args, dict):
                    record.args = {
                        key: ("***" if self._should_mask_key(key) else self._sanitize(value, key=key)) for key, value in record.args.items()
                    }
                elif isinstance(record.args, (list, tuple)):
                    sanitized_args = [self._sanitize(arg) for arg in record.args]
                    record.args = tuple(sanitized_args) if isinstance(record.args, tuple) else sanitized_args
                else:
                    record.args = self._sanitize(record.args)
            except Exception:
                pass

        for attr, value in list(record.__dict__.items()):
            if attr in LOG_RECORD_RESERVED_ATTRS:
                continue
            record.__dict__[attr] = self._sanitize(value, key=attr)

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

        extra_data = {key: value for key, value in record.__dict__.items() if key not in LOG_RECORD_RESERVED_ATTRS and key not in log_data}

        if extra_data:
            log_data.update(extra_data)

        return json.dumps(log_data, ensure_ascii=False, default=_json_serialize)


class StructuredTextFormatter(logging.Formatter):
    """Text formatter that appends structured key/value pairs."""

    def format(self, record: logging.LogRecord) -> str:
        base_message = super().format(record)
        extra_parts = []
        for key, value in record.__dict__.items():
            if key in LOG_RECORD_RESERVED_ATTRS or key == "message":
                continue
            extra_parts.append(f"{key}={_stringify(value)}")

        if extra_parts:
            return f"{base_message} | {' '.join(extra_parts)}"
        return base_message


def _stringify(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)) or value is None:
        return str(value)
    try:
        return json.dumps(value, ensure_ascii=False)
    except TypeError:
        return str(value)


def _json_serialize(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, dict):
        return {key: _json_serialize(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_serialize(item) for item in value]
    if hasattr(value, "model_dump"):
        return _json_serialize(value.model_dump())
    return str(value)


LOG_RECORD_RESERVED_ATTRS = {
    "name",
    "msg",
    "args",
    "levelname",
    "levelno",
    "pathname",
    "filename",
    "module",
    "exc_info",
    "exc_text",
    "stack_info",
    "lineno",
    "funcName",
    "created",
    "msecs",
    "relativeCreated",
    "thread",
    "threadName",
    "processName",
    "process",
    "message",
    "asctime",
    "request_id",
}


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
        formatter = StructuredTextFormatter(
            fmt="%(asctime)s - [%(request_id)s] - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Create filters
    request_id_filter = RequestIDFilter()
    sensitive_data_filter = SensitiveDataFilter()

    # In testing mode, use console only (no file logging to avoid resource warnings)
    if is_testing:
        console_handler = logging.StreamHandler(stream=sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(request_id_filter)
        console_handler.addFilter(sensitive_data_filter)
        root_logger.addHandler(console_handler)
        app_logger.info(f"Logging initialized: level={log_level}, mode=testing (console only)")
        return

    handlers: list[logging.Handler] = []

    # Always add console handler for compatibility with containerized environments
    console_handler = logging.StreamHandler(stream=sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_id_filter)
    console_handler.addFilter(sensitive_data_filter)
    handlers.append(console_handler)

    log_file: Path | None = None

    if not is_production:
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
        handlers.append(file_handler)

    for handler in handlers:
        root_logger.addHandler(handler)

    # Configure werkzeug logger to reduce noise in production
    werkzeug_logger = logging.getLogger("werkzeug")
    if not is_development:
        # In production, only log warnings and errors from werkzeug
        werkzeug_logger.setLevel(logging.WARNING)
    else:
        # In development, use the same level as root logger
        werkzeug_logger.setLevel(numeric_level)

    format_type = "JSON" if is_production else "text"
    outputs = ["console=stdout"]
    if log_file is not None:
        outputs.insert(0, f"file={log_file}")
    app_logger.info(f"Logging initialized: level={log_level}, format={format_type}, outputs={', '.join(outputs)}")


__all__ = ["setup_logging"]
