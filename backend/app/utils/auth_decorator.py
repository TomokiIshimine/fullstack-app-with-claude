"""Authentication decorator for protecting API endpoints."""

from __future__ import annotations

import logging
import os
from functools import wraps
from typing import Any, Callable

import jwt
from flask import g, request
from werkzeug.exceptions import Unauthorized

logger = logging.getLogger(__name__)


def require_auth(f: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator to require authentication for an endpoint.

    Extracts and validates JWT access token from cookies.
    Sets g.user_id with the authenticated user's ID.

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

            # Store user_id in Flask's g object for use in the endpoint
            g.user_id = user_id

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            logger.warning("Access token expired")
            raise Unauthorized("トークンの有効期限が切れています")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid access token: {e}")
            raise Unauthorized("認証が必要です")

    return decorated_function


__all__ = ["require_auth"]
