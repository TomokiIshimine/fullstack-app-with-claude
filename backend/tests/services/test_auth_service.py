"""Tests for AuthService (authentication business logic)."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.services.auth_service import AuthService


@pytest.fixture
def auth_service(app):
    """Create AuthService instance with test database session."""
    from app.database import get_session

    with app.app_context():
        session = get_session()
        return AuthService(session)


# Login Tests


def test_login_success(app, test_user, auth_service):
    """Test successful login with valid credentials."""
    response_data, access_token, refresh_token = auth_service.login("test@example.com", "password123")

    # Verify response structure
    assert response_data.user.id == test_user
    assert response_data.user.email == "test@example.com"
    assert response_data.user.role == "user"
    assert response_data.user.name == "Test User"

    # Verify tokens are returned
    assert access_token is not None
    assert refresh_token is not None
    assert isinstance(access_token, str)
    assert isinstance(refresh_token, str)


def test_login_stores_refresh_token_in_database(app, test_user, auth_service):
    """Test that login stores refresh token in database."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Verify token is in database
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        token_record = repo.find_by_token(refresh_token)

        assert token_record is not None
        assert token_record.user_id == test_user
        assert token_record.is_revoked is False


def test_login_generates_valid_jwt_access_token(app, test_user, auth_service):
    """Test that login generates a valid JWT access token."""
    _, access_token, _ = auth_service.login("test@example.com", "password123")

    # Decode and verify token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    payload = jwt.decode(access_token, jwt_secret, algorithms=[jwt_algorithm])

    assert payload["user_id"] == test_user
    assert payload["email"] == "test@example.com"
    assert payload["role"] == "user"
    assert "exp" in payload


def test_login_user_not_found(auth_service):
    """Test login fails when user doesn't exist."""
    with pytest.raises(ValueError, match="メールアドレスまたはパスワードが間違っています"):
        auth_service.login("nonexistent@example.com", "password123")


def test_login_invalid_password(app, test_user, auth_service):
    """Test login fails with incorrect password."""
    with pytest.raises(ValueError, match="メールアドレスまたはパスワードが間違っています"):
        auth_service.login("test@example.com", "wrongpassword")


def test_login_empty_email(auth_service):
    """Test login fails with empty email."""
    with pytest.raises(ValueError):
        auth_service.login("", "password123")


def test_login_empty_password(app, test_user, auth_service):
    """Test login fails with empty password."""
    with pytest.raises(ValueError):
        auth_service.login("test@example.com", "")


# Refresh Token Tests


def test_refresh_access_token_success(app, test_user, auth_service):
    """Test successful access token refresh with valid refresh token."""
    # First login to get refresh token
    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Refresh the token
    new_access_token, new_refresh_token, user = auth_service.refresh_access_token(refresh_token)

    assert new_access_token is not None
    assert new_refresh_token is not None
    assert user.id == test_user
    assert user.email == "test@example.com"
    assert user.role == "user"
    assert user.name == "Test User"

    # Verify tokens are different from original
    assert new_refresh_token != refresh_token


def test_refresh_access_token_revokes_old_token(app, test_user, auth_service):
    """Test that refresh revokes the old refresh token."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    # Login to get initial refresh token
    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Refresh to get new token
    _, new_refresh_token, _ = auth_service.refresh_access_token(refresh_token)

    # Verify old token is revoked
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        old_token_record = repo.find_by_token(refresh_token)

        assert old_token_record.is_revoked is True

        # Verify new token is not revoked
        new_token_record = repo.find_by_token(new_refresh_token)
        assert new_token_record.is_revoked is False


def test_refresh_access_token_invalid_jwt(auth_service):
    """Test refresh fails with invalid JWT format."""
    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token("invalid_jwt_token")


def test_refresh_access_token_expired(app, test_user, auth_service):
    """Test refresh fails with expired JWT token."""
    # Create an expired token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expired_time = datetime.now(timezone.utc) - timedelta(days=1)
    payload = {"user_id": test_user, "jti": "expired-jti", "exp": expired_time}
    expired_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token(expired_token)


def test_refresh_access_token_not_in_database(app, test_user, auth_service):
    """Test refresh fails when token is valid JWT but not in database."""
    # Create a valid JWT that's not stored in database
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"user_id": test_user, "jti": "not-in-db", "exp": expires_at}
    token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token(token)


def test_refresh_access_token_revoked(app, test_user, auth_service):
    """Test refresh fails with revoked token."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    # Login to get a token
    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Manually revoke the token
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        repo.revoke(refresh_token)
        session.commit()

    # Try to use the revoked token
    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token(refresh_token)


def test_refresh_access_token_user_not_found(app, auth_service):
    """Test refresh fails when user associated with token doesn't exist."""
    # Create a token for a non-existent user
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"user_id": 99999, "jti": "nonexistent-user", "exp": expires_at}
    token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    # Store token in database
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        repo.create(token=token, user_id=99999, expires_at=expires_at)
        session.commit()

    # Try to refresh with token for non-existent user
    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token(token)


def test_refresh_access_token_missing_user_id(auth_service):
    """Test refresh fails when token doesn't contain user_id."""
    # Create a token without user_id
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"jti": "no-user-id", "exp": expires_at}  # Missing user_id
    token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

    with pytest.raises(ValueError, match="Invalid refresh token"):
        auth_service.refresh_access_token(token)


# Logout Tests


def test_logout_success(app, test_user, auth_service):
    """Test successful logout revokes refresh token."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    # Login to get refresh token
    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Logout
    auth_service.logout(refresh_token)

    # Verify token is revoked
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        token_record = repo.find_by_token(refresh_token)

        assert token_record.is_revoked is True


def test_logout_with_nonexistent_token(auth_service):
    """Test logout with token that doesn't exist (should not raise error)."""
    # This should not raise an error, just do nothing
    auth_service.logout("nonexistent_token")


# Token Generation Tests


def test_generate_access_token_contains_user_info(app, test_user, auth_service):
    """Test that generated access token contains user information."""
    token = auth_service._generate_access_token(test_user, "test@example.com", "user")

    # Decode token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])

    assert payload["user_id"] == test_user
    assert payload["email"] == "test@example.com"
    assert payload["role"] == "user"
    assert "exp" in payload


def test_generate_refresh_token_contains_jti(app, test_user, auth_service):
    """Test that generated refresh token contains unique JTI."""
    token1 = auth_service._generate_refresh_token(test_user)
    token2 = auth_service._generate_refresh_token(test_user)

    # Decode tokens
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    payload1 = jwt.decode(token1, jwt_secret, algorithms=[jwt_algorithm])
    payload2 = jwt.decode(token2, jwt_secret, algorithms=[jwt_algorithm])

    # Verify each token has a unique JTI
    assert "jti" in payload1
    assert "jti" in payload2
    assert payload1["jti"] != payload2["jti"]
    assert payload1["user_id"] == test_user
    assert payload2["user_id"] == test_user


def test_access_token_expiration(app, test_user, auth_service):
    """Test that access token has correct expiration time."""
    token = auth_service._generate_access_token(test_user, "test@example.com", "user")

    # Decode token
    jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
    exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    # Verify expiration is approximately correct (within 1 minute tolerance)
    expected_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    expected_exp = datetime.now(timezone.utc) + timedelta(minutes=expected_expire_minutes)

    time_diff = abs((exp_time - expected_exp).total_seconds())
    assert time_diff < 60, f"Expiration time difference too large: {time_diff} seconds"


# Integration Tests


def test_full_token_lifecycle(app, test_user, auth_service):
    """Test complete token lifecycle: login -> refresh -> logout."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    # Step 1: Login
    response_data, access_token_1, refresh_token_1 = auth_service.login("test@example.com", "password123")
    assert response_data.user.id == test_user
    assert response_data.user.role == "user"
    assert response_data.user.name == "Test User"

    # Step 2: Refresh token
    access_token_2, refresh_token_2, user = auth_service.refresh_access_token(refresh_token_1)
    assert user.id == test_user
    assert user.role == "user"
    assert user.name == "Test User"
    assert refresh_token_2 != refresh_token_1

    # Verify old token is revoked, new token is active
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)

        old_token = repo.find_by_token(refresh_token_1)
        assert old_token.is_revoked is True

        new_token = repo.find_by_token(refresh_token_2)
        assert new_token.is_revoked is False

    # Step 3: Logout
    auth_service.logout(refresh_token_2)

    # Verify new token is revoked
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)
        token = repo.find_by_token(refresh_token_2)
        assert token.is_revoked is True


def test_multiple_concurrent_sessions(app, test_user, auth_service):
    """Test that multiple login sessions can coexist."""
    from app.database import get_session
    from app.repositories.refresh_token_repository import RefreshTokenRepository

    # Create multiple sessions
    _, _, token1 = auth_service.login("test@example.com", "password123")
    _, _, token2 = auth_service.login("test@example.com", "password123")
    _, _, token3 = auth_service.login("test@example.com", "password123")

    # All tokens should be active
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)

        assert repo.find_by_token(token1).is_revoked is False
        assert repo.find_by_token(token2).is_revoked is False
        assert repo.find_by_token(token3).is_revoked is False

    # Logout from one session
    auth_service.logout(token2)

    # Only token2 should be revoked
    with app.app_context():
        session = get_session()
        repo = RefreshTokenRepository(session)

        assert repo.find_by_token(token1).is_revoked is False
        assert repo.find_by_token(token2).is_revoked is True
        assert repo.find_by_token(token3).is_revoked is False


def test_token_refresh_prevents_replay_attack(app, test_user, auth_service):
    """Test that old refresh token cannot be reused after refresh (prevents replay attacks)."""
    # Login
    _, _, refresh_token = auth_service.login("test@example.com", "password123")

    # Refresh token (this revokes the old one)
    _, new_refresh_token, _ = auth_service.refresh_access_token(refresh_token)

    # Try to use the old token again (should fail)
    with pytest.raises(ValueError, match="リフレッシュトークンが無効です"):
        auth_service.refresh_access_token(refresh_token)

    # New token should still work
    _, _, _ = auth_service.refresh_access_token(new_refresh_token)
