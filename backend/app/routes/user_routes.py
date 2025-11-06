"""User management routes for admin operations."""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.database import get_session
from app.schemas.user import UserCreateRequest, UserListResponse, UserValidationError
from app.services.user_service import UserService
from app.utils.auth_decorator import require_auth, require_role

logger = logging.getLogger(__name__)

user_bp = Blueprint("users", __name__, url_prefix="/users")


@user_bp.get("")
@require_auth
@require_role("admin")
def list_users():
    """
    List all users endpoint (Admin only).

    Returns:
        {
            "users": [
                {
                    "id": 1,
                    "email": "admin@example.com",
                    "name": "Administrator",
                    "role": "admin",
                    "created_at": "2025-10-01T10:00:00Z"
                },
                ...
            ]
        }
    """
    try:
        logger.info("GET /api/users - Retrieving all users")

        session = get_session()
        user_service = UserService(session)
        users = user_service.list_users()

        response = UserListResponse(users=users)
        logger.info(f"GET /api/users - Retrieved {len(users)} users successfully")
        return jsonify(response.model_dump()), 200

    except Exception as e:
        logger.error(f"GET /api/users - Unexpected error: {e}", exc_info=True)
        return jsonify({"error": "Failed to retrieve users"}), 500


@user_bp.post("")
@require_auth
@require_role("admin")
def create_user():
    """
    Create a new user endpoint (Admin only).

    Request body:
        {
            "email": "newuser@example.com",
            "name": "New User"
        }

    Returns:
        {
            "user": {
                "id": 3,
                "email": "newuser@example.com",
                "name": "New User",
                "role": "user",
                "created_at": "2025-11-06T12:00:00Z"
            },
            "initial_password": "aB3xY9mK2pL5"
        }
    """
    try:
        logger.info("POST /api/users - Creating new user")

        # Parse and validate request
        payload = request.get_json()
        if not payload:
            logger.warning("POST /api/users - Request body is required")
            return jsonify({"error": "Request body is required"}), 400

        try:
            data = UserCreateRequest.model_validate(payload)
        except ValidationError as e:
            logger.warning(f"POST /api/users - Validation error: {e}")
            # Extract error messages from Pydantic validation errors
            errors = [{"field": err["loc"][0] if err["loc"] else "unknown", "message": err["msg"]} for err in e.errors()]
            return jsonify({"error": "Validation error", "details": errors}), 400
        except UserValidationError as e:
            logger.warning(f"POST /api/users - Validation error: {e}")
            return jsonify({"error": str(e)}), 400

        # Create user
        session = get_session()
        user_service = UserService(session)
        result = user_service.create_user(email=data.email, name=data.name)

        logger.info(f"POST /api/users - User created successfully: {data.email} (id={result.user.id})")
        return jsonify(result.model_dump()), 201

    except Exception as e:
        # Let Flask handle HTTPException (including custom service errors)
        from werkzeug.exceptions import HTTPException

        if isinstance(e, HTTPException):
            raise
        logger.error(f"POST /api/users - Unexpected error: {e}", exc_info=True)
        return jsonify({"error": "Failed to create user"}), 500


@user_bp.delete("/<int:user_id>")
@require_auth
@require_role("admin")
def delete_user(user_id: int):
    """
    Delete a user endpoint (Admin only).

    Args:
        user_id: ID of user to delete

    Returns:
        204 No Content on success
    """
    try:
        logger.info(f"DELETE /api/users/{user_id} - Deleting user")

        session = get_session()
        user_service = UserService(session)
        user_service.delete_user(user_id)

        logger.info(f"DELETE /api/users/{user_id} - User deleted successfully")
        return "", 204

    except Exception as e:
        # Let Flask handle HTTPException (including custom service errors)
        from werkzeug.exceptions import HTTPException

        if isinstance(e, HTTPException):
            raise
        logger.error(f"DELETE /api/users/{user_id} - Unexpected error: {e}", exc_info=True)
        return jsonify({"error": "Failed to delete user"}), 500


__all__ = ["user_bp"]
