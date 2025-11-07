"""Password management routes for changing passwords."""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from app.database import get_session
from app.schemas.password import PasswordChangeRequest, PasswordChangeResponse, PasswordValidationError
from app.services.password_service import PasswordService
from app.utils.auth_decorator import require_auth

logger = logging.getLogger(__name__)

password_bp = Blueprint("password", __name__, url_prefix="/password")


@password_bp.post("/change")
@require_auth
def change_password():
    """
    Change password endpoint (all authenticated users).

    Request body:
        {
            "current_password": "oldpassword123",
            "new_password": "newpassword123"
        }

    Returns:
        {
            "message": "パスワードを変更しました"
        }
    """
    logger.info("POST /api/password/change - Changing password")

    # Get user ID from Flask g (set by @require_auth)
    user_id = g.user_id

    # Parse and validate request
    payload = request.get_json()
    if not payload:
        logger.warning("POST /api/password/change - Request body is required")
        return jsonify({"error": "Request body is required"}), 400

    try:
        data = PasswordChangeRequest.model_validate(payload)
    except ValidationError as e:
        logger.warning(f"POST /api/password/change - Validation error: {e}")
        # Extract error messages from Pydantic validation errors
        errors = [{"field": err["loc"][0] if err["loc"] else "unknown", "message": err["msg"]} for err in e.errors()]
        return jsonify({"error": "Validation error", "details": errors}), 400
    except PasswordValidationError as e:
        logger.warning(f"POST /api/password/change - Validation error: {e}")
        return jsonify({"error": str(e)}), 400

    # Change password
    session = get_session()
    password_service = PasswordService(session)
    password_service.change_password(
        user_id=user_id,
        current_password=data.current_password,
        new_password=data.new_password,
    )

    response = PasswordChangeResponse(message="パスワードを変更しました")
    logger.info(f"POST /api/password/change - Password changed successfully for user_id={user_id}")
    return jsonify(response.model_dump()), 200


__all__ = ["password_bp"]
