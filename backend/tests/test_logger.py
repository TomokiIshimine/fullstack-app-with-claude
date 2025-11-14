import json
import logging
from pathlib import Path

import pytest

from app.logger import JsonFormatter, SensitiveDataFilter, StructuredTextFormatter, setup_logging


@pytest.fixture(autouse=True)
def reset_logging():
    """Reset logging handlers after each test to avoid cross-contamination."""
    yield
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        handler.close()
        root_logger.removeHandler(handler)


def test_sensitive_data_filter_masks_nested_data():
    record = logging.LogRecord(
        name="test.logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=10,
        msg="Login attempt for user@example.com with password=secret",
        args=(),
        exc_info=None,
    )
    record.args = {"password": "secret123", "note": "contact user@example.com"}
    record.details = {
        "email": "user@example.com",
        "token": "token-value",
        "profile": {
            "api_key": "key-123",
            "nested": ["user@example.com", {"auth_token": "nested"}],
        },
    }

    sensitive_filter = SensitiveDataFilter()
    sensitive_filter.filter(record)

    assert "user@example.com" not in record.msg
    assert record.args["password"] == "***"
    assert "user@example.com" not in record.args["note"]
    assert record.details["email"] == "***"
    assert record.details["token"] == "***"
    assert record.details["profile"]["api_key"] == "***"
    nested_list = record.details["profile"]["nested"]
    assert "user@example.com" not in nested_list[0]
    assert nested_list[1]["auth_token"] == "***"


def test_json_formatter_includes_extra_fields():
    record = logging.LogRecord(
        name="test.logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=50,
        msg="Request completed",
        args=(),
        exc_info=None,
    )
    record.request_id = "req-123"
    record.http_method = "GET"
    record.status_code = 200
    record.duration_ms = 12.34

    formatter = JsonFormatter()
    payload = json.loads(formatter.format(record))

    assert payload["message"] == "Request completed"
    assert payload["request_id"] == "req-123"
    assert payload["http_method"] == "GET"
    assert payload["status_code"] == 200
    assert payload["duration_ms"] == 12.34


def test_structured_text_formatter_appends_extra_data():
    formatter = StructuredTextFormatter(fmt="%(levelname)s:%(message)s")
    record = logging.LogRecord(
        name="test.logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=80,
        msg="Request completed",
        args=(),
        exc_info=None,
    )
    record.http_method = "POST"
    record.status_code = 201

    output = formatter.format(record)

    assert output.startswith("INFO:Request completed")
    assert "http_method=POST" in output
    assert "status_code=201" in output


def test_setup_logging_production_uses_console_only(tmp_path):
    logger = logging.getLogger("test-setup-logger")
    log_directory = Path(tmp_path)

    setup_logging(
        app_logger=logger,
        log_dir=str(log_directory),
        log_level="INFO",
        is_development=False,
        is_testing=False,
    )

    root_handlers = logging.getLogger().handlers
    assert any(isinstance(handler, logging.StreamHandler) for handler in root_handlers)
    assert not any(isinstance(handler, logging.FileHandler) for handler in root_handlers)


def test_setup_logging_development_includes_file_handler(tmp_path):
    logger = logging.getLogger("test-dev-logger")
    log_directory = Path(tmp_path)

    setup_logging(
        app_logger=logger,
        log_dir=str(log_directory),
        log_level="INFO",
        is_development=True,
        is_testing=False,
    )

    root_handlers = logging.getLogger().handlers
    assert any(isinstance(handler, logging.StreamHandler) for handler in root_handlers)
    assert any(isinstance(handler, logging.FileHandler) for handler in root_handlers)
