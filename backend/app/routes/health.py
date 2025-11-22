"""Health check route for monitoring application and database status."""

from __future__ import annotations

import logging
import os

from flask import Blueprint, jsonify
from sqlalchemy import text

from app.database import get_session

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    """
    Health check endpoint.

    Returns:
        JSON response with status, database connection status, and application version.
        - 200: Application is healthy
        - 503: Application is unhealthy (database connection failed)

    Response:
        {
            "status": "healthy",
            "database": "connected",
            "version": "v1.0.0"
        }
    """
    # Get version from environment variable, default to "unknown"
    version = os.environ.get("APP_VERSION", "unknown")

    try:
        # Check database connection
        with get_session() as session:
            session.execute(text("SELECT 1"))

        return jsonify({"status": "healthy", "database": "connected", "version": version}), 200

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "database": "disconnected", "version": version, "error": str(e)}), 503
