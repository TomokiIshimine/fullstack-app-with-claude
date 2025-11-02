"""Health check route for monitoring application and database status."""

from __future__ import annotations

import logging

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
        JSON response with status and database connection status.
        - 200: Application is healthy
        - 503: Application is unhealthy (database connection failed)

    Response:
        {
            "status": "healthy",
            "database": "connected"
        }
    """
    try:
        # Check database connection
        with get_session() as session:
            session.execute(text("SELECT 1"))

        return jsonify({"status": "healthy", "database": "connected"}), 200

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "database": "disconnected", "error": str(e)}), 503
