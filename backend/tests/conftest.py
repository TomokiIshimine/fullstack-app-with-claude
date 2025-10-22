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
    Config.refresh()

    app = create_app()
    app.config.update(TESTING=True)

    with app.app_context():
        Base.metadata.create_all(get_engine())

    yield app

    with app.app_context():
        Base.metadata.drop_all(get_engine())


@pytest.fixture()
def client(app: Flask):
    return app.test_client()
