"""Test helper functions for backend tests.

This module provides reusable helper functions to reduce code duplication
and improve test maintainability.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from flask import Flask
from werkzeug.test import TestResponse


def create_user(app: Flask, email: str = "test@example.com", password: str = "password123", role: str = "user", name: str | None = None) -> int:
    """Create a user directly in the database.

    Args:
        app: Flask application instance
        email: User email address
        password: User password (will be hashed)
        role: User role ('admin' or 'user', default: 'user')
        name: User display name (optional)

    Returns:
        int: Created user ID
    """
    from app.database import get_session
    from app.models.user import User
    from app.utils.password import hash_password

    with app.app_context():
        session = get_session()
        user = User(email=email, password_hash=hash_password(password), role=role, name=name)
        session.add(user)
        session.commit()
        user_id = user.id
        session.expunge(user)

    return user_id


def create_auth_client(app: Flask, user_id: int, email: str = "test@example.com", role: str = "user"):
    """Create an authenticated test client for a specific user.

    Args:
        app: Flask application instance
        user_id: User ID to authenticate as
        email: User email address (default: test@example.com)
        role: User role (default: user)

    Returns:
        FlaskClient: Test client with authentication cookie set
    """
    with app.app_context():
        jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
        jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

        now = datetime.now(timezone.utc)
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "exp": now + timedelta(hours=1),
            "iat": now,
        }
        access_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

        client = app.test_client()
        client.set_cookie("access_token", access_token)

        return client


def assert_response_success(response: TestResponse, expected_status: int = 200, **expected_fields) -> dict[str, Any]:
    """Assert that response is successful and matches expected fields.

    Args:
        response: Flask test response
        expected_status: Expected HTTP status code (default 200)
        **expected_fields: Expected field values in response JSON

    Returns:
        dict: Response JSON data

    Raises:
        AssertionError: If response status or fields don't match expectations
    """
    assert response.status_code == expected_status, f"Expected status {expected_status}, got {response.status_code}: {response.get_json()}"

    data = response.get_json()
    assert data is not None, "Response body is empty"

    for field, value in expected_fields.items():
        assert field in data, f"Field '{field}' not found in response: {data}"
        assert data[field] == value, f"Expected {field}={value}, got {data[field]}"

    return data


def assert_response_error(response: TestResponse, expected_status: int, expected_code: int | None = None) -> dict[str, Any]:
    """Assert that response is an error with expected status and code.

    Args:
        response: Flask test response
        expected_status: Expected HTTP status code
        expected_code: Expected error code in response (defaults to expected_status)

    Returns:
        dict: Response JSON data

    Raises:
        AssertionError: If response status or error code don't match expectations
    """
    if expected_code is None:
        expected_code = expected_status

    assert response.status_code == expected_status, f"Expected status {expected_status}, got {response.status_code}"

    data = response.get_json()
    assert data is not None, "Response body is empty"
    assert "error" in data, f"Expected error response, got: {data}"

    # Handle both string errors and structured error objects
    error_value = data["error"]
    if isinstance(error_value, dict) and "code" in error_value:
        assert error_value["code"] == expected_code, f"Expected error code {expected_code}, got {error_value['code']}"
    # If error is a string, just verify status code matches (code check not applicable)

    return data


def assert_cookie_set(response: TestResponse, cookie_name: str, should_be_cleared: bool = False) -> None:
    """Assert that a cookie is set (or cleared) in the response.

    Args:
        response: Flask test response
        cookie_name: Name of the cookie to check
        should_be_cleared: If True, assert cookie is cleared (max-age=0)

    Raises:
        AssertionError: If cookie is not set/cleared as expected
    """
    # Get all Set-Cookie headers (Flask can set multiple cookies)
    set_cookie_headers = response.headers.getlist("Set-Cookie")
    all_cookies = " ".join(set_cookie_headers)

    assert cookie_name in all_cookies, f"Cookie '{cookie_name}' not found in Set-Cookie headers: {set_cookie_headers}"

    if should_be_cleared:
        # Find the specific cookie and check if it has max-age=0
        cookie_header = next((h for h in set_cookie_headers if cookie_name in h), "")
        assert "max-age=0" in cookie_header.lower(), f"Cookie '{cookie_name}' should be cleared (max-age=0), got: {cookie_header}"
