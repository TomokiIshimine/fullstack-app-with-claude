from __future__ import annotations

import pytest
from flask import Flask

from app.main import create_app


@pytest.fixture()
def app() -> Flask:
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture()
def client(app: Flask):
    return app.test_client()
