from __future__ import annotations

import pytest
from flask import Flask

from app.config import Config
from app.main import create_app, get_engine
from app.models import Base


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch, tmp_path):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    # Set testing environment to avoid file logging issues
    monkeypatch.setenv("FLASK_ENV", "testing")
    Config.refresh()

    app = create_app()
    app.config.update(TESTING=True)

    with app.app_context():
        Base.metadata.create_all(get_engine())

    yield app

    # Clean up logger handlers to avoid resource warnings
    for handler in app.logger.handlers[:]:
        handler.close()
        app.logger.removeHandler(handler)

    with app.app_context():
        Base.metadata.drop_all(get_engine())


@pytest.fixture()
def client(app: Flask):
    return app.test_client()


@pytest.fixture()
def test_user(app: Flask):
    """Create a test user for authenticated operations."""
    from app.database import get_session
    from app.models.user import User
    from app.utils.password import hash_password

    with app.app_context():
        session = get_session()
        user = User(email="test@example.com", password_hash=hash_password("password123"))
        session.add(user)
        session.commit()
        user_id = user.id
        session.expunge(user)

    return user_id


@pytest.fixture()
def auth_client(app: Flask, test_user):
    """Create a test client with authentication cookies."""
    import os
    from datetime import datetime, timedelta, timezone

    import jwt

    with app.app_context():
        # Create JWT access token for test user
        jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
        jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

        now = datetime.now(timezone.utc)
        payload = {
            "user_id": test_user,
            "exp": now + timedelta(hours=1),
            "iat": now,
        }
        access_token = jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)

        # Create client and set cookie
        client = app.test_client()
        client.set_cookie("access_token", access_token)

        return client
