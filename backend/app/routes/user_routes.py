"""User management routes for admin operations."""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify

from app.routes.dependencies import validate_request_body, with_user_service
from app.schemas.user import UserCreateRequest, UserListResponse, UserUpdateRequest, UserUpdateResponse
from app.services.user_service import UserService
from app.utils.auth_decorator import require_auth, require_role

logger = logging.getLogger(__name__)

user_bp = Blueprint("users", __name__, url_prefix="/users")


@user_bp.get("")
@require_auth
@require_role("admin")
@with_user_service
def list_users(*, user_service: UserService):
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
    logger.info("GET /api/users - Retrieving all users")

    users = user_service.list_users()

    response = UserListResponse(users=users)
    logger.info(f"GET /api/users - Retrieved {len(users)} users successfully")
    return jsonify(response.model_dump()), 200


@user_bp.post("")
@require_auth
@require_role("admin")
@with_user_service
@validate_request_body(UserCreateRequest)
def create_user(*, data: UserCreateRequest, user_service: UserService):
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
    logger.info("POST /api/users - Creating new user")

    result = user_service.create_user(email=data.email, name=data.name)

    logger.info(f"POST /api/users - User created successfully: {data.email} (id={result.user.id})")
    return jsonify(result.model_dump()), 201


@user_bp.patch("/me")
@require_auth
@with_user_service
@validate_request_body(UserUpdateRequest)
def update_current_user(*, data: UserUpdateRequest, user_service: UserService):
    """
    Update current user's profile information.

    Request body:
        {
            "email": "new@example.com",
            "name": "New Name"
        }

    Returns:
        {
            "message": "プロフィールを更新しました",
            "user": {
                "id": 1,
                "email": "new@example.com",
                "name": "New Name",
                "role": "user"
            }
        }
    """
    user_id = g.user_id
    logger.info(f"PATCH /api/users/me - Updating profile for user_id={user_id}")

    updated_user = user_service.update_user_profile(user_id=user_id, email=data.email, name=data.name)

    response = UserUpdateResponse(message="プロフィールを更新しました", user=updated_user)
    logger.info(
        "PATCH /api/users/me - Profile updated successfully",
        extra={"user_id": user_id, "email": data.email},
    )
    return jsonify(response.model_dump()), 200


@user_bp.delete("/<int:user_id>")
@require_auth
@require_role("admin")
@with_user_service
def delete_user(user_id: int, *, user_service: UserService):
    """
    Delete a user endpoint (Admin only).

    Args:
        user_id: ID of user to delete

    Returns:
        204 No Content on success
    """
    logger.info(f"DELETE /api/users/{user_id} - Deleting user")

    user_service.delete_user(user_id)

    logger.info(f"DELETE /api/users/{user_id} - User deleted successfully")
    return "", 204


__all__ = ["user_bp"]
