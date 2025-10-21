from __future__ import annotations

from flask import Blueprint, Response, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.get("/ping")
def ping() -> Response:
    return jsonify(message="pong")
