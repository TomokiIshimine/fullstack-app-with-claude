"""Rate limiting middleware using Flask-Limiter with Redis backend."""

from __future__ import annotations

import logging
import os

from flask import Flask, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import TooManyRequests

logger = logging.getLogger(__name__)

# Global limiter instance (initialized with dummy instance, replaced in init_limiter)
# This allows decorators to be applied at import time
limiter = Limiter(
    key_func=get_remote_address,
    enabled=False,  # Disabled by default, enabled in init_limiter
)


def get_redis_uri() -> str | None:
    """
    Construct Redis connection URI from environment variables.

    Returns:
        Redis URI string (redis://[:password@]host:port/db) or None if Redis is disabled
    """
    # Check if rate limiting is enabled
    rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    if not rate_limit_enabled:
        logger.info("Rate limiting is disabled (RATE_LIMIT_ENABLED=false)")
        return None

    # Get Redis connection details
    redis_host = os.getenv("REDIS_HOST")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_password = os.getenv("REDIS_PASSWORD")

    if not redis_host:
        logger.warning("REDIS_HOST not configured, rate limiting will be disabled")
        return None

    # Construct Redis URI
    if redis_password:
        # redis://[:password@]host:port/0
        uri = f"redis://:{redis_password}@{redis_host}:{redis_port}/0"
    else:
        # redis://host:port/0
        uri = f"redis://{redis_host}:{redis_port}/0"

    # Log connection (mask password)
    safe_uri = f"redis://{'***@' if redis_password else ''}{redis_host}:{redis_port}/0"
    logger.info(f"Configured Redis storage for rate limiting: {safe_uri}")

    return uri


def rate_limit_error_handler(e: TooManyRequests) -> tuple[dict, int]:
    """
    Custom error handler for rate limit exceeded (429) responses.

    Args:
        e: TooManyRequests exception

    Returns:
        JSON error response with 429 status code
    """
    logger.warning(f"Rate limit exceeded: {e.description}")
    return jsonify({"error": "リクエストが多すぎます。しばらく待ってから再試行してください。"}), 429


def init_limiter(app: Flask) -> Limiter:
    """
    Initialize Flask-Limiter with Redis backend.

    Args:
        app: Flask application instance

    Returns:
        Configured Limiter instance

    Note:
        If Redis is not configured or rate limiting is disabled,
        the limiter will remain disabled (allows all requests).
    """
    # Get Redis URI
    redis_uri = get_redis_uri()

    if redis_uri:
        # Configure limiter with Redis storage
        limiter.init_app(app)
        limiter._storage_uri = redis_uri
        limiter._storage_options = {"socket_connect_timeout": 30, "socket_timeout": 30}
        limiter._default_limits = ["200 per hour", "50 per minute"]
        limiter._swallow_errors = True
        limiter._headers_enabled = True
        limiter._strategy = "fixed-window"
        limiter._enabled = True  # Enable rate limiting
        logger.info("Rate limiter initialized with Redis backend")
    else:
        # Initialize with app but keep disabled
        limiter.init_app(app)
        limiter._enabled = False  # Keep disabled
        logger.warning("Rate limiter initialized in DISABLED mode (no Redis configured)")

    # Register custom error handler for 429 responses
    app.register_error_handler(429, rate_limit_error_handler)

    return limiter


__all__ = ["init_limiter", "limiter"]
