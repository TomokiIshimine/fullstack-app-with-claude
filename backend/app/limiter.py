"""Rate limiting middleware using Flask-Limiter with Redis backend."""

from __future__ import annotations

import logging
import os

from flask import Flask, Response, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import TooManyRequests

logger = logging.getLogger(__name__)


def get_limiter_storage_uri() -> str:
    """
    Get storage URI for Flask-Limiter at module load time.

    Returns:
        Redis URI if configured and enabled, otherwise "memory://" for in-memory storage

    Note:
        This function is called at module import time, before Flask app initialization.
        It reads directly from environment variables.
    """
    # Check if rate limiting is enabled
    rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    if not rate_limit_enabled:
        logger.info("Rate limiting is disabled (RATE_LIMIT_ENABLED=false), using memory storage")
        return "memory://"

    # Get Redis connection details
    redis_host = os.getenv("REDIS_HOST")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_password = os.getenv("REDIS_PASSWORD")

    if not redis_host:
        logger.warning("REDIS_HOST not configured, using memory storage for rate limiting")
        return "memory://"

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


# Global limiter instance with proper storage configuration
# Storage URI is determined at module load time from environment variables
limiter = Limiter(
    key_func=get_remote_address,  # Use client IP as rate limit key
    storage_uri=get_limiter_storage_uri(),  # Redis or memory storage
    storage_options={"socket_connect_timeout": 30, "socket_timeout": 30},
    # Default limits (can be overridden per route)
    default_limits=["200 per hour", "50 per minute"],
    # Swallow errors (don't fail requests if Redis is down)
    swallow_errors=True,
    # Headers in response
    headers_enabled=True,
    # Strategy: fixed-window (simple and performant)
    strategy="fixed-window",
)


def rate_limit_error_handler(e: TooManyRequests) -> tuple[Response, int]:
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
    Initialize Flask-Limiter with Flask application.

    Args:
        app: Flask application instance

    Returns:
        Configured Limiter instance

    Note:
        The limiter is already configured with storage URI at module load time.
        This function binds the limiter to the Flask app and registers error handlers.
    """
    # Bind limiter to Flask app
    limiter.init_app(app)

    # Register custom error handler for 429 responses
    app.register_error_handler(429, rate_limit_error_handler)

    # Log the storage backend being used
    if limiter._storage and hasattr(limiter._storage, "storage_uri"):
        storage_uri = limiter._storage.storage_uri
        if "redis" in str(storage_uri):
            logger.info("Rate limiter initialized with Redis backend")
        else:
            logger.info("Rate limiter initialized with in-memory backend")
    else:
        logger.info("Rate limiter initialized with in-memory backend")

    return limiter


__all__ = ["init_limiter", "limiter"]
