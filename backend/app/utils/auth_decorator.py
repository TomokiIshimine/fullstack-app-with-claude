"""Authentication decorator for protecting API endpoints."""

from __future__ import annotations

import logging
import os
from functools import wraps
from typing import Any, Callable, Literal

import jwt
from flask import g, request
from werkzeug.exceptions import Forbidden, Unauthorized

logger = logging.getLogger(__name__)


def require_auth(f: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator to require authentication for an endpoint.

    Extracts and validates JWT access token from cookies.
    Sets g.user_id and g.user_role with the authenticated user's information.

    Raises:
        Unauthorized: If authentication fails
    """

    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        # Get access token from cookies
        access_token = request.cookies.get("access_token")

        if not access_token:
            logger.warning("Access token not found in cookies")
            raise Unauthorized("認証が必要です")

        try:
            # Decode and validate token
            jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
            jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
            payload = jwt.decode(access_token, jwt_secret, algorithms=[jwt_algorithm])

            # Extract user_id from payload
            user_id = payload.get("user_id")
            if not user_id:
                logger.warning("user_id not found in token payload")
                raise Unauthorized("認証が必要です")

            # Extract role from payload (default to 'user' for backward compatibility)
            user_role = payload.get("role", "user")

            # Store user info in Flask's g object for use in the endpoint
            g.user_id = user_id
            g.user_role = user_role

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            logger.warning("Access token expired")
            raise Unauthorized("トークンの有効期限が切れています")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid access token: {e}")
            raise Unauthorized("認証が必要です")

    return decorated_function


def require_role(required_role: Literal["admin", "user"]) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Decorator to require a specific role for an endpoint.

    This decorator must be used together with @require_auth.
    It checks if the authenticated user has the required role.

    Args:
        required_role: The role required to access the endpoint ('admin' or 'user')

    Returns:
        Decorator function

    Raises:
        Unauthorized: If user is not authenticated
        Forbidden: If user doesn't have the required role

    Example:
        @todo_bp.get("/admin-only")
        @require_auth
        @require_role('admin')
        def admin_only_endpoint():
            return {"message": "Admin only"}
    """

    def decorator(f: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            # Check if user is authenticated (require_auth should have set g.user_role)
            if not hasattr(g, "user_role"):
                logger.warning("require_role called without require_auth - user_role not found in g")
                raise Unauthorized("認証が必要です")

            user_role = g.user_role

            # Check if user has required role
            if user_role != required_role:
                logger.warning(f"Access denied: user has role '{user_role}' but '{required_role}' is required (user_id={g.user_id})")
                raise Forbidden("このリソースにアクセスする権限がありません")

            return f(*args, **kwargs)

        return decorated_function

    return decorator


__all__ = ["require_auth", "require_role"]
