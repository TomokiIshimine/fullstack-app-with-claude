"""Password hash validation utilities.

This module provides functions for validating bcrypt password hash formats.
"""

from __future__ import annotations

import re


def validate_bcrypt_hash(hash_string: str) -> bool:
    """Validate if a string is a valid bcrypt hash format.

    bcrypt hashes have the following format:
    - Start with $2a$, $2b$, or $2y$ (bcrypt version identifier)
    - Followed by cost factor (typically 10-12, two digits)
    - Followed by $ separator
    - Followed by 53 characters (22-char salt + 31-char hash in base64)
    - Total length is typically 60 characters

    Args:
        hash_string: The hash string to validate

    Returns:
        bool: True if valid bcrypt hash format, False otherwise

    Examples:
        >>> validate_bcrypt_hash("$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpCCaa70.MYW")
        True
        >>> validate_bcrypt_hash("invalid_hash")
        False
        >>> validate_bcrypt_hash("plaintext_password")
        False
    """
    if not hash_string:
        return False

    # bcrypt hash pattern:
    # - Version: $2a$, $2b$, or $2y$
    # - Cost: 2 digits (04-31)
    # - Salt + Hash: 53 characters in base64-like encoding
    bcrypt_pattern = r"^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$"

    return bool(re.match(bcrypt_pattern, hash_string))


__all__ = ["validate_bcrypt_hash"]
