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
