"""Test data factories for backend tests.

This module provides factory classes and functions for generating test data
with sensible defaults and easy customization.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any


class TodoFactory:
    """Factory for creating todo test data."""

    @staticmethod
    def build(**overrides) -> dict[str, Any]:
        """Build todo data dictionary with default values.

        Args:
            **overrides: Fields to override defaults (title, detail, due_date, is_completed)

        Returns:
            dict: Todo data suitable for API requests

        Examples:
            >>> TodoFactory.build()
            {'title': 'Test Todo'}

            >>> TodoFactory.build(title='Custom Todo', detail='Details')
            {'title': 'Custom Todo', 'detail': 'Details'}
        """
        defaults: dict[str, Any] = {
            "title": "Test Todo",
        }

        # Only include optional fields if explicitly provided
        result = defaults.copy()
        for key, value in overrides.items():
            if value is not None or key in defaults:
                result[key] = value

        return result

    @staticmethod
    def build_with_due_date(days_from_now: int = 1, **overrides) -> dict[str, Any]:
        """Build todo with a due date relative to today.

        Args:
            days_from_now: Number of days from today (positive=future, negative=past)
            **overrides: Additional fields to override

        Returns:
            dict: Todo data with due_date field

        Examples:
            >>> TodoFactory.build_with_due_date(1)  # Tomorrow
            {'title': 'Test Todo', 'due_date': '2025-10-29'}

            >>> TodoFactory.build_with_due_date(-1)  # Yesterday
            {'title': 'Test Todo', 'due_date': '2025-10-27'}
        """
        due_date = get_date_offset(days_from_now).isoformat()
        return TodoFactory.build(due_date=due_date, **overrides)

    @staticmethod
    def build_completed(**overrides) -> dict[str, Any]:
        """Build completed todo data.

        Args:
            **overrides: Additional fields to override

        Returns:
            dict: Todo data with is_completed=True
        """
        return TodoFactory.build(is_completed=True, **overrides)


class UserFactory:
    """Factory for creating user test data."""

    _counter = 0

    @classmethod
    def build(cls, **overrides) -> dict[str, Any]:
        """Build user data dictionary with unique email.

        Args:
            **overrides: Fields to override defaults (email, password, role, name)

        Returns:
            dict: User data with unique email

        Examples:
            >>> UserFactory.build()
            {'email': 'user1@example.com', 'password': 'password123', 'role': 'user', 'name': 'Test User 1'}

            >>> UserFactory.build(email='custom@example.com', role='admin')
            {'email': 'custom@example.com', 'password': 'password123', 'role': 'admin', 'name': 'Test User 1'}
        """
        cls._counter += 1
        defaults = {
            "email": f"user{cls._counter}@example.com",
            "password": "password123",
            "role": "user",
            "name": f"Test User {cls._counter}",
        }
        return {**defaults, **overrides}

    @classmethod
    def reset_counter(cls) -> None:
        """Reset the email counter (useful for test isolation)."""
        cls._counter = 0


# Date helper functions


def get_date_offset(days: int = 0) -> date:
    """Get a date offset from today.

    Args:
        days: Number of days to offset (positive=future, negative=past)

    Returns:
        date: Date object offset from today

    Examples:
        >>> get_date_offset(0)   # Today
        >>> get_date_offset(1)   # Tomorrow
        >>> get_date_offset(-1)  # Yesterday
    """
    return date.today() + timedelta(days=days)


def get_tomorrow() -> date:
    """Get tomorrow's date.

    Returns:
        date: Tomorrow's date
    """
    return get_date_offset(1)


def get_yesterday() -> date:
    """Get yesterday's date.

    Returns:
        date: Yesterday's date
    """
    return get_date_offset(-1)


def get_today() -> date:
    """Get today's date.

    Returns:
        date: Today's date
    """
    return date.today()
