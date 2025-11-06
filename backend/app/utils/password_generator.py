"""Password generation utilities for user creation.

This module provides functions for generating secure random passwords
for initial user creation.
"""

from __future__ import annotations

import secrets
import string


def generate_initial_password(length: int = 12) -> str:
    """Generate a secure random password for initial user creation.

    The generated password contains:
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - Total length of specified characters (default: 12)

    The function uses the secrets module for cryptographically strong
    random number generation.

    Args:
        length: Password length in characters (default: 12)

    Returns:
        str: Generated password string

    Examples:
        >>> password = generate_initial_password()
        >>> len(password)
        12
        >>> password = generate_initial_password(16)
        >>> len(password)
        16

    Raises:
        ValueError: If length is less than 3 (cannot satisfy requirements)
    """
    if length < 3:
        raise ValueError("Password length must be at least 3 to include all required character types")

    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    all_characters = uppercase + lowercase + digits

    # Ensure at least one character from each required set
    password_chars = [
        secrets.choice(uppercase),  # At least one uppercase
        secrets.choice(lowercase),  # At least one lowercase
        secrets.choice(digits),  # At least one digit
    ]

    # Fill remaining length with random characters from all sets
    password_chars.extend(secrets.choice(all_characters) for _ in range(length - 3))

    # Shuffle to avoid predictable patterns (first 3 chars always upper, lower, digit)
    # Using secrets.SystemRandom for secure shuffling
    rng = secrets.SystemRandom()
    rng.shuffle(password_chars)

    return "".join(password_chars)


__all__ = ["generate_initial_password"]
