"""Admin user creation script.

This script creates an Admin user from environment variables at application startup.
It is called automatically by app/main.py during the app initialization.

Environment Variables:
    ADMIN_EMAIL: Email address for the admin user (required)
    ADMIN_PASSWORD_HASH: bcrypt hash of the admin password (preferred, for security)
    ADMIN_PASSWORD: Plain text password (fallback, will be hashed automatically)

Priority:
    1. ADMIN_PASSWORD_HASH (if set and valid) - Most secure
    2. ADMIN_PASSWORD (if set) - Automatically hashed with bcrypt
    3. None - Skip admin creation with warning

Behavior:
    - If environment variables are not set: Logs warning and skips creation
    - If ADMIN_PASSWORD_HASH is invalid format: Logs error and skips creation
    - If user with ADMIN_EMAIL doesn't exist: Creates new admin user
    - If user exists with role='user': Deletes user (CASCADE) and creates admin
    - If user exists with role='admin': Skips creation (admin already exists)
"""

from __future__ import annotations

import logging
import os

from app.database import session_scope
from app.models.user import User
from app.utils.password import hash_password
from app.utils.password_hash_validator import validate_bcrypt_hash

logger = logging.getLogger(__name__)


def create_admin_user() -> None:
    """Create Admin user from environment variables.

    This function should be called once at application startup.
    It reads ADMIN_EMAIL and ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) from environment variables
    and creates an admin user if it doesn't exist.

    The function is idempotent - it can be called multiple times safely.
    """
    # Skip in test environment
    flask_env = os.getenv("FLASK_ENV", "development")
    if flask_env == "testing":
        logger.info("Skipping admin user creation in test environment")
        return

    # Read environment variables
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password_hash = os.getenv("ADMIN_PASSWORD_HASH")
    admin_password = os.getenv("ADMIN_PASSWORD")

    # Check if email is set
    if not admin_email:
        logger.warning(
            "ADMIN_EMAIL environment variable not set. Skipping admin user creation. "
            "If you want to create an admin user, set ADMIN_EMAIL and either ADMIN_PASSWORD_HASH or ADMIN_PASSWORD."
        )
        return

    # Determine which password method to use
    if admin_password_hash:
        # Priority 1: Use ADMIN_PASSWORD_HASH (most secure)
        if not validate_bcrypt_hash(admin_password_hash):
            logger.error(
                f"Invalid ADMIN_PASSWORD_HASH format. Expected bcrypt hash (starts with $2a$/$2b$/$2y$), "
                f"but got: {admin_password_hash[:20]}... "
                f"Use 'poetry -C backend run python backend/scripts/generate_admin_hash.py' to generate a valid hash."
            )
            return
        logger.info("Using ADMIN_PASSWORD_HASH for admin user creation")
    elif admin_password:
        # Priority 2: Use ADMIN_PASSWORD (automatically hash it)
        logger.info("ADMIN_PASSWORD provided. Hashing password with bcrypt...")
        admin_password_hash = hash_password(admin_password)
        logger.info("Password hashed successfully")
    else:
        # No password provided
        logger.warning(
            "Neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set. Skipping admin user creation. "
            "Set either ADMIN_PASSWORD_HASH (recommended) or ADMIN_PASSWORD in environment variables."
        )
        return

    # Create or update admin user
    try:
        with session_scope() as session:
            # Check if user with this email already exists
            existing_user = session.query(User).filter_by(email=admin_email).first()

            if existing_user:
                if existing_user.role == "admin":
                    # Admin already exists, nothing to do
                    logger.info(f"Admin user already exists: {admin_email} (id={existing_user.id}). Skipping creation.")
                    return
                else:
                    # User exists with role='user', delete and recreate as admin
                    logger.info(
                        f"User with email {admin_email} exists with role='{existing_user.role}'. "
                        f"Deleting user (CASCADE) and creating admin user."
                    )
                    session.delete(existing_user)
                    session.flush()  # Ensure deletion completes before creating new user

            # Create new admin user
            admin_user = User(
                email=admin_email,
                password_hash=admin_password_hash,
                role="admin",
                name="Administrator",
            )
            session.add(admin_user)
            session.commit()

            logger.info(f"Admin user created successfully: {admin_email} (id={admin_user.id})")

    except Exception as e:
        logger.error(f"Failed to create admin user: {e}", exc_info=True)
        raise


__all__ = ["create_admin_user"]
