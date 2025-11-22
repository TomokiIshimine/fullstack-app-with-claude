"""Test data factories for backend tests.

This module provides factory classes and functions for generating test data
with sensible defaults and easy customization.
"""

from __future__ import annotations

from typing import Any


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
