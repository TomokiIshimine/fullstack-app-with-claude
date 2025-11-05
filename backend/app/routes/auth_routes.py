"""Authentication routes for login, logout, and token refresh."""

from __future__ import annotations

import logging
import os

from flask import Blueprint, jsonify, make_response, request
from pydantic import ValidationError
from werkzeug.exceptions import Unauthorized

from app.database import get_session
from app.limiter import limiter
from app.schemas.auth import LoginRequest, LogoutResponse, RefreshTokenResponse
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.post("/login")
@limiter.limit("10 per minute")  # Rate limit: 10 login attempts per minute per IP
def login():
    """
    Login endpoint.

    Request body:
        {
            "email": "user@example.com",
            "password": "password123"
        }

    Returns:
        {
            "user": {
                "id": 1,
                "email": "user@example.com"
            }
        }

    Sets httpOnly cookies:
        - access_token: JWT access token (expires in 1 day)
        - refresh_token: JWT refresh token (expires in 7 days)
    """
    try:
        # Parse and validate request
        payload = request.get_json()
        if not payload:
            raise ValueError("Request body is required")

        data = LoginRequest.model_validate(payload)

        # Perform login
        session = get_session()
        auth_service = AuthService(session)
        response_data, access_token, refresh_token = auth_service.login(data.email, data.password)

        # Create response
        response = make_response(jsonify(response_data.model_dump()), 200)

        # Set cookies
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        cookie_domain = os.getenv("COOKIE_DOMAIN", None)

        access_token_max_age = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) * 60  # Convert to seconds
        refresh_token_max_age = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")) * 24 * 60 * 60  # Convert to seconds

        response.set_cookie(
            "access_token",
            value=access_token,
            max_age=access_token_max_age,
            httponly=True,
            secure=cookie_secure,
            samesite="Lax",
            path="/api",
            domain=cookie_domain,
        )

        response.set_cookie(
            "refresh_token",
            value=refresh_token,
            max_age=refresh_token_max_age,
            httponly=True,
            secure=cookie_secure,
            samesite="Lax",
            path="/api",
            domain=cookie_domain,
        )

        logger.info(f"Login successful: {data.email}")
        return response

    except ValidationError as e:
        logger.warning(f"Validation error during login: {e}")
        error_messages = []
        for error in e.errors():
            field = error["loc"][0] if error["loc"] else "unknown"
            message = error["msg"]
            error_messages.append(f"{field}: {message}")
        return jsonify({"error": "; ".join(error_messages)}), 400
    except ValueError as e:
        logger.warning(f"Login error: {e}")
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}", exc_info=True)
        return jsonify({"error": "ログインに失敗しました"}), 500


@auth_bp.post("/refresh")
@limiter.limit("30 per minute")  # Rate limit: 30 token refreshes per minute per IP
def refresh():
    """
    Refresh access token endpoint.

    Reads refresh_token from cookies and generates new tokens.

    Returns:
        {
            "message": "トークンを更新しました",
            "user": {
                "id": 1,
                "email": "user@example.com"
            }
        }

    Sets httpOnly cookies:
        - access_token: New JWT access token
        - refresh_token: New JWT refresh token
    """
    try:
        # Get refresh token from cookies
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            logger.warning("Refresh token not found in cookies")
            raise Unauthorized("リフレッシュトークンが必要です")

        # Refresh tokens
        session = get_session()
        auth_service = AuthService(session)
        new_access_token, new_refresh_token, user = auth_service.refresh_access_token(refresh_token)

        # Create response with user information
        from app.schemas.auth import UserResponse

        user_response = UserResponse.model_validate(user, from_attributes=True)
        response_data = RefreshTokenResponse(message="トークンを更新しました", user=user_response)
        response = make_response(jsonify(response_data.model_dump()), 200)

        # Set cookies
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        cookie_domain = os.getenv("COOKIE_DOMAIN", None)

        access_token_max_age = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) * 60
        refresh_token_max_age = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")) * 24 * 60 * 60

        response.set_cookie(
            "access_token",
            value=new_access_token,
            max_age=access_token_max_age,
            httponly=True,
            secure=cookie_secure,
            samesite="Lax",
            path="/api",
            domain=cookie_domain,
        )

        response.set_cookie(
            "refresh_token",
            value=new_refresh_token,
            max_age=refresh_token_max_age,
            httponly=True,
            secure=cookie_secure,
            samesite="Lax",
            path="/api",
            domain=cookie_domain,
        )

        logger.info("Token refresh successful")
        return response

    except ValueError as e:
        logger.warning(f"Token refresh error: {e}")
        return jsonify({"error": str(e)}), 401
    except Unauthorized as e:
        logger.warning(f"Token refresh unauthorized: {e}")
        return jsonify({"error": str(e.description)}), 401
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {e}", exc_info=True)
        return jsonify({"error": "トークンの更新に失敗しました"}), 500


@auth_bp.post("/logout")
@limiter.limit("20 per minute")  # Rate limit: 20 logout requests per minute per IP
def logout():
    """
    Logout endpoint.

    Revokes refresh token and clears cookies.

    Returns:
        {
            "message": "ログアウトしました"
        }

    Clears cookies:
        - access_token
        - refresh_token
    """
    try:
        # Get refresh token from cookies
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            # Revoke refresh token
            session = get_session()
            auth_service = AuthService(session)
            auth_service.logout(refresh_token)

        # Create response
        response_data = LogoutResponse(message="ログアウトしました")
        response = make_response(jsonify(response_data.model_dump()), 200)

        # Clear cookies by setting max_age=0
        cookie_domain = os.getenv("COOKIE_DOMAIN", None)

        response.set_cookie("access_token", value="", max_age=0, httponly=True, samesite="Lax", path="/api", domain=cookie_domain)

        response.set_cookie("refresh_token", value="", max_age=0, httponly=True, samesite="Lax", path="/api", domain=cookie_domain)

        logger.info("Logout successful")
        return response

    except Exception as e:
        logger.error(f"Unexpected error during logout: {e}", exc_info=True)
        return jsonify({"error": "ログアウトに失敗しました"}), 500


__all__ = ["auth_bp"]
