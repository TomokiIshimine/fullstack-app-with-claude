from __future__ import annotations

from flask import Flask, Response, jsonify

from .config import Config
from .routes import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.register_blueprint(api_bp)

    @app.get("/health")
    def health_check() -> Response:
        return jsonify(status="ok")

    return app


app = create_app()
