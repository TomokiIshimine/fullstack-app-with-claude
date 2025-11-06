#!/usr/bin/env python3
"""Helper script to generate bcrypt password hash for Admin user.

This script prompts for a password and outputs a bcrypt hash
that can be used in the ADMIN_PASSWORD_HASH environment variable.

Usage:
    poetry -C backend run python backend/scripts/generate_admin_hash.py

Example:
    $ poetry -C backend run python backend/scripts/generate_admin_hash.py
    Enter password for Admin user: ********

    Generated bcrypt hash:
    $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpCCaa70.MYW

    Add this to your backend/.env file:
    ADMIN_PASSWORD_HASH=$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpCCaa70.MYW
"""

from __future__ import annotations

import getpass
import sys

import bcrypt


def generate_hash(password: str) -> str:
    """Generate bcrypt hash from password.

    Args:
        password: Plain text password

    Returns:
        str: bcrypt hash string
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def main() -> None:
    """Main function to prompt for password and generate hash."""
    print("Admin Password Hash Generator")
    print("=" * 50)
    print()

    # Get password from user (hidden input)
    try:
        password = getpass.getpass("Enter password for Admin user: ")
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(0)

    # Validate password
    if not password:
        print("Error: Password cannot be empty", file=sys.stderr)
        sys.exit(1)

    if len(password) < 8:
        print("Warning: Password is less than 8 characters. Consider using a stronger password.")

    # Generate hash
    print("\nGenerating bcrypt hash...")
    password_hash = generate_hash(password)

    # Output results
    print()
    print("Generated bcrypt hash:")
    print(password_hash)
    print()
    print("Add this to your backend/.env file:")
    print(f"ADMIN_PASSWORD_HASH={password_hash}")
    print()


if __name__ == "__main__":
    main()
