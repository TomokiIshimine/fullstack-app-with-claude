from __future__ import annotations

from flask import Blueprint

from .auth_routes import auth_bp
from .todo_routes import todo_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")
api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(todo_bp)

__all__ = ["api_bp"]
